
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = "https://iztkqabewhgvsjqwenpl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6dGtxYWJld2hndnNqcXdlbnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NDkzMDEsImV4cCI6MjA2MjMyNTMwMX0.ggBRU3pHwywE1huBwAFIT_DuSymcmj0h8g6UMPCg1EM";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
