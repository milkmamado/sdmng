
DELETE FROM public.patient_status_options;
INSERT INTO public.patient_status_options (name, exclude_from_daily_tracking) VALUES
  ('관리 중', false),
  ('면책기간', true),
  ('사망', true),
  ('상태악화', true),
  ('아웃', true),
  ('아웃위기', true),
  ('치료종료', true);

DELETE FROM public.insurance_type_options;
INSERT INTO public.insurance_type_options (name) VALUES
  ('1세대'),('2세대'),('3세대'),('4세대'),
  ('건강보험'),('기타'),('무보험'),
  ('실비+암보험'),('실비보험'),('암보험'),('종합보험');
