import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

type Branch = '강서' | '광명' | '성동';

export function BranchSwitcher() {
  const { userRole, currentBranch, userBranches, switchBranch } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: s => s.location.pathname });

  const allBranches: Array<{ branch: Branch; role: 'master' }> = [
    { branch: '강서', role: 'master' },
    { branch: '광명', role: 'master' },
    { branch: '성동', role: 'master' },
  ];
  const availableBranches = userRole === 'master' ? allBranches : userBranches;
  if (!availableBranches?.length) return null;
  if (availableBranches.length === 1 && userRole !== 'master') return null;

  const handleChange = (newBranch: Branch) => {
    toast(`${newBranch}점 데이터를 불러오는 중...`);
    switchBranch(newBranch);
    const parts = pathname.split('/').filter(Boolean).map(p => decodeURIComponent(p));
    if (parts.length > 0) {
      parts[0] = newBranch;
      navigate({ to: '/' + parts.join('/') });
    } else {
      navigate({ to: `/${newBranch}` });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-muted-foreground" />
      <Select value={currentBranch || undefined} onValueChange={(v) => handleChange(v as Branch)}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="지점 선택" /></SelectTrigger>
        <SelectContent>
          {availableBranches.map(({ branch }) => (
            <SelectItem key={branch} value={branch}>{branch}점</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
