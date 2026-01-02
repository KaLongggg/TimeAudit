
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User, Role, UserCompanyRole } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateLocalUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const initAuth = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timed out')), 4000)
        );
        const sessionPromise = supabase.auth.getSession();
        const result = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: Session | null }, error: any };
        
        if (result.error) throw result.error;
        const currentSession = result.data?.session;

        if (mounted.current) {
          setSession(currentSession);
          if (currentSession?.user) {
            await fetchUserProfile(currentSession.user);
          } else {
             setLoading(false);
          }
        }
      } catch (err) {
        console.warn("Auth initialization issue:", err);
        if (mounted.current) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted.current) return;
      setSession(session);
      if (session?.user) {
        setUser(prev => {
            if (prev?.id !== session.user.id) fetchUserProfile(session.user);
            return prev; 
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    if (!mounted.current) return;
    try {
      const userId = authUser.id;
      const email = authUser.email || '';
      
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('user_company_roles').select('company_id, role').eq('user_id', userId)
      ]);

      if (!mounted.current) return;

      const profileData = profileRes.data;
      const companies = (rolesRes.data || []).map(r => ({ company_id: r.company_id, role: r.role as Role }));

      if (profileData) {
        setUser({
          ...profileData,
          companies
        });
      } else {
        console.warn("User profile missing. Attempting lazy creation...");
        const metadataName = authUser.user_metadata?.full_name || email.split('@')[0];
        const newProfile: User = {
            id: userId,
            email: email,
            name: metadataName,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(metadataName)}&background=random`,
            companies: companies
        };
        await supabase.from('users').insert({ id: userId, email, name: metadataName, avatar: newProfile.avatar });
        setUser(newProfile);
      }
    } catch (err) {
      console.error("Auth Fetch Error:", err);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    if (mounted.current) { setUser(null); setSession(null); }
  };

  const updateLocalUser = (updatedUser: User) => setUser(updatedUser);

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, updateLocalUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
