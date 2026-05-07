import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "성동점 관리 시스템" },
      { name: "description", content: "성동점 전용 운영·관리 플랫폼" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">성동점 관리 시스템</h1>
        <p className="mt-4 text-muted-foreground">
          성동점 전용으로 운영되는 관리 플랫폼입니다. 직원 계정으로 로그인 후 이용해 주세요.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link to="/auth">로그인 / 회원가입</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
