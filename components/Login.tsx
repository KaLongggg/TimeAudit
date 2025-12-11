
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, Lock, Mail, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { Role } from '../types';

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // 1. Sign Up in Supabase Auth
        // We attach the name to user_metadata so it's available even if the immediate public table insert fails
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: Role.EMPLOYEE
            }
          }
        });

        if (authError) throw authError;

        // 2. Attempt to create Profile in public 'users' table
        // IMPORTANT: This only works if Email Confirmation is DISABLED or if Supabase returns a session immediately.
        // If Email Confirmation is ENABLED, authData.session will be null, and RLS will block this insert.
        // We handle that case in AuthContext.tsx via "Lazy Creation".
        if (authData.user && authData.session) {
          const { error: profileError } = await supabase.from('users').insert({
            id: authData.user.id,
            email: email,
            name: name,
            role: Role.EMPLOYEE,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`
          });

          if (profileError) {
             console.warn("Client-side profile creation failed (likely RLS). Will retry on login.", profileError);
          }
        }
        
        alert("Account created! If you enabled email confirmation, please check your inbox.");
        setIsSignUp(false); // Switch to login view
      } else {
        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              {isSignUp ? "Join RepliClone AI to track your time." : "Sign in to manage your timesheets."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="relative">
                <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900"
              />
            </div>

            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Sign Up" : "Sign In"} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="ml-2 font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
