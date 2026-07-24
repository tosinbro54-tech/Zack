import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// Service-role client — used only server-side, never exposed to the frontend.
export const supabase = (() => {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    console.warn('[AI Studio] Backend Supabase configuration missing. Using mock proxy.');
    return new Proxy({}, {
      get(target, prop) {
        return () => {
          throw new Error('Supabase client is not configured. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your environment variables.');
        };
      }
    });
  }
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false },
  });
})();
