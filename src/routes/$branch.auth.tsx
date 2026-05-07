import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/$branch/auth")({
  component: BranchAuthPage,
});

function BranchAuthPage() {
  const { branch } = Route.useParams();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { if (branch) localStorage.setItem('selectedBranch', branch); }, [branch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const { data: roles } = await supabase.from('user_roles')
            .select('approval_status, role, branch')
            .eq('user_id', data.user.id).eq('approval_status', 'approved');
          if (!roles || roles.length === 0) {
            await supabase.auth.signOut();
            toast.error('계정이 승인되지 않았거나 승인 대기 중입니다.');
            return;
          }
          const isMaster = roles.some(r => r.role === 'master');
          const hasBranch = roles.some(r => r.branch === branch);
          if (!isMaster && !hasBranch) {
            await supabase.auth.signOut();
            toast.error(`${branch}점에 대한 접근 권한이 없습니다.`);
            return;
          }
          localStorage.setItem('currentBranch', branch);
          toast.success(`${branch}점에 오신 것을 환영합니다`);
          navigate({ to: `/${branch}` });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/${branch}`,
            data: { name, branch },
          },
        });
        if (error) throw error;
        if (data.user) {
          toast.success('회원가입 신청 완료. 첫 가입자는 마스터로 자동 승인됩니다.');
          setIsLogin(true);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '오류 발생';
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="w-8 h-8 text-primary" />
            <CardTitle className="text-3xl">{branch}점</CardTitle>
          </div>
          <CardDescription>{isLogin ? '로그인하여 환자 관리 시스템에 접속하세요' : '새 계정을 만들어주세요'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="ghost" className="mb-4" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="w-4 h-4 mr-2" />지점 선택으로 돌아가기
          </Button>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2"><User className="w-4 h-4" />이름</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2"><Mail className="w-4 h-4" />이메일</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2"><Lock className="w-4 h-4" />비밀번호</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} minLength={6} />
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline" disabled={loading}>
              {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
