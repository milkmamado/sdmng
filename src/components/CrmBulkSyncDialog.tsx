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
} from '@/lib/crmSync';

const SELECT_COLS =
  'id, name, customer_number, assigned_manager, phone, age, special_note_1, special_note_2, treatment_memo_1, treatment_memo_2, first_visit_date, last_visit_date, counseling_content';

interface Planned { patient: any; changes: Record<string, any> }

export function CrmBulkSyncDialog({ onApplied }: { onApplied?: () => void }) {
  const { toast } = useToast();
  const { applyBranchFilter } = useBranchFilter();
  const { canEditManager } = useCrossView();
  const [open, setOpen] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [planned, setPlanned] = useState<Planned[]>([]);
  const [nameMismatch, setNameMismatch] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: number; failed: number } | null>(null);
  const recordsRef = useRef<CrmRecord[]>([]);
  const targetsRef = useRef<any[]>([]);

  const reset = () => {
    setSummary(null); setPlanned([]); setNameMismatch([]); setApplyResult(null);
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

  const buildPreview = (done: { total: number; ok: number; failed: number }) => {
    const byNo = new Map<string, any>();
    targetsRef.current.forEach((p) => byNo.set(String(p.customer_number).trim(), p));
    const plans: Planned[] = [];
    const mismatch: string[] = [];
    let unchanged = 0, failed = 0, multiCnsl = 0, looked = 0;
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
      if (Object.keys(changes).length === 0) unchanged++;
      else plans.push({ patient, changes });
    }
    setPlanned(plans);
    setNameMismatch(mismatch);
    setSummary({ total: done.total ?? looked, planned: plans.length, unchanged, mismatch: mismatch.length, failed, multiCnsl });
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

  const apply = async () => {
    setApplying(true);
    let ok = 0, failed = 0;
    const classifyIds: string[] = [];
    for (const { patient, changes } of planned) {
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
    for (let i = 0; i < classifyIds.length; i += 50) callClassifyPatient(classifyIds.slice(i, i + 50));
    setApplyResult({ ok, failed });
    setApplying(false);
    onApplied?.();
    toast({ title: 'CRM 동기화 적용 완료', description: `성공 ${ok}명 · 실패 ${failed}명` });
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
          {waiting && (
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
                <div className="rounded border p-2">상담기록 2건 이상 <b>{summary.multiCnsl}명</b></div>
              </div>

              {nameMismatch.length > 0 && (
                <div className="rounded border border-destructive/40 p-2">
                  <div className="font-medium mb-1">이름 불일치 (변경하지 않음)</div>
                  <div className="text-xs text-muted-foreground">{nameMismatch.join(', ')}</div>
                </div>
              )}

              {planned.length > 0 && (
                <div className="rounded border divide-y max-h-[40vh] overflow-y-auto">
                  {planned.map(({ patient, changes }) => (
                    <div key={patient.id} className="p-2">
                      <div className="font-medium">{patient.name}</div>
                      <ul className="text-xs text-muted-foreground list-disc ml-4">
                        {Object.entries(changes).map(([k, v]) => (
                          <li key={k}>{describeChange(k, patient[k], v)}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {applyResult ? (
                <div className="text-sm">적용 결과: 성공 {applyResult.ok}명 · 실패 {applyResult.failed}명</div>
              ) : (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                  <Button onClick={apply} disabled={applying || planned.length === 0}>
                    {applying ? '적용 중...' : `적용 (${planned.length}명)`}
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
