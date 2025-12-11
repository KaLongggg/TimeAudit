import { createClient } from '@supabase/supabase-js';

// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
// 1. Create a project at https://supabase.com
// 2. Go to Project Settings -> API
// 3. Paste the URL and ANON KEY below
// ==========================================

const SUPABASE_URL: string = 'https://iywfbwehzstkxikxgozt.supabase.co';
const SUPABASE_KEY: string = 'sb_publishable__3spEdfWoUmnl-bpAKR7zQ_JfnAoJlx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const isSupabaseConfigured = () => {
  return SUPABASE_URL !== '' && SUPABASE_KEY !== '';
};