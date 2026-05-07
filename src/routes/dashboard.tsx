import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "대시보드 — 성동점" }],
  }),
  component: Dashboard,
});

type ProfileRow = {
  display_name: string | null;
  email: string | null;
  branches: { name: string; code: string } | null;
};

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/auth" });
        return;
      }

      const [{ data: prof }, { data: roleRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, email, branches(name, code)")
          .eq("id", session.user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      ]);

      if (!mounted) return;
      setProfile(prof as ProfileRow | null);
      setRoles((roleRows ?? []).map((r) => r.role));
      setLoading(false);
    };

    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) navigate({ to: "/auth" });
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("로그아웃 되었습니다");
    navigate({ to: "/auth" });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">불러오는 중...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold">성동점 관리 시스템</h1>
            <p className="text-sm text-muted-foreground">{profile?.branches?.name ?? "성동점"}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{profile?.display_name ?? profile?.email}</p>
              <div className="flex gap-1 justify-end">
                {roles.map((r) => (
                  <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" onClick={logout}>로그아웃</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>환자 관리</CardTitle>
              <CardDescription>(곧 제공)</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Phase 2에서 추가됩니다.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>예약 / 일정</CardTitle>
              <CardDescription>(곧 제공)</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Phase 2에서 추가됩니다.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>CRM 북마크릿</CardTitle>
              <CardDescription>(곧 제공)</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Phase 3에서 추가됩니다.</CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
