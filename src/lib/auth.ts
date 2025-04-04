import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (session) {
        setUser(session?.user ?? null);
      } else {
        // No session, ensure user is null
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          }
        }
      });

      if (authError) throw authError;
      
      if (!authData.user) {
        throw new Error('User creation failed');
      }
      
      return authData;
    } catch (error) {
      console.error('Signup process error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error('Invalid email or password');
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear(); // Clear all local storage
      window.location.reload(); // Force reload to clear any cached state
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        // If refresh fails, clear storage and sign out
        localStorage.clear();
        await signOut();
        toast.error('Your session has expired. Please sign in again.');
        throw error;
      }
      if (session) setUser(session.user);
      return session;
    } catch (error) {
      console.error('Error refreshing session:', error);
      throw error;
    }
  }, []);

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    refreshSession,
  };
}