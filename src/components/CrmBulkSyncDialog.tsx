// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBranchFilter } from '@/hooks/useBranchFilter';
import { useCrossView } from '@/hooks/useCrossView';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw } from 'lucide-react';
import { callClassifyPatient } from '@/lib/classifyPatient';
import {
  CRM_ORIGIN, CRM_MAIN_URL, CrmRecord, diffPatient, describeChange, sameName, nameDiffersOnlyBySuffix, encodeHashPayload,
  ADMS_SYNC_START, buildAdmissionDays, diffDailyStatus, localToday, mdLabel, DailyDiff, addDaysStr,
  buildPackagePlan, PackagePlan, PKG_TX_TYPES,
} from '@/lib/crmSync';
import { fetchAllRows, fetchAllQuery } from '@/lib/fetchAllRows';
import { Checkbox } from '@/components/ui/checkbox';

const SELECT_COLS =
  'id, name, customer_number, assigned_manager, phone, age, special_note_1, special_note_2, treatment_memo_1, treatment_memo_2, first_visit_date, last_visit_date, counseling_content, inflow_status, management_status, diagnosis_category';

const TREATMENT_END_DIAG = ['부인과 수술 후 회복', '척추질환', '척추관절'];

interface Planned { patient: any; changes: Record<string, any>; days: DailyDiff; admittedNow: boolean; pkg: PackagePlan | null }
const TX_LABEL: Record<string, string> = {
  deposit_in: '예치금 입금', deposit_out: '예치금 사용', reward_in: '적립금 입금', reward_out: '적립금 사용', count_in: '횟수 입력', count_out: '횟수 사용',
};
const won = (n: any) => `₩${Number(n || 0).toLocaleString()}`;
const pkgWork = (p: PackagePlan | null) => (p ? p.inserts.length + p.links.length + p.changed.length : 0);
function pkgLine(p: PackagePlan) {
  const g = (t: string) => p.inserts.filter((x) => x.transaction_type === t);
  const parts: string[] = [];
  const di = g('deposit_in'), dout = g('deposit_out'), ri = g('reward_in'), ro = g('reward_out'), ci = g('count_in'), co = g('count_out');
  if (di.length) parts.push(`예치금 입금 +${di.length}건 ${won(di.reduce((s, x) => s + x.amount, 0))}`);
  if (dout.length) parts.push(`사용 +${dout.length}건 ${won(dout.reduce((s, x) => s + x.amount, 0))}`);
  if (ri.length || ro.length) parts.push(`적립금 입금 +${ri.length}건 ${won(ri.reduce((s, x) => s + x.amount, 0))} / 사용 +${ro.length}건 ${won(ro.reduce((s, x) => s + x.amount, 0))}`);
  if (ci.length || co.length) parts.push(`횟수 입력 +${ci.length}건 ${ci.reduce((s, x) => s + x.count, 0)}회 / 사용 +${co.length}건 ${co.reduce((s, x) => s + x.count, 0)}회`);
  if (p.links.length) parts.push(`연결 ${p.links.length}건`);
  if (p.changed.length) parts.push(`변경 ${p.changed.length}건`);
  return parts.length ? `패키지: ${parts.join(' · ')}` : null;
}
function balLine(p: PackagePlan) {
  const b = p.balanceMismatch;
  if (!b) return null;
  const parts: string[] = [];
  if (b.deposit) parts.push(`예치금 사이트 ${won(b.deposit.site)} / CRM ${won(b.deposit.crm)}`);
  if (b.reward) parts.push(`적립금 사이트 ${won(b.reward.site)} / CRM ${won(b.reward.crm)}`);
  if (b.count) parts.push(`횟수 사이트 ${b.count.site}회 / CRM ${b.count.crm}회`);
  return `잔액 확인: ${parts.join(' · ')}`;
}
const EMPTY_DAYS: DailyDiff = { inserts: [], updates: [], conflicts: [], removals: [] };

/** 날짜 연속 + 같은 상태면 한 구간으로 묶기 */
function groupRuns(items: { date: string; existing: string }[]) {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const runs: { start: string; end: string; t: string; n: number }[] = [];
  for (const it of sorted) {
    const last = runs[runs.length - 1];
    if (last && last.t === it.existing && addDaysStr(last.end, 1) === it.date) { last.end = it.date; last.n++; }
    else runs.push({ start: it.date, end: it.date, t: it.existing, n: 1 });
  }
  return runs.map((r) => `${r.start === r.end ? mdLabel(r.start) : `${mdLabel(r.start)}~${mdLabel(r.end)}`} ${r.t} ${r.n}칸`);
}

