import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
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
    // Node 20's native WebSocket isn't picked up by supabase-js's internal
    // realtime client (even though this app never uses realtime
    // subscriptions - the client is constructed unconditionally). Passing
    // 'ws' explicitly avoids the startup crash.
    realtime: { transport: ws },
  });
})();
