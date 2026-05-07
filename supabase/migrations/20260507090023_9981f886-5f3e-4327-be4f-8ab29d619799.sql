
-- 혹시 모를 중복 제거 (가장 최근 항목 1건만 유지)
DELETE FROM public.daily_patient_status a
USING public.daily_patient_status b
WHERE a.patient_id = b.patient_id
  AND a.status_date = b.status_date
  AND a.created_at < b.created_at;

ALTER TABLE public.daily_patient_status
ADD CONSTRAINT daily_patient_status_patient_date_unique
UNIQUE (patient_id, status_date);
