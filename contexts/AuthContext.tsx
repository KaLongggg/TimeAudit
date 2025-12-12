
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User, Role } from '../types';

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
  
  // Use a ref to track if component is mounted to avoid state updates on unmount
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const initAuth = async () => {
      try {
        // Create a timeout promise to prevent hanging on stale cache
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timed out')), 4000)
        );

        const sessionPromise = supabase.auth.getSession();

        // Race the session check against the timeout
        const result = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: Session | null }, error: any };
        
        // If we get here, it didn't timeout
        if (result.error) throw result.error;
        
        const currentSession = result.data?.session;

        if (mounted.current) {
          setSession(currentSession);
          if (currentSession?.user) {
            await fetchUserProfile(currentSession.user);
          } else {
             // No session found, stop loading
             setLoading(false);
          }
        }
      } catch (err) {
        console.warn("Auth initialization issue (or timeout):", err);
        // In case of timeout or error, we stop loading to allow the app to render (likely showing Login)
        // rather than stuck on a spinner.
        if (mounted.current) {
            setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted.current) return;
      
      setSession(session);
      
      if (session?.user) {
        // Only fetch if we don't have the user profile yet or ID mismatch
        // (Use functional state update to access latest 'user' without adding it to dependency array)
        setUser(prev => {
            if (prev?.id !== session.user.id) {
                fetchUserProfile(session.user);
            }
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
      
      // Fetch extra details from our public 'users' table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!mounted.current) return;

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
        // SELF-HEALING: Profile is missing
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
        
        if (!insertError && mounted.current) {
             setUser(newProfile);
        } else if (mounted.current) {
             // Fallback to ephemeral profile so app doesn't crash
             setUser(newProfile);
        }
      }
    } catch (err) {
      console.error("Auth Fetch Error:", err);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const signOut = async () => {
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.error("Error signing out:", e);
    } finally {
        if (mounted.current) {
            setUser(null);
            setSession(null);
        }
    }
  };

  const updateLocalUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, updateLocalUser }}>
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