export function CrmBulkSyncDialog({ onApplied }: { onApplied?: () => void }) {
  const { toast } = useToast();
  const { applyBranchFilter, currentBranch } = useBranchFilter();
  const { canEditManager } = useCrossView();
  const [open, setOpen] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [planned, setPlanned] = useState<Planned[]>([]);
  const [nameMismatch, setNameMismatch] = useState<string[]>([]);
  const [nameSuffixDiff, setNameSuffixDiff] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: number; failed: number; daysSaved: number; daysFailed: number; removed: number; removeFailed: number; pIns: number; pLink: number; pChg: number; pFail: number } | null>(null);
  const [doPkg, setDoPkg] = useState(true);
  const [unknownPkgList, setUnknownPkgList] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [notInflow, setNotInflow] = useState<string[]>([]);
  const [endTargets, setEndTargets] = useState<any[]>([]);
  const [outTargets, setOutTargets] = useState<any[]>([]);
  const [doEnd, setDoEnd] = useState(false);
  const [doOut, setDoOut] = useState(true);
  const [doRemove, setDoRemove] = useState(false);
  const [unclearList, setUnclearList] = useState<string[]>([]);
  const recordsRef = useRef<CrmRecord[]>([]);
  const targetsRef = useRef<any[]>([]);
  // CRM 동기화 기록(crm_sync_logs) — 실패해도 동기화 흐름은 막지 않음
  const logIdRef = useRef<string | null>(null);
  const branchRef = useRef<any>(currentBranch);
  branchRef.current = currentBranch;
  const writeLog = async (fields: Record<string, any>) => {
    try {
      const db = supabase as any;
      if (logIdRef.current) {
        const { error } = await db.from('crm_sync_logs').update(fields).eq('id', logIdRef.current);
        if (error) throw error;
        return;
      }
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      let userName: string | null = null;
      if (uid) {
        const { data: prof } = await db.from('profiles').select('name').eq('id', uid).maybeSingle();
        userName = prof?.name || u?.user?.email || null;
      }
      const { data, error } = await db.from('crm_sync_logs')
        .insert({ user_name: userName, branch: branchRef.current || null, ...fields })
        .select('id').single();
      if (error) throw error;
      logIdRef.current = data?.id || null;
    } catch (e) {
      console.warn('CRM 동기화 기록 저장 실패:', e);
    }
  };

  const reset = () => {
    setSummary(null); setPlanned([]); setNameMismatch([]); setNameSuffixDiff([]); setApplyResult(null);
    setNotInflow([]); setEndTargets([]); setOutTargets([]); setDoEnd(false); setDoOut(true); setDoRemove(false); setUnclearList([]);
    setDoPkg(true); setUnknownPkgList([]);
    recordsRef.current = [];
  };

  const start = async () => {
    reset();
    let query = supabase.from('patients').select(SELECT_COLS).not('customer_number', 'is', null);
    query = applyBranchFilter(query);
    const { data, error } = await fetchAllQuery<any>(query);
    if (error) {
      toast({ title: '오류', description: '환자 목록을 불러오지 못했습니다.', variant: 'destructive' });
      return;
    }
    const targets = (data || []).filter(
      (p) => String(p.customer_number || '').trim() && canEditManager(p.assigned_manager)
    );
    if (targets.length === 0) {
      toast({ title: '동기화할 환자가 없습니다', description: '고객번호가 있는 담당 환자가 없습니다.' });
      return;
    }
    targetsRef.current = targets;
    const payload = {
      v: 2, app: window.location.origin, bnch: '11',
      ids: Array.from(new Set(targets.map((p) => String(p.customer_number).trim()))),
    };
    window.open(`${CRM_MAIN_URL}#crm_sync=${encodeHashPayload(payload)}`, '_blank');
    setWaiting(true);
    setOpen(true);
    toast({ title: 'CRM 창에서 북마크를 눌러주세요', duration: 4000 });
  };

  const fetchExistingDaily = async (ids: string[]) => {
    const map = new Map<string, Map<string, string>>();
    const PAGE = 1000;
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('daily_patient_status')
          .select('patient_id, status_date, status_type')
          .in('patient_id', chunk)
          .gte('status_date', ADMS_SYNC_START)
          .order('status_date', { ascending: true })
          .order('patient_id', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        for (const r of data || []) {
          if (!map.has(r.patient_id)) map.set(r.patient_id, new Map());
          map.get(r.patient_id)!.set(String(r.status_date).slice(0, 10), r.status_type);
        }
        if (!data || data.length < PAGE) break;
      }
    }
    return map;
  };

  const fetchPkgContext = async (ids: string[]) => {
    const { data: types, error: tErr } = await (supabase as any).from('crm_package_types').select('pkg_cd, kind');
    if (tErr) throw tErr;
    const kindMap = new Map<string, any>((types || []).map((t: any) => [String(t.pkg_cd), t.kind]));
    const byPatient = new Map<string, any[]>();
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { data, error } = await fetchAllRows<any>((from, to) =>
        (supabase as any).from('package_transactions')
          .select('id, patient_id, transaction_type, transaction_date, amount, count, crm_act_no, date_from, date_to, note')
          .in('patient_id', chunk)
          .in('transaction_type', PKG_TX_TYPES as any)
          .order('transaction_date', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to));
      if (error) throw error;
      for (const r of data || []) {
        if (!byPatient.has(r.patient_id)) byPatient.set(r.patient_id, []);
        byPatient.get(r.patient_id)!.push(r);
      }
    }
    return { kindMap, byPatient };
  };

  const buildPreview = async (done: { total: number; ok: number; failed: number }) => {
    setComparing(true);
    const byNo = new Map<string, any>();
    targetsRef.current.forEach((p) => byNo.set(String(p.customer_number).trim(), p));
    let existingAll = new Map<string, Map<string, string>>();
    let existingOk = true;
    try {
      existingAll = await fetchExistingDaily(targetsRef.current.map((p) => p.id));
    } catch (e) {
      console.error('일별상태 조회 실패:', e);
      existingOk = false;
      toast({ title: '오류', description: '기존 일별 상태를 불러오지 못해 입원정보 반영을 건너뜁니다.', variant: 'destructive' });
    }
    let pkgCtx: { kindMap: Map<string, any>; byPatient: Map<string, any[]> } | null = null;
    try {
      pkgCtx = await fetchPkgContext(targetsRef.current.map((p) => p.id));
    } catch (e) {
      console.error('패키지 기준 조회 실패:', e);
      toast({ title: '오류', description: '기존 패키지 거래를 불러오지 못해 패키지 반영을 건너뜁니다.', variant: 'destructive' });
    }
    let pIns = 0, pInsDeposit = 0, pLink = 0, pChg = 0, pOrphan = 0, pBal = 0, pkgFailed = 0;
    const unknownSet = new Map<string, string>();
    const today = localToday();
    const plans: Planned[] = [];
    const mismatch: string[] = [];
    const suffixDiff: string[] = [];
    const notInf: string[] = [];
    const ends: any[] = [];
    const outs: any[] = [];
    const unclear: string[] = [];
    let dRem = 0, unclearCnt = 0;
    let unchanged = 0, failed = 0, multiCnsl = 0, looked = 0, admsFailed = 0;
    let dIns = 0, dUpd = 0, dConf = 0;
    for (const rec of recordsRef.current) {
      looked++;
      if (!rec.ok) { failed++; continue; }
      const patient = byNo.get(String(rec.clntNo).trim());
      if (!patient) continue;
      if ((rec.cnsl?.count || 0) >= 2) multiCnsl++;
      if (!sameName(rec.base?.clntNm, patient.name)) {
        mismatch.push(`${patient.name} (CRM: ${rec.base?.clntNm || '-'})`);
        continue;
      }
      if (nameDiffersOnlyBySuffix(rec.base?.clntNm, patient.name)) {
        suffixDiff.push(`${patient.name} (CRM: ${rec.base?.clntNm})`);
      }
      const changes = diffPatient(patient, rec);
      let days: DailyDiff = EMPTY_DAYS;
      let admittedNow = false;
      if (rec.adms === null || rec.adms === undefined) {
        admsFailed++;
      } else if (existingOk) {
        const plan = buildAdmissionDays(rec.adms, today);
        if (patient.inflow_status !== '유입') {
          if (plan.hasRecentAdmission) notInf.push(patient.name);
        } else {
          admittedNow = plan.isAdmittedNow;
          days = diffDailyStatus(plan.days, existingAll.get(patient.id) || new Map(), today);
          dIns += days.inserts.length; dUpd += days.updates.length; dConf += days.conflicts.length;
          dRem += days.removals.length;
          if (plan.unclearRows.length) {
            unclearCnt += plan.unclearRows.length;
            unclear.push(`${patient.name}: ${plan.unclearRows.map((u) => `${mdLabel(u.admsDate)} 입원(${u.admsYn ? `상태 ${u.admsYn}` : '상태 없음'})`).join(', ')}`);
          }
          const newDischarge = [...days.inserts.map((x) => ({ date: x.date, t: x.type })), ...days.updates.map((x) => ({ date: x.date, t: x.to }))]
            .some((x) => x.t === '퇴원' && x.date === plan.lastDischargeDate);
          if (
            TREATMENT_END_DIAG.includes(patient.diagnosis_category) && newDischarge &&
            plan.lastDischargeDate && !plan.isAdmittedNow && patient.management_status !== '치료종료'
          ) ends.push(patient);
          if (plan.isAdmittedNow && (patient.management_status === '아웃' || patient.management_status === '아웃위기')) outs.push(patient);
        }
      }
      let pkg: PackagePlan | null = null;
      if (rec.pkg === null || rec.pkg === undefined) {
        pkgFailed++;
      } else if (pkgCtx) {
        pkg = buildPackagePlan(rec.pkg, pkgCtx.kindMap, pkgCtx.byPatient.get(patient.id) || [], patient);
        pIns += pkg.inserts.length;
        pInsDeposit += pkg.inserts.filter((x) => x.transaction_type === 'deposit_in').reduce((s, x) => s + x.amount, 0);
        pLink += pkg.links.length; pChg += pkg.changed.length; pOrphan += pkg.orphans.length;
        if (pkg.balanceMismatch) pBal++;
        pkg.unknownPkgs.forEach((u) => unknownSet.set(u.pkgCd, u.pkgNm || ''));
      }
      const hasField = Object.keys(changes).length > 0;
      const hasDays = days.inserts.length + days.updates.length + days.removals.length > 0;
      const hasPkg = pkgWork(pkg) > 0;
      const pkgNotice = !!pkg && (pkg.orphans.length > 0 || !!pkg.balanceMismatch);
      if (!hasField && !hasDays && !hasPkg) {
        unchanged++;
        if (days.conflicts.length || pkgNotice) plans.push({ patient, changes, days, admittedNow, pkg });
      } else plans.push({ patient, changes, days, admittedNow, pkg });
    }
    setPlanned(plans);
    setNameMismatch(mismatch);
    setNameSuffixDiff(suffixDiff);
    setNotInflow(notInf);
    setEndTargets(ends);
    setOutTargets(outs);
    setUnclearList(unclear);
    setUnknownPkgList(Array.from(unknownSet.entries()).map(([cd, nm]) => `${cd}${nm ? ` (${nm})` : ''}`));
    setSummary({
      pIns, pInsDeposit, pLink, pChg, pOrphan, pBal, pkgFailed, pUnknown: unknownSet.size,
      total: done.total ?? looked, planned: plans.filter((p) => Object.keys(p.changes).length || p.days.inserts.length || p.days.updates.length || p.days.removals.length || pkgWork(p.pkg)).length,
      dRem, unclear: unclearCnt,
      unchanged, mismatch: mismatch.length, failed, multiCnsl,
      dIns, dUpd, dConf, admsFailed, notInflow: notInf.length,
    });
    setComparing(false);
    setWaiting(false);
    logIdRef.current = null;
    void writeLog({
      status: 'previewed',
      target_count: done.total ?? looked,
      crm_failed: failed,
      name_mismatch: mismatch.length,
      field_patients: plans.filter((p) => Object.keys(p.changes).length > 0).length,
      day_inserts: dIns, day_updates: dUpd, day_removed: dRem,
      pkg_inserts: pIns, pkg_links: pLink, pkg_changes: pChg,
    });
  };

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== CRM_ORIGIN) return;
      const d = event.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'crm-bulk-chunk' && Array.isArray(d.records)) {
        recordsRef.current.push(...d.records);
      } else if (d.type === 'crm-bulk-done') {
        buildPreview(d);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const fieldCount = planned.filter((p) => Object.keys(p.changes).length > 0).length;
  const dayCount = planned.reduce((n, p) => n + p.days.inserts.length + p.days.updates.length, 0);
  const removeCount = planned.reduce((n, p) => n + p.days.removals.length, 0);
  const effRemove = doRemove ? removeCount : 0;
  const pkgCount = planned.reduce((n, p) => n + pkgWork(p.pkg), 0);
  const effPkg = doPkg ? pkgCount : 0;

  const apply = async () => {
    setApplying(true);
    let ok = 0, failed = 0, daysSaved = 0, daysFailed = 0, removed = 0, removeFailed = 0;
    let pIns = 0, pLink = 0, pChg = 0, pFail = 0;
    const classifyIds: string[] = [];
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    for (const { patient, changes } of planned) {
      if (Object.keys(changes).length === 0) continue;
      try {
        const { error } = await supabase.from('patients').update(changes).eq('id', patient.id);
        if (error) throw error;
        ok++;
        if ('counseling_content' in changes || 'treatment_memo_2' in changes) classifyIds.push(patient.id);
      } catch (e) {
        console.error('CRM 동기화 적용 실패:', patient.id, e);
        failed++;
      }
    }
    for (const { patient, days } of planned) {
      const rows = [
        ...days.inserts.map((x) => ({ date: x.date, type: x.type })),
        ...days.updates.map((x) => ({ date: x.date, type: x.to })),
      ].map((x) => ({
        patient_id: patient.id, status_date: x.date, status_type: x.type,
        created_by: userId, branch: currentBranch,
      }));
      if (rows.length === 0) continue;
      try {
        if (!userId) throw new Error('로그인 정보 없음');
        const { error } = await supabase.from('daily_patient_status').upsert(rows, { onConflict: 'patient_id,status_date' });
        if (error) throw error;
        daysSaved += rows.length;
      } catch (e) {
        console.error('일별상태 저장 실패:', patient.id, e);
        daysFailed++;
      }
    }
    if (doRemove) {
      for (const { patient, days } of planned) {
        const dates = days.removals.map((x) => x.date);
        if (dates.length === 0) continue;
        try {
          const { error } = await supabase
            .from('daily_patient_status')
            .delete()
            .eq('patient_id', patient.id)
            .in('status_date', dates)
            .in('status_type', ['입원', '재원', '퇴원']);
          if (error) throw error;
          removed += dates.length;
        } catch (e) {
          console.error('일별상태 정리 실패:', patient.id, e);
          removeFailed++;
        }
      }
    }
    const statusUpdates: { id: string; status: string }[] = [];
    if (doEnd) endTargets.forEach((p) => statusUpdates.push({ id: p.id, status: '치료종료' }));
    if (doOut) outTargets.forEach((p) => statusUpdates.push({ id: p.id, status: '관리 중' }));
    let statusOk = 0;
    for (const u of statusUpdates) {
      try {
        const { error } = await supabase.from('patients').update({ management_status: u.status }).eq('id', u.id);
        if (error) throw error;
        statusOk++;
      } catch (e) {
        console.error('관리상태 변경 실패:', u.id, e);
        failed++;
      }
    }
    if (doPkg) {
      for (const { patient, pkg } of planned) {
        if (!pkg || pkgWork(pkg) === 0) continue;
        try {
          const custNo = String(patient.customer_number || '').trim() || null;
          if (pkg.inserts.length) {
            const rows = pkg.inserts.map((t) => ({
              patient_id: patient.id, customer_number: custNo, branch: currentBranch,
              transaction_date: t.transaction_date, transaction_type: t.transaction_type,
              amount: t.amount, count: t.count, date_from: t.date_from, date_to: t.date_to,
              note: t.note, crm_act_no: t.crm_act_no, crm_pkg_cd: t.crm_pkg_cd,
            }));
            const { error } = await (supabase as any).from('package_transactions').insert(rows);
            if (error) throw error;
            pIns += rows.length;
          }
          for (const l of pkg.links) {
            const { error } = await (supabase as any).from('package_transactions')
              .update({ crm_act_no: l.crm_act_no, crm_pkg_cd: l.crm_pkg_cd }).eq('id', l.id);
            if (error) throw error;
            pLink++;
          }
          for (const c of pkg.changed) {
            const { error } = await (supabase as any).from('package_transactions').update({
              transaction_date: c.tx.transaction_date, amount: c.tx.amount, count: c.tx.count,
              date_from: c.tx.date_from, date_to: c.tx.date_to, note: c.tx.note,
            }).eq('id', c.id);
            if (error) throw error;
            pChg++;
          }
          // 기존 패키지 최신화(handlePackageDataReceived)와 동일한 합계 공식
          const { data: allTx, error: allErr } = await supabase
            .from('package_transactions').select('transaction_type, amount, count').eq('patient_id', patient.id);
          if (allErr) throw allErr;
          const sum = (t: string, f: 'amount' | 'count') =>
            (allTx || []).filter((x: any) => x.transaction_type === t).reduce((s: number, x: any) => s + x[f], 0);
          const depositTotal = sum('deposit_in', 'amount'), depositUsed = sum('deposit_out', 'amount');
          const rewardTotal = sum('reward_in', 'amount'), rewardUsed = sum('reward_out', 'amount');
          const countTotal = sum('count_in', 'count'), countUsed = sum('count_out', 'count');
          const paymentAmount = (allTx || [])
            .filter((x: any) => ['deposit_in', 'inpatient_revenue', 'outpatient_revenue'].includes(x.transaction_type))
            .reduce((s: number, x: any) => s + (x.amount || 0), 0);
          const { error: upErr } = await supabase.from('package_management').upsert({
            patient_id: patient.id, customer_number: custNo, branch: currentBranch,
            deposit_total: depositTotal, deposit_used: depositUsed, deposit_balance: depositTotal - depositUsed,
            reward_total: rewardTotal, reward_used: rewardUsed, reward_balance: rewardTotal - rewardUsed,
            count_total: countTotal, count_used: countUsed, count_balance: countTotal - countUsed,
            last_synced_at: new Date().toISOString(),
          }, { onConflict: 'patient_id' });
          if (upErr) throw upErr;
          const { error: payErr } = await supabase.from('patients').update({ payment_amount: paymentAmount }).eq('id', patient.id);
          if (payErr) throw payErr;
        } catch (e) {
          console.error('패키지 반영 실패:', patient.id, e);
          pFail++;
        }
      }
    }
    // 서버에서 AI 호출이 순차라 10명씩 백그라운드 순차 호출 (적용 흐름은 막지 않음)
    (async () => {
      for (let i = 0; i < classifyIds.length; i += 10) await callClassifyPatient(classifyIds.slice(i, i + 10));
    })();
    setApplyResult({ ok, failed, daysSaved, daysFailed, removed, removeFailed, pIns, pLink, pChg, pFail });
    // 일별 칸은 실제 저장 칸수(daysSaved)를 day_inserts 에 기록, day_updates 는 0
    void writeLog({
      status: 'applied', applied_at: new Date().toISOString(),
      field_patients: ok, day_inserts: daysSaved, day_updates: 0, day_removed: removed,
      pkg_inserts: pIns, pkg_links: pLink, pkg_changes: pChg,
      status_changes: statusOk,
      apply_failed: failed + daysFailed + removeFailed + pFail,
    });
    setApplying(false);
    onApplied?.();
    toast({ title: 'CRM 동기화 적용 완료', description: `성공 ${ok}명 · 실패 ${failed}명 · 일별상태 저장 ${daysSaved}칸 · 실패 ${daysFailed}명 · 정리 ${removed}칸 · 패키지 추가 ${pIns}건 · 연결 ${pLink}건 · 변경 ${pChg}건 · 실패 ${pFail}명` });
  };

  const daysLine = (days: DailyDiff) => {
    const all = [
      ...days.inserts.map((x) => ({ date: x.date, t: x.type })),
      ...days.updates.map((x) => ({ date: x.date, t: x.to })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    if (all.length === 0) return null;
    const f = all[0], l = all[all.length - 1];
    const range = f.date === l.date ? `${mdLabel(f.date)} ${f.t}` : `${mdLabel(f.date)} ${f.t} ~ ${mdLabel(l.date)} ${l.t}`;
    const parts: string[] = [];
    if (days.inserts.length) parts.push(`추가 ${days.inserts.length}칸`);
    parts[0] = (parts[0] ? parts[0] : `수정 ${days.updates.length}칸`) + `(${range})`;
    if (days.inserts.length && days.updates.length) parts.push(`수정 ${days.updates.length}칸`);
    return `일별상태: ${parts.join(', ')}`;
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={start} className="gap-1.5 whitespace-nowrap">
        <RefreshCw className="h-4 w-4" />
        CRM 일괄 동기화
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setWaiting(false); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CRM 일괄 동기화</DialogTitle>
          </DialogHeader>
          {comparing && (
            <div className="py-8 text-center text-sm text-muted-foreground">입원기록·패키지 비교 중...</div>
          )}
          {waiting && !comparing && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              CRM 창에서 북마크를 눌러주세요. 조회가 끝나면 변경 예정 내용이 여기에 표시됩니다.
            </div>
          )}
          {summary && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded border p-2">조회 <b>{summary.total}</b></div>
                <div className="rounded border p-2">변경 예정 <b className="text-primary">{summary.planned}명</b></div>
                <div className="rounded border p-2">변경 없음 <b>{summary.unchanged}</b></div>
                <div className="rounded border p-2">이름 불일치 <b className="text-destructive">{summary.mismatch}</b></div>
                <div className="rounded border p-2">CRM 조회 실패 <b>{summary.failed}</b></div>
                <div className="rounded border p-2">상담기록 2건 이상 <b>{summary.multiCnsl}명</b> <span className="text-xs text-muted-foreground">(상담내용은 기존 유지)</span></div>
                <div className="rounded border p-2">일별상태 추가 <b className="text-primary">{summary.dIns}칸</b></div>
                <div className="rounded border p-2">일별상태 수정 <b className="text-primary">{summary.dUpd}칸</b></div>
                <div className="rounded border p-2">충돌(변경 안 함) <b>{summary.dConf}칸</b></div>
                <div className="rounded border p-2">입원정보 조회 실패 <b>{summary.admsFailed}명</b></div>
                <div className="rounded border p-2">유입 아닌데 입원기록 있음 <b>{summary.notInflow}명</b></div>
                <div className="rounded border p-2">CRM에 없는 입원·재원·퇴원 <b>{summary.dRem}칸</b></div>
                <div className="rounded border p-2">입원상태 빈 기록 <b>{summary.unclear}건</b> <span className="text-xs text-muted-foreground">(반영 안 함)</span></div>
                <div className="rounded border p-2">패키지 거래 추가 <b className="text-primary">{summary.pIns}건</b> <span className="text-xs text-muted-foreground">(예치금 입금 {won(summary.pInsDeposit)})</span></div>
                <div className="rounded border p-2">기존 거래 CRM번호 연결 <b>{summary.pLink}건</b></div>
                <div className="rounded border p-2">패키지 거래 변경 <b className="text-primary">{summary.pChg}건</b></div>
                <div className="rounded border p-2">CRM에 없는 기존 거래 <b>{summary.pOrphan}건</b> <span className="text-xs text-muted-foreground">(유지)</span></div>
                <div className="rounded border p-2">종류 미정 패키지 <b>{summary.pUnknown}종</b> <span className="text-xs text-muted-foreground">(건너뜀)</span></div>
                <div className="rounded border p-2">패키지 잔액 불일치 <b className="text-destructive">{summary.pBal}명</b></div>
                <div className="rounded border p-2">패키지 조회 실패 <b>{summary.pkgFailed}명</b></div>
              </div>

              {summary.pOrphan > 0 && (
                <details className="rounded border p-2">
                  <summary className="cursor-pointer font-medium">CRM에 없는 기존 거래 ({summary.pOrphan}건) — 삭제하지 않고 유지</summary>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {planned.filter((p) => p.pkg?.orphans.length).flatMap(({ patient, pkg }) => pkg!.orphans.map((o) => (
                      <li key={o.id}>{patient.name}: {String(o.transaction_date).slice(0, 10)} {TX_LABEL[o.transaction_type] || o.transaction_type} {o.transaction_type.startsWith('count') ? `${o.count}회` : won(o.amount)}{o.note ? ` — ${o.note}` : ''}</li>
                    )))}
                  </ul>
                </details>
              )}

              {unknownPkgList.length > 0 && (
                <details className="rounded border p-2">
                  <summary className="cursor-pointer font-medium">종류 미정 패키지 ({unknownPkgList.length}종) — 건너뜀</summary>
                  <div className="text-xs text-muted-foreground mt-1">{unknownPkgList.join(', ')}</div>
                </details>
              )}

              {summary.pBal > 0 && (
                <details className="rounded border p-2">
                  <summary className="cursor-pointer font-medium">패키지 잔액 불일치 ({summary.pBal}명)</summary>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {planned.filter((p) => p.pkg?.balanceMismatch).map(({ patient, pkg }) => (
                      <li key={patient.id}>{patient.name}: {balLine(pkg!)}</li>
                    ))}
                  </ul>
                </details>
              )}

              {notInflow.length > 0 && (
                <details className="rounded border p-2">
                  <summary className="cursor-pointer font-medium">유입 아닌데 입원기록 있음 ({notInflow.length}명) — 일별상태 반영 안 함</summary>
                  <div className="text-xs text-muted-foreground mt-1">{notInflow.join(', ')}</div>
                </details>
              )}

              {summary.dConf > 0 && (
                <details className="rounded border p-2">
                  <summary className="cursor-pointer font-medium">충돌 목록 ({summary.dConf}칸) — 기존 값 유지</summary>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {planned.filter((p) => p.days.conflicts.length).map(({ patient, days }) => (
                      <li key={patient.id}>{patient.name}: {days.conflicts.map((c) => `${mdLabel(c.date)} ${c.existing}(CRM ${c.crm})`).join(', ')}</li>
                    ))}
                  </ul>
                </details>
              )}

              {removeCount > 0 && (
                <details className="rounded border p-2">
                  <summary className="cursor-pointer font-medium">정리 대상 ({removeCount}칸) — CRM 입원기록에 없는 날</summary>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {planned.filter((p) => p.days.removals.length).map(({ patient, days }) => (
                      <li key={patient.id}>{patient.name}: {groupRuns(days.removals).join(', ')}</li>
                    ))}
                  </ul>
                </details>
              )}

              {unclearList.length > 0 && (
                <details className="rounded border p-2">
                  <summary className="cursor-pointer font-medium">입원상태 빈 기록 ({summary.unclear}건) — 반영 안 함</summary>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {unclearList.map((u, i) => <li key={i}>{u}</li>)}
                  </ul>
                </details>
              )}

              {(endTargets.length > 0 || outTargets.length > 0 || removeCount > 0 || pkgCount > 0) && !applyResult && (
                <div className="rounded border p-2 space-y-2">
                  {pkgCount > 0 && (
                    <label className="flex items-start gap-2">
                      <Checkbox checked={doPkg} onCheckedChange={(v) => setDoPkg(v === true)} className="mt-0.5" />
                      <span>
                        <span className="font-medium">패키지 거래 반영 ({pkgCount}건)</span>
                        <span className="block text-xs text-muted-foreground">추가 {summary.pIns}건 · CRM번호 연결 {summary.pLink}건 · 변경 {summary.pChg}건. CRM에 없는 기존 거래는 지우지 않습니다.</span>
                      </span>
                    </label>
                  )}
                  {endTargets.length > 0 && (
                    <label className="flex items-start gap-2">
                      <Checkbox checked={doEnd} onCheckedChange={(v) => setDoEnd(v === true)} className="mt-0.5" />
                      <span>
                        <span className="font-medium">치료종료 처리 ({endTargets.length}명)</span>
                        <span className="block text-xs text-muted-foreground">단기치료 진단 + 마지막 입원 퇴원: {endTargets.map((p) => p.name).join(', ')}</span>
                      </span>
                    </label>
                  )}
                  {outTargets.length > 0 && (
                    <label className="flex items-start gap-2">
                      <Checkbox checked={doOut} onCheckedChange={(v) => setDoOut(v === true)} className="mt-0.5" />
                      <span>
                        <span className="font-medium">현재 입원 중인데 아웃/아웃위기 → 관리 중 ({outTargets.length}명)</span>
                        <span className="block text-xs text-muted-foreground">{outTargets.map((p) => `${p.name}(${p.management_status})`).join(', ')}</span>
                      </span>
                    </label>
                  )}
                  {removeCount > 0 && (
                    <label className="flex items-start gap-2">
                      <Checkbox checked={doRemove} onCheckedChange={(v) => setDoRemove(v === true)} className="mt-0.5" />
                      <span>
                        <span className="font-medium">CRM 입원기록에 없는 날의 입원·재원·퇴원 {removeCount}칸 정리(삭제)</span>
                        <span className="block text-xs text-muted-foreground">CRM에서 퇴원한 뒤에도 남아 있던 재원 등을 지웁니다. 외래·기타 등은 지우지 않습니다.</span>
                      </span>
                    </label>
                  )}
                </div>
              )}

              {nameSuffixDiff.length > 0 && (
                <div className="rounded border bg-muted p-2 text-muted-foreground">
                  <div className="font-medium mb-1">이름 끝 숫자만 다름 ({nameSuffixDiff.length}명) — 같은 환자로 보고 반영</div>
                  <div className="text-xs">{nameSuffixDiff.join(', ')}</div>
                </div>
              )}

              {nameMismatch.length > 0 && (
                <div className="rounded border border-destructive/40 p-2">
                  <div className="font-medium mb-1">이름 불일치 (변경하지 않음)</div>
                  <div className="text-xs text-muted-foreground">{nameMismatch.join(', ')}</div>
                </div>
              )}

              {planned.length > 0 && (
                <div className="rounded border divide-y max-h-[40vh] overflow-y-auto">
                  {planned.filter((p) => Object.keys(p.changes).length || p.days.inserts.length || p.days.updates.length || p.days.conflicts.length || p.days.removals.length || pkgWork(p.pkg) || p.pkg?.balanceMismatch).map(({ patient, changes, days, pkg }) => (
                    <div key={patient.id} className="p-2">
                      <div className="font-medium">{patient.name}</div>
                      <ul className="text-xs text-muted-foreground list-disc ml-4">
                        {Object.entries(changes).map(([k, v]) => (
                          <li key={k}>{describeChange(k, patient[k], v)}</li>
                        ))}
                        {daysLine(days) && <li>{daysLine(days)}</li>}
                        {pkg && pkgLine(pkg) && <li>{pkgLine(pkg)}</li>}
                        {pkg && balLine(pkg) && <li className="text-destructive">{balLine(pkg)}</li>}
                        {days.removals.length > 0 && (() => {
                          const runs = groupRuns(days.removals);
                          return <li>정리 후보: {runs.slice(0, 3).join(', ')}{runs.length > 3 ? ` 외 ${runs.length - 3}구간` : ''}</li>;
                        })()}
                        {days.conflicts.length > 0 && (
                          <li>충돌: {days.conflicts.slice(0, 5).map((c) => `${mdLabel(c.date)} ${c.existing}(CRM ${c.crm})`).join(', ')}{days.conflicts.length > 5 ? ` 외 ${days.conflicts.length - 5}칸` : ''}</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {applyResult ? (
                <div className="text-sm">적용 결과: 성공 {applyResult.ok}명 · 실패 {applyResult.failed}명 · 일별상태 저장 {applyResult.daysSaved}칸 · 실패 {applyResult.daysFailed}명 · 정리 {applyResult.removed}칸{applyResult.removeFailed ? ` (정리 실패 ${applyResult.removeFailed}명)` : ''} · 패키지 추가 {applyResult.pIns}건 · 연결 {applyResult.pLink}건 · 변경 {applyResult.pChg}건 · 실패 {applyResult.pFail}명</div>
              ) : (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                  <Button onClick={apply} disabled={applying || (fieldCount === 0 && dayCount === 0 && effRemove === 0 && effPkg === 0)}>
                    {applying ? '적용 중...' : `적용 (환자 ${fieldCount}명 · 일별 ${dayCount}칸${doRemove && removeCount > 0 ? ` · 정리 ${removeCount}칸` : ''}${effPkg > 0 ? ` · 패키지 ${effPkg}건` : ''})`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
