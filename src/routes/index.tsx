import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: BranchSelectionPage,
});

function BranchSelectionPage() {
  const { user, currentBranch, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (user && currentBranch) {
    return <Navigate to={`/${currentBranch}`} />;
  }

  const branches = [
    { id: '강서', name: '강서점', description: '강서 지점 관리 시스템' },
    { id: '광명', name: '광명점', description: '광명 지점 관리 시스템' },
    { id: '성동', name: '성동점', description: '성동 지점 관리 시스템' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container max-w-4xl p-6">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="w-12 h-12 text-primary" />
            <h1 className="text-4xl font-bold">지점 선택</h1>
          </div>
          <p className="text-muted-foreground text-lg">관리하실 지점을 선택해주세요</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {branches.map(b => (
            <Card key={b.id} className="hover:shadow-lg transition-all cursor-pointer hover:scale-105"
                  onClick={() => navigate({ to: `/${b.id}/auth` })}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Building2 className="w-6 h-6 text-primary" />{b.name}
                </CardTitle>
                <CardDescription>{b.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg">{b.name} 로그인</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
