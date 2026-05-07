import {
  Users, Calendar, Home, Heart, Shield, ClipboardCheck, BarChart3,
  BookOpen, BookMarked, Package, UserX, FileSpreadsheet, AlertTriangle
} from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';

const getNavigationItems = (branch: string) => [
  { title: '대시보드', url: `/${branch}`, icon: Home },
  { title: '초진관리', url: `/${branch}/first-visit`, icon: Heart },
  { title: '관리 환자 리스트', url: `/${branch}/patient-list`, icon: Users },
  { title: '일별 환자 관리 현황', url: `/${branch}/daily-tracking`, icon: ClipboardCheck },
  { title: '이탈 환자 스케줄 확인', url: `/${branch}/churned-schedule`, icon: UserX },
  { title: '이탈 리스크 관리', url: `/${branch}/risk-management`, icon: Calendar },
  { title: '면책환자 관리', url: `/${branch}/exempt-management`, icon: Shield },
  { title: '통계 관리', url: `/${branch}/statistics`, icon: BarChart3 },
  { title: 'CRM 연동', url: `/${branch}/crm-bookmarklet`, icon: BookMarked },
  { title: '패키지 연동', url: `/${branch}/package-integration`, icon: Package },
  { title: '사용자 메뉴얼', url: `/${branch}/user-manual`, icon: BookOpen },
];

const getAdminItems = (branch: string) => [
  { title: '미분류 환자 리스트', url: `/${branch}/unclassified-patients`, icon: AlertTriangle },
  { title: '입원/외래매출 관리', url: `/${branch}/revenue-bulk-management`, icon: FileSpreadsheet },
  { title: '계정 관리', url: `/${branch}/account-management`, icon: Shield },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { userRole, currentBranch } = useAuth();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const urlBranch = decodeURIComponent(pathname.split('/')[1] || '');
  const activeBranch = currentBranch || urlBranch || '성동';
  const isCollapsed = !open;

  const getBranchTitle = () => {
    switch (activeBranch) {
      case '강서': return '강서면력한방병원';
      case '광명': return '광명면력한방병원';
      case '성동': return '성동면력한방병원';
      default: return '면력한방병원';
    }
  };

  const navigationItems = getNavigationItems(activeBranch);
  const adminItems = getAdminItems(activeBranch);
  const isActive = (url: string) => pathname === url || pathname === url + '/';

  return (
    <Sidebar className={`${isCollapsed ? 'w-14' : 'w-64'} border-r transition-all duration-300`} collapsible="icon">
      <div className="p-4 border-b bg-primary">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-primary-foreground font-bold text-sm">{getBranchTitle()}</h1>
              <p className="text-primary-foreground/80 text-xs">환자 관리 시스템</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3">
            {!isCollapsed && '주요 기능'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems
                .filter(item => {
                  if (item.title === '통계 관리' && userRole === 'manager') return false;
                  if (item.title === '대시보드' && (userRole === 'admin' || userRole === 'master')) return false;
                  return true;
                })
                .map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} title={isCollapsed ? item.title : undefined} className="flex items-center">
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-2 font-medium">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(userRole === 'master' || userRole === 'admin') && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3">
              {!isCollapsed && '시스템 관리'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} title={isCollapsed ? item.title : undefined} className="flex items-center">
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-2 font-medium">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
