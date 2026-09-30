// @ts-nocheck
// POST /api/classify-patient
// 상담내용(counseling_content)에서 진단명·이전병원을 자동 분류
// - 규칙 분류기(classify_patient_text) 우선, 실패 시 Lovable AI(google/gemini-2.5-flash) 폴백
// - 요청자 JWT로 만든 클라이언트로 읽고 써서 RLS가 그대로 적용됨 (service_role 사용 안 함)
import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

interface OptionRow {
  id: string;
  name: string;
  parent_id: string | null;
}

async function classifyWithAI(
  kind: 'diagnosis' | 'hospital',
  text: string,
  categories: OptionRow[],
  detailsByParent: Map<string, OptionRow[]>,
): Promise<{ category: string | null; detail: string | null; raw: string | null }> {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

  const kindLabel = kind === 'diagnosis' ? '진단명' : '병원';
  const optionLines = categories
    .map((c) => {
      const details = (detailsByParent.get(c.id) || []).map((d) => d.name).join(', ');
      return details ? `- ${c.name} (하위: ${details})` : `- ${c.name}`;
    })
    .join('\n');

  const prompt = `아래는 한방병원 CRM의 환자 상담내용입니다. 상담내용에서 ${kindLabel}을(를) 찾아, 반드시 아래 목록에 있는 이름 중에서만 골라주세요.

[목록]
${optionLines}

[상담내용]
${text}

규칙:
- category는 목록의 대분류 이름과 정확히 일치해야 합니다. detail은 해당 대분류의 하위 이름과 정확히 일치해야 합니다.
- 목록에 맞는 것이 없으면 category를 null로 하세요.
- raw는 상담내용에서 ${kindLabel}으로 적힌 짧은 원문입니다.
- JSON만 답하세요: {"category": "..."|null, "detail": "..."|null, "raw": "..."|null}`;

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI empty response');

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('AI returned non-JSON');
  }

  // 서버 측 검증: category/detail이 실제 옵션에 존재하고 detail이 그 category의 하위인지 확인
  let category: string | null = null;
  let detail: string | null = null;
  if (typeof parsed.category === 'string' && parsed.category) {
    const cat = categories.find((c) => c.name === parsed.category);
    if (cat) {
      category = cat.name;
      if (typeof parsed.detail === 'string' && parsed.detail) {
        const det = (detailsByParent.get(cat.id) || []).find((d) => d.name === parsed.detail);
        if (det) detail = det.name;
      }
    }
  }

  return {
    category,
    detail,
    raw: typeof parsed.raw === 'string' && parsed.raw ? parsed.raw.slice(0, 200) : null,
  };
}

