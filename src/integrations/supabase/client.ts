
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://iztkqabewhgvsjqwenpl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6dGtxYWJld2hndnNqcXdlbnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NDkzMDEsImV4cCI6MjA2MjMyNTMwMX0.ggBRU3pHwywE1huBwAFIT_DuSymcmj0h8g6UMPCg1EM";

// Este é o cliente que deve ser usado em toda a aplicação
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
