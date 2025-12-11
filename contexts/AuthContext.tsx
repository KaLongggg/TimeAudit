
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User, Role } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    };

    initAuth();

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    try {
      const userId = authUser.id;
      const email = authUser.email || '';
      
      // Fetch extra details from our public 'users' table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        // Found user, set state
        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role as Role,
          avatar: data.avatar
        });
      } else {
        // SELF-HEALING: Profile is missing (likely due to RLS blocking signup insert)
        // We are now logged in, so we can self-insert.
        console.warn("User profile missing in public table. Attempting to create...");
        
        const metadataName = authUser.user_metadata?.full_name || email.split('@')[0];
        const newProfile = {
            id: userId,
            email: email,
            name: metadataName,
            role: Role.EMPLOYEE,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(metadataName)}&background=random`
        };

        const { error: insertError } = await supabase.from('users').insert(newProfile);
        
        if (insertError) {
             console.error("Failed to auto-create profile", insertError);
             // Use ephemeral data as last resort so app doesn't crash
             setUser(newProfile);
        } else {
             // Success, set user
             setUser(newProfile);
        }
      }
    } catch (err) {
      console.error("Auth Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
