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
  pkg?: CrmPkg[] | null;
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

/** 이름 비교용 — 공백 제거 + 끝에 붙은 숫자(CRM 동명이인 표시 등) 제거 */
export const nameKey = (s: any) => normalizeName(s).replace(/[0-9]+$/, '');
/** CRM/엑셀 이름과 사이트 이름이 같은 사람인지 (끝 숫자 차이만 허용) */
export const sameName = (a: any, b: any) => { const x = nameKey(a); return x !== '' && x === nameKey(b); };
/** 끝 숫자만 다른 경우 true (완전 일치면 false) */
export const nameDiffersOnlyBySuffix = (a: any, b: any) => normalizeName(a) !== normalizeName(b) && sameName(a, b);

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
export type AdmissionType = '입원' | '재원' | '퇴원' | '낮병동';
// 당일 입퇴원(낮병동)은 같은 날 다른 입원 기록과 겹치면 항상 짐
const ADM_PRIORITY: Record<AdmissionType, number> = { 입원: 3, 재원: 2, 퇴원: 1, 낮병동: 0 };

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
  /** 입원상태가 불명확(퇴원일 없음/미래, 진행 중 아님)해 반영하지 않은 행 */
  unclearRows: { admsDate: string; admsYn: string }[];
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
  const unclearRows: { admsDate: string; admsYn: string }[] = [];
  let hasRecentAdmission = false;
  // 1. 각 행을 구간으로 분류
  const segs: { start: string; end: string; ongoing: boolean }[] = [];
  for (const r of rows) {
    // ongoing: admsYn이 '재원'/'입원'이고 다른 행 중 더 늦은 입원일이 없는 행만
    const ongoing = (r.yn === '재원' || r.yn === '입원') && r.a === maxA;
    if (ongoing) {
      segs.push({ start: r.a, end: today, ongoing: true });
    } else if (r.d && r.d >= r.a && r.d <= today) {
      // 진행 중이 아닌데 퇴원일이 있으면(빈 값·알 수 없는 값 포함) 퇴원된 것으로 처리
      segs.push({ start: r.a, end: r.d, ongoing: false });
    } else {
      // 퇴원일이 없거나 미래 + 진행 중 아님 → 신뢰 불가, 아무것도 넣지 않음
      unclearRows.push({ admsDate: r.a, admsYn: r.yn });
    }
    if (r.a >= ADMS_SYNC_START || (r.d && r.d >= ADMS_SYNC_START)) hasRecentAdmission = true;
  }
  // 2. start 오름차순 정렬 후 병합: 다음 입원일 <= 현재 퇴원일 이면 한 번의 입원으로 이어봄
  //    (퇴원 당일 재입원은 이어붙이지만, 다음날 재입원(start = end+1)은 합치지 않음)
  segs.sort((x, y) => (x.start < y.start ? -1 : x.start > y.start ? 1 : 0));
  const merged: { start: string; end: string; ongoing: boolean }[] = [];
  for (const s of segs) {
    const m = merged[merged.length - 1];
    if (m && s.start <= m.end) {
      if (s.end > m.end) m.end = s.end;
      m.ongoing = m.ongoing || s.ongoing;
    } else {
      merged.push({ ...s });
    }
  }
  // 3. 병합된 구간마다 칸 채우기
  for (const m of merged) {
    if (m.start === m.end && !m.ongoing) {
      // 당일 입퇴원 단독: 그날은 '낮병동' 한 칸만 (입원 칸을 넣지 않음)
      put(m.start, '낮병동');
      continue;
    }
    put(m.start, '입원');
    const stayEnd = m.ongoing ? today : addDaysStr(m.end, -1);
    for (let x = addDaysStr(m.start, 1); x <= stayEnd && x <= today; x = addDaysStr(x, 1)) put(x, '재원');
    if (!m.ongoing) put(m.end, '퇴원');
  }
  const isAdmittedNow = merged.some((m) => m.ongoing);
  const lastMerged = merged[merged.length - 1] ?? null;
  const lastDischargeDate =
    lastMerged && !lastMerged.ongoing && lastMerged.end <= today ? lastMerged.end : null;
  return { days, isAdmittedNow, lastDischargeDate, hasRecentAdmission, skippedRows: unclearRows.length, unclearRows };
}

export interface DailyDiff {
  inserts: { date: string; type: AdmissionType }[];
  updates: { date: string; from: string; to: AdmissionType }[];
  conflicts: { date: string; existing: string; crm: AdmissionType }[];
  /** CRM 입원기록에 없는 날의 기존 입원·재원·퇴원 (정리 후보) */
  removals: { date: string; existing: string }[];
}

