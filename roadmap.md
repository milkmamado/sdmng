# Roadmap

## 진단·병원 자동 분류 (진행 중)
- [ ] 엣지 함수 classify-patient (POST patient_ids 1~50, JWT 인증+승인 확인, rule/ai/manual, Lovable AI 폴백)
- [ ] migration 파일 기록 (멱등: patients 6컬럼, aliases, sort_order, 함수 2개 pg_get_functiondef)
- [ ] types.ts 새 컬럼 갱신 확인
- [ ] PatientBasicForm: 4칸 별도 영역 이동, Select/콤보박스, 배지+원문, 확인 버튼, manual 처리, fire-and-forget classify
- [ ] CRM 가져오기: apiFields 4개 제거, 빈 값 덮어쓰기 방지, counseling_content 변경 시 classify 호출
- [ ] PatientListManagement/FirstVisitManagement: 「진단·병원 확인 필요만」 토글+인원수, 주황 점
- [ ] 마스터 전용 classification-options 페이지 (트리 관리, 미분류 원문, 전체 재분류)
- [ ] 빌드 확인 + 변경 요약
