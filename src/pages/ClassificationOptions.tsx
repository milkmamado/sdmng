// @ts-nocheck
// 마스터 전용: 진단명·이전병원 옵션 목록 관리 + 미분류 원문 연결 + 전체 재분류
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { callClassifyPatient } from '@/lib/classifyPatient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ListTree, Plus, RefreshCw, Trash2, Link2 } from 'lucide-react';

interface OptionRow {
  id: string;
  name: string;
  parent_id: string | null;
  aliases: string[];
  sort_order: number | null;
}

type Kind = 'diagnosis' | 'hospital';

export default function ClassificationOptions() {
  const { branch } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [dxOptions, setDxOptions] = useState<OptionRow[]>([]);
  const [hsOptions, setHsOptions] = useState<OptionRow[]>([]);
  // 각 옵션을 쓰는 환자 수 (삭제 가능 여부 판단용)
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  // 미분류 원문 (needs_review 환자들의 raw)
  const [unclassified, setUnclassified] = useState<{ raw: string; kind: Kind; count: number; patientIds: string[] }[]>([]);
  const [loading, setLoading] = useState(true);

  // 재분류 진행 상태
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassProgress, setReclassProgress] = useState({ done: 0, total: 0 });

  const table = (kind: Kind) => (kind === 'diagnosis' ? 'diagnosis_options' : 'hospital_options');

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: dx }, { data: hs }, { data: patients }] = await Promise.all([
      supabase.from('diagnosis_options').select('id, name, parent_id, aliases, sort_order').order('sort_order', { ascending: true }),
      supabase.from('hospital_options').select('id, name, parent_id, aliases, sort_order').order('sort_order', { ascending: true }),
      supabase
        .from('patients')
        .select('id, diagnosis_category, diagnosis_detail, hospital_category, hospital_branch, diagnosis_raw, hospital_raw, diagnosis_needs_review, hospital_needs_review')
        .eq('branch', branch),
    ]);
    if (dx) setDxOptions(dx);
    if (hs) setHsOptions(hs);

    if (patients) {
      // 사용 환자 수 집계 (옵션 이름 기준)
      const counts: Record<string, number> = {};
      const rawMap = new Map<string, { kind: Kind; count: number; patientIds: string[] }>();
      for (const p of patients) {
        if (p.diagnosis_category) counts[`dx:${p.diagnosis_category}`] = (counts[`dx:${p.diagnosis_category}`] || 0) + 1;
        if (p.diagnosis_detail) counts[`dxd:${p.diagnosis_detail}`] = (counts[`dxd:${p.diagnosis_detail}`] || 0) + 1;
        if (p.hospital_category) counts[`hs:${p.hospital_category}`] = (counts[`hs:${p.hospital_category}`] || 0) + 1;
        if (p.hospital_branch) counts[`hsb:${p.hospital_branch}`] = (counts[`hsb:${p.hospital_branch}`] || 0) + 1;

        if (p.diagnosis_needs_review && p.diagnosis_raw) {
          const key = `diagnosis:${p.diagnosis_raw}`;
          const entry = rawMap.get(key) || { kind: 'diagnosis' as Kind, count: 0, patientIds: [] };
          entry.count += 1;
          entry.patientIds.push(p.id);
          rawMap.set(key, entry);
        }
        if (p.hospital_needs_review && p.hospital_raw) {
          const key = `hospital:${p.hospital_raw}`;
          const entry = rawMap.get(key) || { kind: 'hospital' as Kind, count: 0, patientIds: [] };
          entry.count += 1;
          entry.patientIds.push(p.id);
          rawMap.set(key, entry);
        }
      }
      setUsageCounts(counts);
      setUnclassified(
        Array.from(rawMap.entries())
          .map(([key, v]) => ({ raw: key.split(':').slice(1).join(':'), ...v }))
          .sort((a, b) => b.count - a.count),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [branch]);

  // ── 옵션 편집 ──────────────────────────────────────────────
  const updateOption = async (kind: Kind, id: string, patch: Partial<OptionRow>) => {
    const { error } = await supabase.from(table(kind)).update(patch).eq('id', id);
    if (error) {
      toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
      return;
    }
    fetchAll();
  };

  const addOption = async (kind: Kind, parentId: string | null, name: string, aliases: string) => {
    if (!name.trim()) return;
    const { error } = await supabase.from(table(kind)).insert({
      name: name.trim(),
      parent_id: parentId,
      aliases: aliases.split(',').map((a) => a.trim()).filter(Boolean),
      created_by: user?.id,
    });
    if (error) {
      toast({ title: '추가 실패', description: error.message, variant: 'destructive' });
      return;
    }
    fetchAll();
  };

  const deleteOption = async (kind: Kind, opt: OptionRow, usedCount: number) => {
    if (usedCount > 0) return; // 사용 중이면 삭제 불가
    const { error } = await supabase.from(table(kind)).delete().eq('id', opt.id);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '삭제 완료', description: `"${opt.name}"을 삭제했습니다.` });
    fetchAll();
  };

  // ── 미분류 원문을 옵션에 연결 ───────────────────────────────
  const linkRawToOption = async (raw: string, kind: Kind, optionId: string, patientIds: string[]) => {
    const options = kind === 'diagnosis' ? dxOptions : hsOptions;
    const opt = options.find((o) => o.id === optionId);
    if (!opt) return;
    const newAliases = Array.from(new Set([...(opt.aliases || []), raw]));
    const { error } = await supabase.from(table(kind)).update({ aliases: newAliases }).eq('id', optionId);
    if (error) {
      toast({ title: '연결 실패', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '연결 완료', description: `"${raw}" → "${opt.name}" 별칭 추가. 해당 환자 재분류를 시작합니다.` });
    // 해당 원문을 가진 환자들 재분류 (fire-and-forget)
    callClassifyPatient(patientIds);
    fetchAll();
  };

  // ── 전체 재분류 ─────────────────────────────────────────────
  const reclassifyAll = async () => {
    setReclassifying(true);
    try {
      const { data: targets, error } = await supabase
        .from('patients')
        .select('id')
        .eq('branch', branch)
        .not('counseling_content', 'is', null)
        .neq('counseling_content', '')
        .or('diagnosis_source.neq.manual,diagnosis_source.is.null')
        .or('hospital_source.neq.manual,hospital_source.is.null');
      if (error) throw error;
      const ids = (targets || []).map((t) => t.id);
      setReclassProgress({ done: 0, total: ids.length });
      for (let i = 0; i < ids.length; i += 10) {
        await callClassifyPatient(ids.slice(i, i + 10));
        setReclassProgress({ done: Math.min(i + 10, ids.length), total: ids.length });
      }
      toast({ title: '재분류 완료', description: `${ids.length}명 처리를 요청했습니다.` });
      fetchAll();
    } catch (e: any) {
      toast({ title: '재분류 실패', description: e?.message, variant: 'destructive' });
    } finally {
      setReclassifying(false);
    }
  };

  // ── 옵션 트리 렌더링 ────────────────────────────────────────
  const OptionTree = ({ kind, options }: { kind: Kind; options: OptionRow[] }) => {
    const [newName, setNewName] = useState('');
    const [newAliases, setNewAliases] = useState('');
    const [newChildFor, setNewChildFor] = useState<string | null>(null);
    const [childName, setChildName] = useState('');
    const [childAliases, setChildAliases] = useState('');

    const parents = options.filter((o) => !o.parent_id);
    const childrenOf = (id: string) => options.filter((o) => o.parent_id === id);
    const usageKey = (opt: OptionRow) =>
      kind === 'diagnosis' ? (opt.parent_id ? `dxd:${opt.name}` : `dx:${opt.name}`) : opt.parent_id ? `hsb:${opt.name}` : `hs:${opt.name}`;

    return (
      <div className="space-y-3">
        {parents.map((p) => {
          const pUsed = usageCounts[usageKey(p)] || 0;
          const children = childrenOf(p.id);
          return (
            <Card key={p.id}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <Badge variant="secondary">{pUsed}명 사용</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setNewChildFor(newChildFor === p.id ? null : p.id)}>
                      <Plus className="h-3 w-3 mr-1" /> 하위 추가
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pUsed > 0 || children.length > 0}
                      title={pUsed > 0 ? `${pUsed}명이 사용 중이라 삭제할 수 없습니다` : children.length > 0 ? '하위 분류가 있어 삭제할 수 없습니다' : '삭제'}
                      onClick={() => deleteOption(kind, p, pUsed)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <AliasesEditor kind={kind} opt={p} onSave={updateOption} />
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {children.map((c) => {
                  const cUsed = usageCounts[usageKey(c)] || 0;
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{c.name}</span>
                        <Badge variant="outline">{cUsed}명</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={cUsed > 0}
                        title={cUsed > 0 ? `${cUsed}명이 사용 중이라 삭제할 수 없습니다` : '삭제'}
                        onClick={() => deleteOption(kind, c, cUsed)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <div className="w-full">
                        <AliasesEditor kind={kind} opt={c} onSave={updateOption} />
                      </div>
                    </div>
                  );
                })}
                {newChildFor === p.id && (
                  <div className="flex items-center gap-2 border-t pt-2 flex-wrap">
                    <Input placeholder="하위 이름" value={childName} onChange={(e) => setChildName(e.target.value)} className="w-40" />
                    <Input placeholder="별칭 (쉼표 구분)" value={childAliases} onChange={(e) => setChildAliases(e.target.value)} className="flex-1 min-w-40" />
                    <Button
                      size="sm"
                      onClick={() => {
                        addOption(kind, p.id, childName, childAliases);
                        setChildName('');
                        setChildAliases('');
                        setNewChildFor(null);
                      }}
                    >
                      추가
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* 대분류 추가 */}
        <div className="flex items-center gap-2 border-t pt-3 flex-wrap">
          <Input placeholder="새 대분류 이름" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-48" />
          <Input placeholder="별칭 (쉼표 구분)" value={newAliases} onChange={(e) => setNewAliases(e.target.value)} className="flex-1 min-w-40" />
          <Button
            size="sm"
            onClick={() => {
              addOption(kind, null, newName, newAliases);
              setNewName('');
              setNewAliases('');
            }}
          >
            <Plus className="h-3 w-3 mr-1" /> 대분류 추가
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">로딩 중...</div>;
  }

  return (
    <div className="max-w-none mx-auto p-6 w-full space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ListTree className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">진단·병원 목록 관리</h1>
        </div>
        <div className="flex items-center gap-3">
          {reclassifying && (
            <span className="text-sm text-muted-foreground">
              재분류 중… {reclassProgress.done}/{reclassProgress.total}
            </span>
          )}
          <Button onClick={reclassifyAll} disabled={reclassifying} variant="outline" className="flex items-center gap-2">
            <RefreshCw className={reclassifying ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            전체 재분류
          </Button>
        </div>
      </div>

      <Tabs defaultValue="diagnosis">
        <TabsList>
          <TabsTrigger value="diagnosis">진단명</TabsTrigger>
          <TabsTrigger value="hospital">이전병원</TabsTrigger>
        </TabsList>
        <TabsContent value="diagnosis">
          <OptionTree kind="diagnosis" options={dxOptions} />
        </TabsContent>
        <TabsContent value="hospital">
          <OptionTree kind="hospital" options={hsOptions} />
        </TabsContent>
      </Tabs>

      {/* 미분류 원문 */}
      <Card>
        <CardHeader>
          <CardTitle>미분류 원문 ({unclassified.length}건)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {unclassified.length === 0 && <p className="text-sm text-muted-foreground">확인이 필요한 원문이 없습니다.</p>}
          {unclassified.map((u) => (
            <UnclassifiedRow
              key={`${u.kind}:${u.raw}`}
              item={u}
              options={u.kind === 'diagnosis' ? dxOptions : hsOptions}
              onLink={linkRawToOption}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// 별칭 편집 (쉼표 구분)
function AliasesEditor({ kind, opt, onSave }: { kind: Kind; opt: OptionRow; onSave: (kind: Kind, id: string, patch: Partial<OptionRow>) => Promise<void> }) {
  const [value, setValue] = useState((opt.aliases || []).join(', '));
  const dirty = value !== (opt.aliases || []).join(', ');
  return (
    <div className="flex items-center gap-2 mt-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="별칭 (쉼표 구분)"
        className="h-8 text-xs flex-1"
      />
      {dirty && (
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => onSave(kind, opt.id, { aliases: value.split(',').map((a) => a.trim()).filter(Boolean) })}
        >
          저장
        </Button>
      )}
    </div>
  );
}

// 미분류 원문 한 줄
function UnclassifiedRow({
  item,
  options,
  onLink,
}: {
  item: { raw: string; kind: Kind; count: number; patientIds: string[] };
  options: OptionRow[];
  onLink: (raw: string, kind: Kind, optionId: string, patientIds: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState('');
  const parents = options.filter((o) => !o.parent_id);
  return (
    <div className="flex items-center gap-2 border rounded-md px-3 py-2 flex-wrap">
      <Badge variant="outline" className="text-orange-600 border-orange-400">
        {item.kind === 'diagnosis' ? '진단' : '병원'}
      </Badge>
      <span className="text-sm flex-1 min-w-40 truncate" title={item.raw}>
        {item.raw}
      </span>
      <Badge variant="secondary">{item.count}명</Badge>
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="w-44 h-8">
          <SelectValue placeholder="옵션 선택" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-background">
          {parents.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        className="h-8"
        disabled={!selected}
        onClick={() => onLink(item.raw, item.kind, selected, item.patientIds)}
      >
        <Link2 className="h-3 w-3 mr-1" /> 옵션에 연결
      </Button>
    </div>
  );
}
