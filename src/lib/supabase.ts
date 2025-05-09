
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = "https://iztkqabewhgvsjqwenpl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6dGtxYWJld2hndnNqcXdlbnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NDkzMDEsImV4cCI6MjA2MjMyNTMwMX0.ggBRU3pHwywE1huBwAFIT_DuSymcmj0h8g6UMPCg1EM";

// Configuração aprimorada do cliente Supabase para evitar problemas de autenticação
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Função auxiliar para limpar estado de autenticação
export const cleanupAuthState = () => {
  // Remove tokens padrão de auth
  localStorage.removeItem('supabase.auth.token');
  
  // Remove todas as chaves de auth do Supabase do localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove do sessionStorage se estiver em uso
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};
