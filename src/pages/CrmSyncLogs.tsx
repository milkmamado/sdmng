// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const pad = (n: number) => String(n).padStart(2, '0');
// 로컬(KST) 날짜 문자열 yyyy-MM-dd
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localDateTime = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${localDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const daysBetween = (from: string, to: string) => {
  const [a, b] = [from, to].map((s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); });
  return Math.round((b - a) / 86400000);
};
const daysAgoStr = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return localDate(d); };

export default function CrmSyncLogs() {
  const { currentBranch } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7' | '30' | 'all'>('30');
  const [userFilter, setUserFilter] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const db = supabase as any;
      const { data: logRows, error } = await fetchAllRows<any>((from, to) =>
        db.from('crm_sync_logs').select('*').order('started_at', { ascending: false }).order('id').range(from, to));
      if (error) console.warn('CRM 동기화 기록 조회 실패:', error);
      setLogs(logRows || []);

      let rq = db.from('user_roles').select('user_id, role, branch').eq('approval_status', 'approved').in('role', ['manager', 'master']);
      if (currentBranch) rq = rq.eq('branch', currentBranch);
      const { data: roles } = await rq;
      const ids = (roles || []).map((r: any) => r.user_id);
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await db.from('profiles').select('id, name').in('id', ids);
        (profs || []).forEach((p: any) => { names[p.id] = p.name; });
      }
      setStaff((roles || []).map((r: any) => ({ id: r.user_id, name: names[r.user_id] || '(이름 없음)', role: r.role }))
        .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'manager' ? -1 : 1)));
      setLoading(false);
    })();
  }, [currentBranch]);

  const today = localDate(new Date());

  const cards = useMemo(() => staff.map((s) => {
    const applied = logs.filter((l) => l.user_id === s.id && l.status === 'applied');
    const last = applied.map((l) => l.applied_at || l.started_at).sort().reverse()[0] || null;
    const lastDay = last ? localDate(new Date(last)) : null;
    const since = (n: number) => applied.filter((l) => localDate(new Date(l.applied_at || l.started_at)) >= daysAgoStr(n - 1)).length;
    return { ...s, last, elapsed: lastDay ? daysBetween(lastDay, today) : null, c7: since(7), c30: since(30) };
  }), [staff, logs, today]);

  const users = useMemo(() => {
    const m = new Map<string, string>();
    logs.forEach((l) => m.set(l.user_id, l.user_name || '(이름 없음)'));
    return Array.from(m.entries());
  }, [logs]);

  const filtered = logs.filter((l) => {
    if (userFilter !== 'all' && l.user_id !== userFilter) return false;
    if (period !== 'all' && localDate(new Date(l.started_at)) < daysAgoStr(Number(period) - 1)) return false;
    return true;
  });

  const elapsedCls = (e: number | null) =>
    e === null ? 'bg-muted text-muted-foreground' : e === 0 ? 'bg-green-100 text-green-800' : e === 1 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800';

  const n = (v: any) => (v ?? 0);

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">CRM 동기화 기록</h1>
        <p className="text-sm text-muted-foreground">실장별 마지막 동기화 일시와 적용 내역을 확인합니다.</p>
      </div>

      {loading ? <p className="text-muted-foreground">불러오는 중...</p> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{c.name}{c.role === 'master' && <span className="ml-1 text-xs text-muted-foreground">(마스터)</span>}</span>
                    <span className={`text-xs rounded px-2 py-0.5 ${elapsedCls(c.elapsed)}`}>
                      {c.elapsed === null ? '기록 없음' : `${c.elapsed}일 전`}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div>마지막 적용: <b>{localDateTime(c.last)}</b></div>
                  <div className="text-muted-foreground">최근 7일 {c.c7}회 · 최근 30일 {c.c30}회</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">기록 ({filtered.length}건)</CardTitle>
              <div className="flex gap-2">
                <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">최근 7일</SelectItem>
                    <SelectItem value="30">최근 30일</SelectItem>
                    <SelectItem value="all">전체</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 실행자</SelectItem>
                    {users.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>일시</TableHead><TableHead>실행자</TableHead><TableHead>상태</TableHead>
                    <TableHead className="text-right">대상 환자</TableHead><TableHead className="text-right">기본정보 변경</TableHead>
                    <TableHead className="text-right">일별 추가·수정·정리</TableHead><TableHead className="text-right">패키지 추가·연결·변경</TableHead>
                    <TableHead className="text-right">관리상태 변경</TableHead><TableHead className="text-right">실패</TableHead>
                    <TableHead className="text-right">이름불일치</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">기록이 없습니다.</TableCell></TableRow>
                  )}
                  {filtered.map((l) => {
                    const applied = l.status === 'applied';
                    return (
                      <TableRow key={l.id} className={applied ? '' : 'opacity-50'}>
                        <TableCell className="whitespace-nowrap">{localDateTime(l.started_at)}</TableCell>
                        <TableCell>{l.user_name || '-'}</TableCell>
                        <TableCell>{applied ? <Badge>적용</Badge> : <Badge variant="outline">미리보기만</Badge>}</TableCell>
                        <TableCell className="text-right">{n(l.target_count)}</TableCell>
                        <TableCell className="text-right">{n(l.field_patients)}</TableCell>
                        <TableCell className="text-right">{n(l.day_inserts)}·{n(l.day_updates)}·{n(l.day_removed)}</TableCell>
                        <TableCell className="text-right">{n(l.pkg_inserts)}·{n(l.pkg_links)}·{n(l.pkg_changes)}</TableCell>
                        <TableCell className="text-right">{applied ? n(l.status_changes) : '-'}</TableCell>
                        <TableCell className="text-right">{n(l.crm_failed) + n(l.apply_failed)}</TableCell>
                        <TableCell className="text-right">{n(l.name_mismatch)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-2">적용 행의 일별 칸은 실제 저장된 칸수(추가·수정 합계)로 표시합니다. 실패 = CRM 조회 실패 + 적용 실패.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
