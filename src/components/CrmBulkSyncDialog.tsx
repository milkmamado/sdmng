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
  CRM_ORIGIN, CRM_MAIN_URL, CrmRecord, diffPatient, describeChange, normalizeName, encodeHashPayload,
  ADMS_SYNC_START, buildAdmissionDays, diffDailyStatus, localToday, mdLabel, DailyDiff,
} from '@/lib/crmSync';
import { Checkbox } from '@/components/ui/checkbox';

const SELECT_COLS =
  'id, name, customer_number, assigned_manager, phone, age, special_note_1, special_note_2, treatment_memo_1, treatment_memo_2, first_visit_date, last_visit_date, counseling_content, inflow_status, management_status, diagnosis_category';

const TREATMENT_END_DIAG = ['부인과 수술 후 회복', '척추질환', '척추관절'];

interface Planned { patient: any; changes: Record<string, any>; days: DailyDiff; admittedNow: boolean }
const EMPTY_DAYS: DailyDiff = { inserts: [], updates: [], conflicts: [] };

export function CrmBulkSyncDialog({ onApplied }: { onApplied?: () => void }) {
  const { toast } = useToast();
  const { applyBranchFilter, currentBranch } = useBranchFilter();
  const { canEditManager } = useCrossView();
  const [open, setOpen] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [planned, setPlanned] = useState<Planned[]>([]);
  const [nameMismatch, setNameMismatch] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: number; failed: number; daysSaved: number; daysFailed: number } | null>(null);
  const [comparing, setComparing] = useState(false);
  const [notInflow, setNotInflow] = useState<string[]>([]);
  const [endTargets, setEndTargets] = useState<any[]>([]);
  const [outTargets, setOutTargets] = useState<any[]>([]);
  const [doEnd, setDoEnd] = useState(false);
  const [doOut, setDoOut] = useState(true);
  const recordsRef = useRef<CrmRecord[]>([]);
  const targetsRef = useRef<any[]>([]);

  const reset = () => {
    setSummary(null); setPlanned([]); setNameMismatch([]); setApplyResult(null);
    setNotInflow([]); setEndTargets([]); setOutTargets([]); setDoEnd(false); setDoOut(true);
    recordsRef.current = [];
  };

  const start = async () => {
    reset();
    let query = supabase.from('patients').select(SELECT_COLS).not('customer_number', 'is', null);
    query = applyBranchFilter(query);
    const { data, error } = await query;
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
    const today = localToday();
    const plans: Planned[] = [];
    const mismatch: string[] = [];
    const notInf: string[] = [];
    const ends: any[] = [];
    const outs: any[] = [];
    let unchanged = 0, failed = 0, multiCnsl = 0, looked = 0, admsFailed = 0;
    let dIns = 0, dUpd = 0, dConf = 0;
    for (const rec of recordsRef.current) {
      looked++;
      if (!rec.ok) { failed++; continue; }
      const patient = byNo.get(String(rec.clntNo).trim());
      if (!patient) continue;
      if ((rec.cnsl?.count || 0) >= 2) multiCnsl++;
      if (normalizeName(rec.base?.clntNm) !== normalizeName(patient.name)) {
        mismatch.push(`${patient.name} (CRM: ${rec.base?.clntNm || '-'})`);
        continue;
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
          days = diffDailyStatus(plan.days, existingAll.get(patient.id) || new Map());
          dIns += days.inserts.length; dUpd += days.updates.length; dConf += days.conflicts.length;
          const newDischarge = [...days.inserts.map((x) => ({ date: x.date, t: x.type })), ...days.updates.map((x) => ({ date: x.date, t: x.to }))]
            .some((x) => x.t === '퇴원' && x.date === plan.lastDischargeDate);
          if (
            TREATMENT_END_DIAG.includes(patient.diagnosis_category) && newDischarge &&
            plan.lastDischargeDate && !plan.isAdmittedNow && patient.management_status !== '치료종료'
          ) ends.push(patient);
          if (plan.isAdmittedNow && (patient.management_status === '아웃' || patient.management_status === '아웃위기')) outs.push(patient);
        }
      }
      const hasField = Object.keys(changes).length > 0;
      const hasDays = days.inserts.length + days.updates.length > 0;
      if (!hasField && !hasDays) {
        unchanged++;
        if (days.conflicts.length) plans.push({ patient, changes, days, admittedNow });
      } else plans.push({ patient, changes, days, admittedNow });
    }
    setPlanned(plans);
    setNameMismatch(mismatch);
    setNotInflow(notInf);
    setEndTargets(ends);
    setOutTargets(outs);
    setSummary({
      total: done.total ?? looked, planned: plans.filter((p) => Object.keys(p.changes).length || p.days.inserts.length || p.days.updates.length).length,
      unchanged, mismatch: mismatch.length, failed, multiCnsl,
      dIns, dUpd, dConf, admsFailed, notInflow: notInf.length,
    });
    setComparing(false);
    setWaiting(false);
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

  const apply = async () => {
    setApplying(true);
    let ok = 0, failed = 0, daysSaved = 0, daysFailed = 0;
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
    const statusUpdates: { id: string; status: string }[] = [];
    if (doEnd) endTargets.forEach((p) => statusUpdates.push({ id: p.id, status: '치료종료' }));
    if (doOut) outTargets.forEach((p) => statusUpdates.push({ id: p.id, status: '관리 중' }));
    for (const u of statusUpdates) {
      try {
        const { error } = await supabase.from('patients').update({ management_status: u.status }).eq('id', u.id);
        if (error) throw error;
      } catch (e) {
        console.error('관리상태 변경 실패:', u.id, e);
        failed++;
      }
    }
    for (let i = 0; i < classifyIds.length; i += 50) callClassifyPatient(classifyIds.slice(i, i + 50));
    setApplyResult({ ok, failed, daysSaved, daysFailed });
    setApplying(false);
    onApplied?.();
    toast({ title: 'CRM 동기화 적용 완료', description: `성공 ${ok}명 · 실패 ${failed}명 · 일별상태 저장 ${daysSaved}칸 · 실패 ${daysFailed}명` });
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
            <div className="py-8 text-center text-sm text-muted-foreground">입원기록 비교 중...</div>
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
              </div>

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

              {(endTargets.length > 0 || outTargets.length > 0) && !applyResult && (
                <div className="rounded border p-2 space-y-2">
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
                  {planned.filter((p) => Object.keys(p.changes).length || p.days.inserts.length || p.days.updates.length || p.days.conflicts.length).map(({ patient, changes, days }) => (
                    <div key={patient.id} className="p-2">
                      <div className="font-medium">{patient.name}</div>
                      <ul className="text-xs text-muted-foreground list-disc ml-4">
                        {Object.entries(changes).map(([k, v]) => (
                          <li key={k}>{describeChange(k, patient[k], v)}</li>
                        ))}
                        {daysLine(days) && <li>{daysLine(days)}</li>}
                        {days.conflicts.length > 0 && (
                          <li>충돌: {days.conflicts.slice(0, 5).map((c) => `${mdLabel(c.date)} ${c.existing}(CRM ${c.crm})`).join(', ')}{days.conflicts.length > 5 ? ` 외 ${days.conflicts.length - 5}칸` : ''}</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {applyResult ? (
                <div className="text-sm">적용 결과: 성공 {applyResult.ok}명 · 실패 {applyResult.failed}명 · 일별상태 저장 {applyResult.daysSaved}칸 · 실패 {applyResult.daysFailed}명</div>
              ) : (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                  <Button onClick={apply} disabled={applying || (fieldCount === 0 && dayCount === 0)}>
                    {applying ? '적용 중...' : `적용 (환자 ${fieldCount}명 · 일별 ${dayCount}칸)`}
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
