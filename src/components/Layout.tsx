import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { User, LogOut, Crown, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { BranchSwitcher } from '@/components/BranchSwitcher';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, userRole, signOut } = useAuth();

  if (user && !userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-primary">승인 대기 중</h1>
            <p className="text-muted-foreground">계정이 아직 승인되지 않았습니다.</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">관리자의 승인을 기다려주세요.</p>
          </div>
          <button onClick={signOut} className="text-primary hover:underline text-sm">
            다른 계정으로 로그인하기
          </button>
        </div>
      </div>
    );
  }

  const getName = () => user?.user_metadata?.name || user?.email?.split('@')[0] || '사용자';
  const roleLabel = userRole === 'master' ? '마스터' : userRole === 'admin' ? '관리자' : userRole === 'manager' ? '매니저' : '사용자';
  const RoleIcon = userRole === 'master' ? Crown : userRole === 'admin' ? UserCheck : User;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between px-6 border-b bg-card shadow-sm">
            <div className="flex items-center gap-4"><SidebarTrigger className="p-2" /></div>
            <div className="flex items-center gap-3">
              <BranchSwitcher />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 h-auto">
                    <RoleIcon className="h-5 w-5" />
                    <div className="text-sm text-left">
                      <div className="font-medium">{getName()}</div>
                      <div className="text-xs text-muted-foreground">{roleLabel}</div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{getName()}</p>
                      <Badge variant={userRole === 'master' ? 'default' : 'secondary'} className="text-xs w-fit">
                        <RoleIcon className="h-3 w-3 mr-1" />{roleLabel}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