/** CRM 기간 밖의 기존 값은 절대 건드리지 않음 */
export function diffDailyStatus(
  planDays: Map<string, AdmissionType>,
  existing: Map<string, string>,
  today: string,
): DailyDiff {
  const out: DailyDiff = { inserts: [], updates: [], conflicts: [], removals: [] };
  const dates = Array.from(planDays.keys()).sort();
  for (const date of dates) {
    const t = planDays.get(date)!;
    const cur = existing.get(date);
    if (!cur) out.inserts.push({ date, type: t });
    else if (cur === t) continue;
    else if ((ADMISSION_TYPES as readonly string[]).includes(cur)) out.updates.push({ date, from: cur, to: t });
    else out.conflicts.push({ date, existing: cur, crm: t });
  }
  for (const [date, cur] of Array.from(existing.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (date < ADMS_SYNC_START || date > today) continue;
    if (!(ADMISSION_TYPES as readonly string[]).includes(cur)) continue;
    if (planDays.has(date)) continue;
    out.removals.push({ date, existing: cur });
  }
  return out;
}

export const mdLabel = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;

// ---------- 패키지(예치금·적립금·횟수) ----------
export interface CrmPkgAct { actNo: number | string; actStartDate?: string; actEndDate?: string; actAmount?: number | string; actCnts?: string | null }
export interface CrmPkg {
  pkgCd: string; pkgNm?: string; a01?: number; a02?: number; b01?: number; b02?: number;
  acts: { AA?: CrmPkgAct[]; AB?: CrmPkgAct[]; BA?: CrmPkgAct[]; BB?: CrmPkgAct[] };
}
export type PkgKind = 'money' | 'count';
export const PKG_TX_TYPES = ['deposit_in', 'deposit_out', 'reward_in', 'reward_out', 'count_in', 'count_out'] as const;
export interface PkgTx {
  transaction_type: string; transaction_date: string; amount: number; count: number;
  date_from: string | null; date_to: string | null; note: string | null; crm_act_no: number; crm_pkg_cd: string;
}
export interface ExistingPkgRow {
  id: string; transaction_type: string; transaction_date: string; amount: number | string | null;
  count: number | null; crm_act_no: number | string | null; date_from?: string | null; date_to?: string | null; note?: string | null;
}
export interface PackagePlan {
  inserts: PkgTx[];
  links: { id: string; crm_act_no: number; crm_pkg_cd: string; tx: PkgTx }[];
  changed: { id: string; before: ExistingPkgRow; tx: PkgTx }[];
  orphans: ExistingPkgRow[];
  unknownPkgs: { pkgCd: string; pkgNm?: string }[];
  balanceMismatch: { deposit?: { site: number; crm: number }; reward?: { site: number; crm: number }; count?: { site: number; crm: number } } | null;
}

const MONEY_MAP: Record<string, string> = { AA: 'deposit_in', AB: 'deposit_out', BA: 'reward_in', BB: 'reward_out' };
const COUNT_MAP: Record<string, string> = { AA: 'count_in', AB: 'count_out' };
const num = (v: any) => (v === null || v === undefined || v === '' ? 0 : Number(v) || 0);
const d10 = (v: any) => (v ? String(v).slice(0, 10) : null);

export function convertCrmPkg(pkgList: CrmPkg[], kindMap: Map<string, PkgKind>) {
  const txs: PkgTx[] = [];
  const unknownPkgs: { pkgCd: string; pkgNm?: string }[] = [];
  for (const p of pkgList || []) {
    const cd = String(p.pkgCd);
    const kind = kindMap.get(cd);
    if (!kind) { unknownPkgs.push({ pkgCd: cd, pkgNm: p.pkgNm }); continue; }
    const map = kind === 'money' ? MONEY_MAP : COUNT_MAP;
    for (const key of Object.keys(map)) {
      const type = map[key];
      for (const a of (p.acts as any)?.[key] || []) {
        if (!a || a.actStartDate === '합계') continue;
        const val = num(a.actAmount);
        const s = crmDate(a.actStartDate);
        const e = crmDate(a.actEndDate);
        const isOut = type.endsWith('_out');
        const date = isOut ? e || s : s;
        if (!date || val <= 0 || a.actNo === null || a.actNo === undefined || a.actNo === '') continue;
        const note = a.actCnts && String(a.actCnts).trim() !== '' ? String(a.actCnts) : null;
        txs.push({
          transaction_type: type, transaction_date: date,
          amount: kind === 'money' ? val : 0, count: kind === 'count' ? val : 0,
          date_from: isOut ? s : null, date_to: isOut ? e || s : null,
          note, crm_act_no: Number(a.actNo), crm_pkg_cd: cd,
        });
      }
    }
  }
  return { txs, unknownPkgs };
}

export function buildPackagePlan(
  pkgList: CrmPkg[], kindMap: Map<string, PkgKind>, existingRows: ExistingPkgRow[], _patient?: any,
): PackagePlan {
  const { txs, unknownPkgs } = convertCrmPkg(pkgList, kindMap);
  const existing = (existingRows || []).filter((r) => (PKG_TX_TYPES as readonly string[]).includes(r.transaction_type));
  const byActNo = new Map<number, ExistingPkgRow>();
  existing.forEach((r) => { if (r.crm_act_no !== null && r.crm_act_no !== undefined) byActNo.set(Number(r.crm_act_no), r); });
  const pool = existing.filter((r) => r.crm_act_no === null || r.crm_act_no === undefined);
  const used = new Set<string>();
  const plan: PackagePlan = { inserts: [], links: [], changed: [], orphans: [], unknownPkgs, balanceMismatch: null };
  // 적용 후 상태: 연결된 기존 행은 CRM 값으로 대체, 미연결(orphan)은 그대로 남음
  const finalRows: { t: string; amount: number; count: number }[] = [];
  for (const tx of txs) {
    const ex = byActNo.get(tx.crm_act_no);
    if (ex) {
      const same = ex.transaction_type === tx.transaction_type && d10(ex.transaction_date) === tx.transaction_date &&
        num(ex.amount) === tx.amount && num(ex.count) === tx.count;
      if (!same) plan.changed.push({ id: ex.id, before: ex, tx });
      finalRows.push({ t: tx.transaction_type, amount: tx.amount, count: tx.count });
      continue;
    }
    const m = pool.find((r) => !used.has(r.id) && r.transaction_type === tx.transaction_type &&
      d10(r.transaction_date) === tx.transaction_date && num(r.amount) === tx.amount && num(r.count) === tx.count);
    if (m) {
      used.add(m.id);
      plan.links.push({ id: m.id, crm_act_no: tx.crm_act_no, crm_pkg_cd: tx.crm_pkg_cd, tx });
    } else {
      plan.inserts.push(tx);
    }
    finalRows.push({ t: tx.transaction_type, amount: tx.amount, count: tx.count });
  }
  plan.orphans = pool.filter((r) => !used.has(r.id));
  // CRM에서 사라진(연결됐지만 이번 목록에 없는) 행도 적용 후 남아 있으므로 합계에 포함
  const txActNos = new Set(txs.map((t) => t.crm_act_no));
  for (const r of existing) {
    const linkedGone = r.crm_act_no !== null && r.crm_act_no !== undefined && !txActNos.has(Number(r.crm_act_no));
    if (linkedGone || plan.orphans.includes(r)) finalRows.push({ t: r.transaction_type, amount: num(r.amount), count: num(r.count) });
  }
  const sum = (t: string, f: 'amount' | 'count') => finalRows.filter((r) => r.t === t).reduce((s, r) => s + r[f], 0);
  const known = (pkgList || []).filter((p) => kindMap.has(String(p.pkgCd)));
  const money = known.filter((p) => kindMap.get(String(p.pkgCd)) === 'money');
  const count = known.filter((p) => kindMap.get(String(p.pkgCd)) === 'count');
  const mm: NonNullable<PackagePlan['balanceMismatch']> = {};
  const dep = { site: sum('deposit_in', 'amount') - sum('deposit_out', 'amount'), crm: money.reduce((s, p) => s + num(p.a02), 0) };
  if (dep.site !== dep.crm) mm.deposit = dep;
  const rew = { site: sum('reward_in', 'amount') - sum('reward_out', 'amount'), crm: money.reduce((s, p) => s + num(p.b02), 0) };
  if (rew.site !== rew.crm) mm.reward = rew;
  const cnt = { site: sum('count_in', 'count') - sum('count_out', 'count'), crm: count.reduce((s, p) => s + num(p.a02), 0) };
  if (cnt.site !== cnt.crm) mm.count = cnt;
  plan.balanceMismatch = Object.keys(mm).length ? mm : null;
  return plan;
}
