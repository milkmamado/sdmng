import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/$branch/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { branch } = Route.useParams();
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">대시보드 — {branch}점</h1>
      <Card>
        <CardHeader><CardTitle>환영합니다</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Phase 2-A (스키마 + Auth + Layout/Sidebar) 완료. 다음 단계에서 18개 페이지 본문을 원본과 100% 동일하게 이식합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
