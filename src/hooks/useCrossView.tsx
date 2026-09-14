// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * 매니저 간 "읽기 전용 교차 열람" 권한 훅.
 *
 * cross_view_grants 에서 is_active = true 인 행만 읽어온다.
 * 마스터가 `update cross_view_grants set is_active = false` 를 실행하면
 * 목록이 비게 되고, 화면은 자동으로 "내 환자만" 상태로 되돌아간다.
 */
export function useCrossView() {
  const { user, userRole } = useAuth();
  const [viewableManagerIds, setViewableManagerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGrants = useCallback(async () => {
    if (!user) {
      setViewableManagerIds([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('cross_view_grants')
        .select('target_manager_id')
        .eq('viewer_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      setViewableManagerIds((data || []).map((r: any) => r.target_manager_id));
    } catch (e) {
      console.error('교차 열람 권한 조회 실패:', e);
      setViewableManagerIds([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGrants();
  }, [fetchGrants]);

  const isMaster = userRole === 'master';
  // 마스터는 기존 동작 그대로 (토글 없음)
  const hasCrossView = !isMaster && viewableManagerIds.length > 0;

  /** 해당 담당자의 환자를 "수정"할 수 있는가 */
  const canEditManager = useCallback(
    (assignedManager?: string | null) => {
      // 마스터 및 교차 열람 권한이 없는 사용자는 기존 동작 그대로 유지
      if (isMaster || !hasCrossView) return true;
      if (!user) return true;
      if (!assignedManager) return true;
      return assignedManager === user.id;
    },
    [isMaster, hasCrossView, user?.id]
  );

  /** 해당 환자가 교차 열람으로만 보이는(읽기 전용) 환자인가 */
  const isReadOnlyPatient = useCallback(
    (patient?: { assigned_manager?: string | null } | null) => {
      if (!patient) return false;
      return !canEditManager(patient.assigned_manager);
    },
    [canEditManager]
  );

  return {
    userId: user?.id ?? null,
    isMaster,
    hasCrossView,
    viewableManagerIds,
    loading,
    canEditManager,
    isReadOnlyPatient,
    refresh: fetchGrants,
  };
}
