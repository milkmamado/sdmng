-- ============================================================================
-- 진단명·이전병원 자동 분류 기반 스키마 (기록용, 전부 멱등)
-- 사용자가 DB에 직접 적용한 DDL을 repo에 기록합니다.
-- 옵션 데이터 INSERT는 포함하지 않습니다.
-- ============================================================================

-- 1. patients 자동 분류 메타 컬럼
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS diagnosis_raw text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS diagnosis_source text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS diagnosis_needs_review boolean DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS hospital_raw text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS hospital_source text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS hospital_needs_review boolean DEFAULT false;

-- 2. 옵션 테이블 별칭·정렬 컬럼
ALTER TABLE public.diagnosis_options ADD COLUMN IF NOT EXISTS aliases text[];
ALTER TABLE public.hospital_options ADD COLUMN IF NOT EXISTS aliases text[];
ALTER TABLE public.hospital_options ADD COLUMN IF NOT EXISTS sort_order integer;

-- 3. 별칭 매칭 함수 (현재 DB 정의 그대로)
CREATE OR REPLACE FUNCTION public.match_option_by_alias(p_raw text, p_kind text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with opt as (
    select id, name, parent_id, aliases from diagnosis_options where p_kind = 'diagnosis'
    union all
    select id, name, parent_id, aliases from hospital_options where p_kind = 'hospital'
  ),
  src as (select regexp_replace(lower(p_raw), '\s', '', 'g') n where p_raw is not null),
  al as (
    select o.id, o.name, o.parent_id, regexp_replace(lower(a), '\s', '', 'g') a
    from opt o,
         unnest(case when o.parent_id is null then array_append(o.aliases, o.name) else o.aliases end) a
  ),
  m as (select al.* from al, src where length(al.a) > 0 and position(al.a in src.n) > 0),
  c as (select id, name, parent_id, array_agg(distinct a) als from m group by 1,2,3),
  c2 as (select * from c where not exists (select 1 from c ch where ch.parent_id = c.id)),
  c3 as (
    select * from c2 x
    where not exists (
      select 1 from c2 y
      where y.id <> x.id
        and not exists (
          select 1 from unnest(x.als) xa
          where not exists (select 1 from unnest(y.als) ya where ya <> xa and position(xa in ya) > 0)
        )
    )
  ),
  res as (
    select coalesce(p.name, c3.name) category,
           case when c3.parent_id is null then null else c3.name end detail
    from c3 left join opt p on p.id = c3.parent_id
  )
  select case when (select count(*) from res) = 1 then
      jsonb_build_object('resolved', true,
        'category', (select category from res), 'detail', (select detail from res),
        'candidates', (select jsonb_agg(to_jsonb(res)) from res))
    else
      jsonb_build_object('resolved', false,
        'candidates', coalesce((select jsonb_agg(to_jsonb(res)) from res), '[]'::jsonb))
  end
$function$;

-- 4. 규칙 분류기 (현재 DB 정의 그대로)
CREATE OR REPLACE FUNCTION public.classify_patient_text(p_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  dx_raw text;
  hs_raw text;
  dx jsonb;
  hs jsonb;
begin
  if p_text is not null and btrim(p_text) <> '' then
    dx_raw := substring(p_text from '진단명\s*[:：](.*)$');
    dx_raw := split_part(dx_raw, E'\n', 1);
    dx_raw := regexp_replace(dx_raw, '(본병원|타병원|최초진단일|수술\s*[:：]|항암\s*[:：]|CTx|방사선|메모\s*[:：]|부위\s*[:：]|치료과정|투약\s*[:：]|과거력|가족력).*$', '');
    dx_raw := btrim(dx_raw, E' \t\r-,./:：');

    hs_raw := substring(p_text from '(?:본병원|타병원)\s*[:：](.*)$');
    hs_raw := split_part(hs_raw, E'\n', 1);
    hs_raw := regexp_replace(hs_raw, '(수술\s*[:：]|항암|CTx|방사선|메모\s*[:：]|퇴원|과거력|투약\s*[:：]|가족력|[Ff][Uu]\s*[:：]).*$', '');
    hs_raw := btrim(hs_raw, E' \t\r-,./:：');
  end if;

  if dx_raw = '' or dx_raw !~ '[가-힣A-Za-z]' then dx_raw := null; end if;
  if hs_raw = '' or hs_raw !~ '[가-힣A-Za-z]' then hs_raw := null; end if;

  dx := match_option_by_alias(dx_raw, 'diagnosis');
  hs := match_option_by_alias(hs_raw, 'hospital');

  -- 위치 설명·불확실 표현은 자동 확정하지 않음 (예: '서울대 앞 ○○병원(이름모름)')
  if hs_raw ~ '(앞|근처|인근|주변|모름|->|→)' then
    hs := jsonb_build_object('resolved', false, 'candidates', coalesce(hs->'candidates','[]'::jsonb));
  end if;

  return jsonb_build_object(
    'diagnosis', dx || jsonb_build_object('raw', dx_raw),
    'hospital',  hs || jsonb_build_object('raw', hs_raw));
end $function$;