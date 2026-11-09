const SUPABASE_URL = 'https://rnfdliedxxmjakcgkhfc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_B0DPCDNipfGzsubWP7EHbg_AgX7Mu7M';

if (!window.supabase?.createClient) {
  throw new Error('Supabase JS não foi carregado. Verifique a conexão com a internet.');
}

window.hylaSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
