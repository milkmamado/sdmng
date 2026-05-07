import { Navigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'master' | 'manager' | 'admin';
  allowedRoles?: Array<'master' | 'manager' | 'admin'>;
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: Props) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" />;

  if (allowedRoles && !allowedRoles.includes(userRole as 'master'|'manager'|'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-destructive">접근 권한 없음</h1>
          <p className="text-muted-foreground">이 페이지에 접근할 권한이 없습니다.</p>
        </div>
      </div>
    );
  }
  if (requiredRole && userRole !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-destructive">접근 권한 없음</h1>
          <p className="text-muted-foreground">이 페이지에 접근할 권한이 없습니다.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
