import { useAuth } from '@/hooks/useAuth';

// 현재 지점으로 supabase 쿼리에 .eq('branch', currentBranch) 적용
export function useBranchFilter() {
  const { currentBranch } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyBranchFilter = <T extends { eq: (col: string, val: any) => T }>(query: T): T => {
    if (currentBranch) return query.eq('branch', currentBranch);
    return query;
  };
  return { applyBranchFilter, currentBranch };
}
