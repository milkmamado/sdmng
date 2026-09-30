# 조사 결과: 진단·이전병원 필드 사용처 (코드 수정 없음)

`src/` 전체를 대상으로 rg 검색했습니다. 자동 생성 파일인 types.ts는 제외했습니다. 타입 정의(interface)에만 나오는 줄은 "타입"으로 표시했습니다.

## 핵심 답변
**매출·결제·패키지·통계 계산에서 이 필드를 조건이나 그룹 기준으로 쓰는 곳은 없습니다.**
- package_transactions, package_management, payment_amount, treatment_plans, 인센티브, 객단가, RevenueBulkManagement, PackageIntegration, Dashboard, ManagerStats, utils/statisticsCalculations에서는 한 번도 쓰이지 않습니다.
- StatisticsManagement는 환자 목록에 진단명을 보여주려고 불러올 뿐이고, 집계에는 쓰지 않습니다.
- 단, **매출이 아닌 업무 로직 2가지**에서 `diagnosis_category`를 조건으로 씁니다. 아래 "주의" 항목을 참고해 주세요.

## 주의: 업무 로직에서 쓰이는 곳 (diagnosis_category 값에 따라 동작이 달라짐)
- utils/patientStatusUtils.ts:12-15 — `isShortTermTreatmentPatient`는 값이 '부인과 수술 후 회복' 또는 '척추질환'이면 단기치료 환자로 판별합니다.
- DailyStatusGrid.tsx:1628, 2162 / PatientListManagement.tsx:2721 / PatientDetailModal.tsx:925 — 단기치료 환자는 일별 상태 선택지가 입원·외래·퇴원·기타로 제한됩니다.
- DailyStatusTracking.tsx:463-464 — 값이 '부인과 수술 후 회복' 또는 '척추관절'인 환자가 퇴원하면 management_status가 자동으로 '치료종료'로 바뀝니다. 이 상태값은 통계·리스크 집계에 간접적으로 영향을 줍니다.
- 참고: 한쪽은 '척추질환', 다른 쪽은 '척추관절'로 적혀 있어 표기가 서로 다릅니다. 원본 코드 그대로입니다.

## 파일별 전체 목록

**PatientBasicForm.tsx** (입력 폼)
- 43-46: 폼 초기값
- 114-117: 수정할 때 기존 값 불러오기
- 185-186: diagnosis_options, hospital_options 조회 (대분류만, parent_id null) — 드롭다운 옵션
- 401: CRM에서 받은 데이터를 폼에 넣을 필드 목록 — CRM 가져오기
- 515-518: 저장
- 602-605: 폼 초기화
- 784-827: 진단명 대/중분류, 이전병원 대/중분류 입력칸

**CRMBookmarklet.tsx:16** (CRM 가져오기) — diagnosis_category, diagnosis_detail(dg 선택값), hospital_category(getHospitalCategory), hospital_branch(getHospitalBranch)를 긁어옵니다.

**PatientListManagement.tsx**
- 50-54: 타입
- 255: 검색 필터 (hospital_category)
- 287: 진단명 필터
- 470-472: 엑셀 내보내기
- 2157: 목록 표시
- 2362-2392: 상세 모달 표시
- 2721: 단기치료 판별 (기타)

**FirstVisitManagement.tsx**
- 39-42: 타입
- 299-302: 엑셀
- 360: 검색 필터
- 396: 진단명 필터
- 581, 587, 599: 목록 표시

**DailyStatusGrid.tsx**
- 37 (detailed_diagnosis), 62-65: 타입
- 1505: 행 표시
- 1628, 2162: 단기치료 판별 (기타)
- 1807-1837: 상세 모달 표시

**DailyStatusTracking.tsx**
- 33-39: 타입
- 155: 검색 필터
- 168, 180: 조회
- 463-464: 퇴원 시 자동 치료종료 (기타)
- 586: 엑셀

**ChurnedPatientSchedule.tsx**
- 28-34: 타입
- 141: 검색 필터
- 154, 166: 조회
- 420: 엑셀

**ExemptPatientManagement.tsx**
- 34-40: 타입
- 155, 167: 조회
- 372-373: 엑셀
- 415-416: 검색 필터
- 566, 661, 665: 표시

**RiskManagement.tsx**
- 29-42: 타입
- 561-566: 엑셀
- 623-624: 진단 검색 필터
- 858, 1000, 1004, 1039: 표시

**UnclassifiedPatientList.tsx**
- 32-36: 타입
- 239: 엑셀
- 507: 표시

**PatientDetailModal.tsx**
- 40-44: 타입
- 668-680: 상세 표시 (읽기 전용)
- 925: 단기치료 판별 (기타)

**StatisticsManagement.tsx**
- 1068-1069: 관리기간별 환자 목록 조회 (집계에는 쓰지 않음)
- 1731, 1825: 목록 표시

**hooks/useOptionsData.ts:14, 32** — 옵션 조회 훅. 현재 이 훅을 호출하는 화면은 확인되지 않았습니다.

**DataMigration.tsx** (기타: 백업·복원)
- 77-78, 114-115: 옵션 테이블 엑셀 백업
- 233-234: 복원할 때 diagnosis_category, hospital_branch 컬럼 제거
- 252-253, 309-310, 357: 옵션 테이블 복원 처리

detailed_diagnosis는 DailyStatusGrid.tsx:37 타입 정의에만 있고, 실제로 읽거나 쓰는 곳은 없습니다.

## patients 테이블에 걸린 트리거·DB 함수
- 트리거는 `update_patients_updated_at` 하나뿐입니다 (BEFORE UPDATE). 함수 `update_updated_at_column()`을 실행해 updated_at을 현재 시각으로 바꾸는 일만 합니다.
- patients를 참조하는 함수는 `can_view_manager`(교차 열람 조회 정책에서 사용)와 `get_next_cycle_number`(admission_cycles 대상)입니다. 둘 다 진단·병원 필드와는 관계없습니다.
- 진단·병원 필드를 읽거나 바꾸는 DB 트리거나 함수는 없습니다.
