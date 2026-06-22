import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Faltam variáveis de ambiente do Supabase (VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY)");
}

// Captura a URL ANTES do Supabase limpar os tokens da barra de navegação
export const isInitialRecoveryUrl = typeof window !== 'undefined' && window.location.href.includes('type=recovery');

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
