import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Disable LockManager to avoid timeout errors with multiple tabs
    lock: false,
    // Use localStorage instead of LockManager
    storageKey: 'supabase.auth.token',
    // Auto refresh token
    autoRefreshToken: true,
    // Persist session
    persistSession: true,
    // Detect session in URL
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 20 },
  },
});
