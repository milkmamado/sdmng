// CRM 연동(v2) 공통 비교 규칙 — 일괄 동기화와 CRM 바로 등록에서 함께 사용
export const CRM_ORIGIN = 'http://192.168.1.101';
export const CRM_MAIN_URL = 'http://192.168.1.101/html/MEDI20/main.html';

export interface CrmRecord {
  clntNo: string;
  ok: boolean;
  error?: string;
  base?: {
    clntNm?: string; sex?: string; age?: number | string; hpTelno?: string; orgHpTelno?: string;
    upAddr?: string; rmk1?: string; rmk2?: string; mdcrMemoCnts1?: string; mdcrMemoCnts2?: string;
    fsCmhsDt?: string; lstCmhsDt?: string;
  };
  cnsl?: { cnslCnts?: string | null; cnslDate?: string | null; cnslHm?: string | null; count?: number };
  adms?: CrmAdmsRow[] | null;
}

export interface CrmAdmsRow { admsDate?: string; dschDate?: string; admsYn?: string; wardNm?: string; roomNm?: string }

export const FIELD_LABELS: Record<string, string> = {
  phone: '휴대폰번호',
  age: '나이',
  special_note_1: '특이사항1',
  special_note_2: '특이사항2',
  treatment_memo_1: '진료메모1',
  treatment_memo_2: '진료메모2',
  first_visit_date: '최초내원일',
  last_visit_date: '최종내원일',
  counseling_content: '상담내용',
};

const isEmpty = (v: any) => v === null || v === undefined || String(v).trim() === '';

export const normalizeName = (s: any) => String(s ?? '').replace(/\s+/g, '');

export function formatPhone(hp?: string): string | null {
  const n = String(hp ?? '').replace(/[^0-9]/g, '');
  if (!n) return null;
  if (n.length === 11) return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  return n;
}