export const Route = createFileRoute('/api/classify-patient')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get('authorization');
          if (!authHeader?.startsWith('Bearer ')) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          // 요청자 JWT로 클라이언트 생성 → RLS 그대로 적용
          const supabase = createClient<Database>(
            process.env['SUPABASE_URL']!,
            process.env['SUPABASE_PUBLISHABLE_KEY']!,
            {
              global: { headers: { Authorization: authHeader } },
              auth: { persistSession: false, autoRefreshToken: false },
            },
          );

          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          // 승인된 사용자만 허용
          const { data: roleRow } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', userData.user.id)
            .eq('approval_status', 'approved')
            .maybeSingle();

          if (!roleRow) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
          }

          const body = await request.json();
          const patientIds: string[] = body?.patient_ids;
          if (!Array.isArray(patientIds) || patientIds.length === 0 || patientIds.length > 50) {
            return Response.json({ error: 'patient_ids must be an array of 1~50 ids' }, { status: 400 });
          }

          // 옵션 목록 로드 (AI 프롬프트·검증용)
          const [{ data: dxOpts }, { data: hsOpts }] = await Promise.all([
            supabase.from('diagnosis_options').select('id, name, parent_id'),
            supabase.from('hospital_options').select('id, name, parent_id'),
          ]);

          const buildMaps = (rows: OptionRow[] | null) => {
            const categories = (rows || []).filter((r) => r.parent_id === null);
            const detailsByParent = new Map<string, OptionRow[]>();
            (rows || []).forEach((r) => {
              if (r.parent_id) {
                const arr = detailsByParent.get(r.parent_id) || [];
                arr.push(r);
                detailsByParent.set(r.parent_id, arr);
              }
            });
            return { categories, detailsByParent };
          };
          const dxMap = buildMaps(dxOpts as OptionRow[] | null);
          const hsMap = buildMaps(hsOpts as OptionRow[] | null);

          const { data: patients, error: fetchError } = await supabase
            .from('patients')
            .select(
              'id, counseling_content, treatment_memo_2, diagnosis_category, diagnosis_detail, diagnosis_raw, diagnosis_source, diagnosis_needs_review, hospital_category, hospital_branch, hospital_raw, hospital_source, hospital_needs_review',
            )
            .in('id', patientIds);

          if (fetchError) throw fetchError;

          let processed = 0;
          let updated = 0;
          const errors: { patient_id: string; message: string }[] = [];

          for (const p of patients || []) {
            processed++;
            try {
              const text: string | null = p.counseling_content;
              const kcd: string | null = p.treatment_memo_2;
              const hasText = !!(text && text.trim());
              const hasKcd = !!(kcd && kcd.trim());
              // 상담내용·상병코드 둘 다 비어 있을 때만 건너뜀 (코드만 있는 환자도 분류)
              if (!hasText && !hasKcd) continue;

              const { data: result, error: rpcError } = await supabase.rpc('classify_patient_text', {
                p_text: text ?? '',
                p_kcd: kcd ?? null,
              });
              if (rpcError) throw rpcError;

              const updatePayload: Record<string, unknown> = {};

              // 진단명·병원 각각 독립 처리
              for (const kind of ['diagnosis', 'hospital'] as const) {
                const isDx = kind === 'diagnosis';
                const sourceField = isDx ? 'diagnosis_source' : 'hospital_source';
                if ((p as any)[sourceField] === 'manual') continue; // manual은 절대 덮어쓰지 않음

                const r = (result as any)?.[kind];
                if (!r) continue;

                const catField = isDx ? 'diagnosis_category' : 'hospital_category';
                const detField = isDx ? 'diagnosis_detail' : 'hospital_branch';
                const rawField = isDx ? 'diagnosis_raw' : 'hospital_raw';
                const reviewField = isDx ? 'diagnosis_needs_review' : 'hospital_needs_review';

                if (r.resolved === true && r.category) {
                  // 규칙 확정
                  updatePayload[catField] = r.category;
                  updatePayload[detField] = r.detail ?? null;
                  updatePayload[rawField] = r.raw ?? null;
                  updatePayload[sourceField] = 'rule';
                  // 상담내용과 상병코드가 충돌하면 true (hospital 쪽엔 없으므로 결과적으로 false)
                  updatePayload[reviewField] = r.needs_review === true;
                } else {
                  // 규칙 실패 → AI 폴백: 상담내용이 없으면 AI를 부르지 않고 이 kind는 그대로 둠
                  if (!hasText) continue;
                  // 이미 AI 제안이 걸려 있고 원문이 그대로면 AI를 다시 부르지 않음
                  const currentRaw = (p as any)[rawField];
                  const reuseExistingAi =
                    (p as any)[sourceField] === 'ai' &&
                    (p as any)[reviewField] === true &&
                    r.raw != null &&
                    currentRaw === r.raw;
                  if (reuseExistingAi) continue;

                  try {
                    const ai = await classifyWithAI(
                      kind,
                      text ?? '',
                      isDx ? dxMap.categories : hsMap.categories,
                      isDx ? dxMap.detailsByParent : hsMap.detailsByParent,
                    );
                    // AI도 아무것도 못 찾고 규칙 raw도 없으면 아무것도 바꾸지 않음
                    if (!ai.category && !ai.raw && !r.raw) continue;
                    if (ai.category) {
                      updatePayload[catField] = ai.category;
                      updatePayload[detField] = ai.detail;
                    }
                    updatePayload[rawField] = r.raw ?? ai.raw ?? null;
                    updatePayload[sourceField] = 'ai';
                    updatePayload[reviewField] = true;
                  } catch (aiErr) {
                    // AI 실패: 규칙 raw가 있을 때만 raw 저장 + 확인 필요 표시
                    console.error(`AI classify failed (${kind}, patient ${p.id}):`, aiErr);
                    if (r.raw) {
                      updatePayload[rawField] = r.raw;
                      updatePayload[reviewField] = true;
                    }
                  }
                }
              }

              // 실제로 바뀌는 필드만 update
              const changed: Record<string, unknown> = {};
              for (const [k, v] of Object.entries(updatePayload)) {
                if ((p as any)[k] !== v) changed[k] = v;
              }

              if (Object.keys(changed).length > 0) {
                const { error: upError } = await supabase.from('patients').update(changed).eq('id', p.id);
                if (upError) throw upError;
                updated++;
              }
            } catch (e: any) {
              // 환자 하나 실패해도 나머지 계속
              console.error(`classify failed for patient ${p.id}:`, e);
              errors.push({ patient_id: p.id, message: String(e?.message || e) });
            }
          }

          return Response.json({ processed, updated, errors });
        } catch (e: any) {
          console.error('classify-patient error:', e);
          return Response.json({ error: String(e?.message || e) }, { status: 500 });
        }
      },
    },
  },
});
