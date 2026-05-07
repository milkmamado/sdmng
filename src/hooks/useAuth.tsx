import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Branch = '강서' | '광명' | '성동';
type Role = 'master' | 'manager' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: Role | null;
  userBranch: Branch | null;
  userBranches: Array<{ branch: Branch; role: Role }>;
  currentBranch: Branch | null;
  loading: boolean;
  signOut: () => Promise<void>;
  switchBranch: (branch: Branch) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userBranch, setUserBranch] = useState<Branch | null>(null);
  const [userBranches, setUserBranches] = useState<Array<{ branch: Branch; role: Role }>>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string) => {
    try {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role, branch')
        .eq('user_id', uid)
        .eq('approval_status', 'approved');

      if (rolesData && rolesData.length > 0) {
        const branches = rolesData as Array<{ branch: Branch; role: Role }>;
        setUserBranches(branches);
        const isMaster = branches.some(r => r.role === 'master');
        const urlPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const urlBranchRaw = urlPath.split('/')[1];
        const urlBranch = urlBranchRaw ? (decodeURIComponent(urlBranchRaw) as Branch) : null;
        const savedBranch = (typeof window !== 'undefined' ? localStorage.getItem('currentBranch') : null) as Branch | null;
        const targetBranch = (['강서','광명','성동'] as Branch[]).includes(urlBranch as Branch) ? urlBranch : savedBranch;

        if (targetBranch) {
          if (isMaster) {
            setCurrentBranch(targetBranch); setUserRole('master'); setUserBranch(targetBranch);
            localStorage.setItem('currentBranch', targetBranch);
          } else {
            const found = branches.find(b => b.branch === targetBranch);
            if (found) {
              setCurrentBranch(targetBranch); setUserRole(found.role); setUserBranch(targetBranch);
              localStorage.setItem('currentBranch', targetBranch);
            } else {
              setCurrentBranch(branches[0].branch); setUserRole(branches[0].role); setUserBranch(branches[0].branch);
              localStorage.setItem('currentBranch', branches[0].branch);
            }
          }
        } else {
          setCurrentBranch(branches[0].branch); setUserRole(branches[0].role); setUserBranch(branches[0].branch);
          localStorage.setItem('currentBranch', branches[0].branch);
        }
      } else {
        setUserBranches([]); setUserRole(null); setUserBranch(null); setCurrentBranch(null);
      }
    } catch (e) {
      console.error('역할 조회 실패:', e);
      setUserBranches([]); setUserRole(null); setUserBranch(null); setCurrentBranch(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => { loadRoles(sess.user.id); }, 0);
      } else {
        setUserBranches([]); setUserRole(null); setUserBranch(null); setCurrentBranch(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(async () => { await loadRoles(session.user.id); setLoading(false); }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
    finally {
      setUser(null); setSession(null); setUserRole(null); setUserBranch(null);
      setUserBranches([]); setCurrentBranch(null);
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const switchBranch = (branch: Branch) => {
    const isMaster = userBranches.some(b => b.role === 'master');
    if (isMaster) {
      setCurrentBranch(branch); setUserRole('master'); setUserBranch(branch);
      localStorage.setItem('currentBranch', branch);
    } else {
      const r = userBranches.find(b => b.branch === branch);
      if (r) {
        setCurrentBranch(branch); setUserRole(r.role); setUserBranch(branch);
        localStorage.setItem('currentBranch', branch);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, userBranch, userBranches, currentBranch, loading, signOut, switchBranch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
