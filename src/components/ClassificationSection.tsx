// @ts-nocheck
// 진단명 · 이전병원 자동 분류 표시/수정 영역
// - 상담내용 기반 자동 분류 결과를 보여주고, 수동 선택·확인을 지원
// - 배지: 자동(rule) / 확인 필요(needs_review) / 수동(manual)
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptionRow {
  id: string;
  name: string;
  parent_id: string | null;
}

interface ClassificationSectionProps {
  patient?: any;
  diagnosisCategory: string;
  diagnosisDetail: string;
  hospitalCategory: string;
  hospitalBranch: string;
  onFieldChange: (field: string, value: string) => void;
  // 수동 변경/확인 시 source='manual', needs_review=false로 바뀔 필드 그룹 ('diagnosis' | 'hospital')
  onManualChange: (kind: 'diagnosis' | 'hospital') => void;
  dxSource?: string | null;
  dxNeedsReview?: boolean;
  dxRaw?: string | null;
  hsSource?: string | null;
  hsNeedsReview?: boolean;
  hsRaw?: string | null;
}

function SourceBadge({ source, needsReview }: { source?: string | null; needsReview?: boolean }) {
  if (needsReview) {
    return <Badge variant="outline" className="text-orange-600 border-orange-400">확인 필요</Badge>;
  }
  if (source === 'rule') {
    return <Badge variant="secondary">자동</Badge>;
  }
  if (source === 'manual') {
    return <Badge variant="outline">수동</Badge>;
  }
  return null;
}

export function ClassificationSection({
  patient,
  diagnosisCategory,
  diagnosisDetail,
  hospitalCategory,
  hospitalBranch,
  onFieldChange,
  onManualChange,
  dxSource,
  dxNeedsReview,
  dxRaw,
  hsSource,
  hsNeedsReview,
  hsRaw,
}: ClassificationSectionProps) {
  const [dxOptions, setDxOptions] = useState<OptionRow[]>([]);
  const [hsOptions, setHsOptions] = useState<OptionRow[]>([]);
  const [hsOpen, setHsOpen] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: dx }, { data: hs }] = await Promise.all([
        supabase.from('diagnosis_options').select('id, name, parent_id').order('sort_order', { ascending: true }),
        supabase.from('hospital_options').select('id, name, parent_id').order('sort_order', { ascending: true }),
      ]);
      if (dx) setDxOptions(dx);
      if (hs) setHsOptions(hs);
    };
    fetchAll();
  }, []);

  const dxCategories = useMemo(() => dxOptions.filter((o) => !o.parent_id), [dxOptions]);
  const hsCategories = useMemo(() => hsOptions.filter((o) => !o.parent_id), [hsOptions]);

  const selectedDxCat = dxCategories.find((c) => c.name === diagnosisCategory);
  const dxDetails = useMemo(
    () => (selectedDxCat ? dxOptions.filter((o) => o.parent_id === selectedDxCat.id) : []),
    [dxOptions, selectedDxCat],
  );

  const selectedHsCat = hsCategories.find((c) => c.name === hospitalCategory);
  const hsBranches = useMemo(
    () => (selectedHsCat ? hsOptions.filter((o) => o.parent_id === selectedHsCat.id) : []),
    [hsOptions, selectedHsCat],
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">진단명 · 이전병원</h3>

      {/* 진단명 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>진단명</Label>
          <SourceBadge source={dxSource} needsReview={dxNeedsReview} />
          {dxNeedsReview && (
            <Button type="button" size="sm" variant="outline" className="h-6 text-xs" onClick={() => onManualChange('diagnosis')}>
              이대로 확인
            </Button>
          )}
        </div>
        {dxRaw && <p className="text-xs text-muted-foreground">원문: {dxRaw}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            value={diagnosisCategory || ''}
            onValueChange={(v) => {
              onFieldChange('diagnosis_category', v);
              onFieldChange('diagnosis_detail', '');
              onManualChange('diagnosis');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="대분류 선택" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-background">
              {dxCategories.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={diagnosisDetail || ''}
            onValueChange={(v) => {
              onFieldChange('diagnosis_detail', v);
              onManualChange('diagnosis');
            }}
            disabled={dxDetails.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={dxDetails.length === 0 ? '하위 분류 없음' : '중분류 선택'} />
            </SelectTrigger>
            <SelectContent className="z-50 bg-background">
              {dxDetails.map((d) => (
                <SelectItem key={d.id} value={d.name}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 이전병원 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>이전병원</Label>
          <SourceBadge source={hsSource} needsReview={hsNeedsReview} />
          {hsNeedsReview && (
            <Button type="button" size="sm" variant="outline" className="h-6 text-xs" onClick={() => onManualChange('hospital')}>
              이대로 확인
            </Button>
          )}
        </div>
        {hsRaw && <p className="text-xs text-muted-foreground">원문: {hsRaw}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 병원: 검색 가능한 콤보박스 */}
          <Popover open={hsOpen} onOpenChange={setHsOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" role="combobox" aria-expanded={hsOpen} className="justify-between font-normal">
                {hospitalCategory || '병원 선택'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50 bg-background" align="start">
              <Command>
                <CommandInput placeholder="병원 검색..." />
                <CommandList>
                  <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                  <CommandGroup>
                    {hsCategories.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => {
                          onFieldChange('hospital_category', c.name);
                          onFieldChange('hospital_branch', '');
                          onManualChange('hospital');
                          setHsOpen(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', hospitalCategory === c.name ? 'opacity-100' : 'opacity-0')} />
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {/* 캠퍼스 */}
          <Select
            value={hospitalBranch || ''}
            onValueChange={(v) => {
              onFieldChange('hospital_branch', v);
              onManualChange('hospital');
            }}
            disabled={hsBranches.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={hsBranches.length === 0 ? '캠퍼스 없음' : '캠퍼스 선택'} />
            </SelectTrigger>
            <SelectContent className="z-50 bg-background">
              {hsBranches.map((b) => (
                <SelectItem key={b.id} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