export function crmDate(v?: string): string | null {
  const d = String(v ?? '').replace(/[^0-9]/g, '').slice(0, 8);
  if (d.length !== 8) return null;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

/** CRM 레코드에서 갱신 후보 값 추출 (빈 값은 제외) */
export function crmValues(rec: CrmRecord): Record<string, any> {
  const b = rec.base || {};
  const out: Record<string, any> = {};
  const phone = !isEmpty(b.orgHpTelno) ? String(b.orgHpTelno).trim() : formatPhone(b.hpTelno);
  if (!isEmpty(phone)) out.phone = phone;
  if (!isEmpty(b.age) && !isNaN(Number(b.age))) out.age = Number(b.age);
  if (!isEmpty(b.rmk1)) out.special_note_1 = b.rmk1;
  if (!isEmpty(b.rmk2)) out.special_note_2 = b.rmk2;
  if (!isEmpty(b.mdcrMemoCnts1)) out.treatment_memo_1 = b.mdcrMemoCnts1;
  if (!isEmpty(b.mdcrMemoCnts2)) out.treatment_memo_2 = b.mdcrMemoCnts2;
  // 입원 환자는 CRM에서 퇴원 예정일처럼 미래 날짜가 올 수 있으므로 오늘(로컬 기준)보다 늦으면 오늘로 제한
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fs = crmDate(b.fsCmhsDt);
  if (fs) out.first_visit_date = fs > today ? today : fs;
  const ls = crmDate(b.lstCmhsDt);
  if (ls) out.last_visit_date = ls > today ? today : ls;
  if (!isEmpty(rec.cnsl?.cnslCnts)) out.counseling_content = rec.cnsl!.cnslCnts;
  return out;
}

/** 실제로 바뀌는 필드만 반환. last_visit_date는 CRM이 더 늦을 때만. */
export function diffPatient(patient: any, rec: CrmRecord): Record<string, any> {
  const vals = crmValues(rec);
  const changes: Record<string, any> = {};
  // 상담 기록이 여러 건이면 기존 상담내용을 최신(짧은) 상담으로 덮어쓰지 않음
  const protectCounseling =
    Number(rec.cnsl?.count ?? 0) >= 2 && !isEmpty(patient.counseling_content);
  for (const [k, v] of Object.entries(vals)) {
    if (k === 'counseling_content' && protectCounseling) continue;
    const cur = patient[k];
    if (k === 'last_visit_date') {
      const curDate = cur ? String(cur).slice(0, 10) : null;
      if (!curDate || v > curDate) changes[k] = v;
      continue;
    }
    if (k === 'first_visit_date') {
      const curDate = cur ? String(cur).slice(0, 10) : null;
      if (curDate !== v) changes[k] = v;
      continue;
    }
    if (k === 'age') {
      if (Number(cur) !== v) changes[k] = v;
      continue;
    }
    if (String(cur ?? '') !== String(v)) changes[k] = v;
  }
  return changes;
}

export function describeChange(field: string, before: any, after: any): string {
  const label = FIELD_LABELS[field] || field;
  if (field === 'counseling_content') {
    const cut = (s: any) => {
      const t = String(s ?? '').replace(/\s+/g, ' ').trim();
      return t.length > 40 ? t.slice(0, 40) + '…' : t || '(없음)';
    };
    return `${label}: ${cut(before)} → ${cut(after)}`;
  }
  if (field === 'first_visit_date' || field === 'last_visit_date') {
    const md = (s: any) => (s ? `${Number(String(s).slice(5, 7))}/${Number(String(s).slice(8, 10))}` : '없음');
    return `${label} ${md(before)}→${md(after)}`;
  }
  if (field.startsWith('treatment_memo') || field.startsWith('special_note')) return `${label} 변경`;
  return `${label} ${before ?? '없음'}→${after}`;
}

export function decodeHashPayload(encoded: string): any {
  return JSON.parse(decodeURIComponent(atob(encoded)));
}
export function encodeHashPayload(obj: any): string {
  return btoa(encodeURIComponent(JSON.stringify(obj)));
}

// ---------- 입원정보 → 일별 환자 상태 ----------
export const ADMS_SYNC_START = '2026-05-01';
export const ADMISSION_TYPES = ['입원', '재원', '퇴원'] as const;
export type AdmissionType = '입원' | '재원' | '퇴원';
const ADM_PRIORITY: Record<AdmissionType, number> = { 입원: 3, 재원: 2, 퇴원: 1 };

const fmtLocal = (dt: Date) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

/** 브라우저 로컬 날짜 yyyy-MM-dd */
export function localToday(): string {
  return fmtLocal(new Date());
}

/** yyyy-MM-dd 문자열에 n일 더하기 (로컬 기준, UTC 파싱 없음) */
export function addDaysStr(s: string, n: number): string {
  const [y, m, d] = s.split('-').map(Number);
  return fmtLocal(new Date(y, m - 1, d + n));
}

export interface AdmissionPlan {
  days: Map<string, AdmissionType>;
  isAdmittedNow: boolean;
  /** 가장 마지막 입원(오늘 이전 시작)의 퇴원일 — 현재 재원이거나 퇴원 전이면 null */
  lastDischargeDate: string | null;
  /** ADMS_SYNC_START 이후 입원 기록이 있는지 */
  hasRecentAdmission: boolean;
  /** 퇴원일이 없어(빈 값·미래) 재원을 채우지 못한 행 수 */
  skippedRows: number;
}

export function buildAdmissionDays(adms: CrmAdmsRow[] | null | undefined, today: string): AdmissionPlan {
  const days = new Map<string, AdmissionType>();
  const put = (date: string, t: AdmissionType) => {
    if (date > today || date < ADMS_SYNC_START) return;
    const cur = days.get(date);
    if (!cur || ADM_PRIORITY[t] > ADM_PRIORITY[cur]) days.set(date, t);
  };
  // 유효한 행만: 입원일이 있고 오늘 이전
  const rows = (adms || [])
    .map((row) => ({ a: crmDate(row.admsDate), d: crmDate(row.dschDate), yn: String(row.admsYn ?? '').trim() }))
    .filter((r): r is { a: string; d: string | null; yn: string } => !!r.a && r.a <= today);
  // 현재 입원 중 판정용: 가장 늦은 입원일 (이보다 늦은 행이 있으면 오래된 미정리 기록)
  const maxA = rows.reduce<string | null>((m, r) => (!m || r.a > m ? r.a : m), null);
  let isAdmittedNow = false;
  let skippedRows = 0;
  let hasRecentAdmission = false;
  let last: { a: string; d: string | null; discharged: boolean } | null = null;
  for (const r of rows) {
    // ongoing: admsYn이 '재원'/'입원'이고 다른 행 중 더 늦은 입원일이 없는 행만
    const ongoing = (r.yn === '재원' || r.yn === '입원') && r.a === maxA;
    let discharged = false;
    if (ongoing) {
      isAdmittedNow = true;
      put(r.a, '입원');
      for (let x = addDaysStr(r.a, 1); x <= today; x = addDaysStr(x, 1)) put(x, '재원');
    } else if (r.d && r.d >= r.a && r.d <= today) {
      // 진행 중이 아닌데 퇴원일이 있으면(빈 값·알 수 없는 값 포함) 퇴원된 것으로 처리
      discharged = true;
      put(r.a, '입원');
      const stayEnd = addDaysStr(r.d, -1);
      for (let x = addDaysStr(r.a, 1); x <= stayEnd && x <= today; x = addDaysStr(x, 1)) put(x, '재원');
      if (r.d > r.a) put(r.d, '퇴원');
    } else {
      // 퇴원일이 없거나 미래 → 입원 한 칸만, 재원은 채우지 않음
      skippedRows++;
      put(r.a, '입원');
    }
    if (r.a >= ADMS_SYNC_START || (r.d && r.d >= ADMS_SYNC_START)) hasRecentAdmission = true;
    if (!last || r.a > last.a) last = { a: r.a, d: r.d, discharged };
  }
  const lastDischargeDate =
    last && last.discharged && !isAdmittedNow && last.d! <= today ? last.d : null;
  return { days, isAdmittedNow, lastDischargeDate, hasRecentAdmission, skippedRows };
}

export interface DailyDiff {
  inserts: { date: string; type: AdmissionType }[];
  updates: { date: string; from: string; to: AdmissionType }[];
  conflicts: { date: string; existing: string; crm: AdmissionType }[];
}

/** CRM 기간 밖의 기존 값은 절대 건드리지 않음 */
export function diffDailyStatus(planDays: Map<string, AdmissionType>, existing: Map<string, string>): DailyDiff {
  const out: DailyDiff = { inserts: [], updates: [], conflicts: [] };
  const dates = Array.from(planDays.keys()).sort();
  for (const date of dates) {
    const t = planDays.get(date)!;
    const cur = existing.get(date);
    if (!cur) out.inserts.push({ date, type: t });
    else if (cur === t) continue;
    else if ((ADMISSION_TYPES as readonly string[]).includes(cur)) out.updates.push({ date, from: cur, to: t });
    else out.conflicts.push({ date, existing: cur, crm: t });
  }
  return out;
}

export const mdLabel = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
