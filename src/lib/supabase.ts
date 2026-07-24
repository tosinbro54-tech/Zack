import { createClient } from '@supabase/supabase-js';

const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || '') as string;
const supabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '') as string;

export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[AI Studio] Supabase configuration missing. Database features will fail gracefully.');
    return new Proxy({} as any, {
      get(target, prop) {
        if (prop === 'auth') {
          return {
            getSession: async () => ({ data: { session: null } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signOut: async () => {},
          };
        }
        return () => {
          throw new Error('Supabase client is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
        };
      }
    });
  }
  return createClient(supabaseUrl, supabaseAnonKey);
})();
