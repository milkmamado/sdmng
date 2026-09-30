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
}

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
  const fs = crmDate(b.fsCmhsDt);
  if (fs) out.first_visit_date = fs;
  const ls = crmDate(b.lstCmhsDt);
  if (ls) out.last_visit_date = ls;
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
