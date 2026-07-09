import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use the user-provided URL and key directly if the env ones are invalid or missing
const supabaseUrl = (envUrl && envUrl.startsWith('http')) ? envUrl : 'https://pekhxbahfdqcnmfxukem.supabase.co';
const supabaseKey = (envKey && envKey.length > 50) ? envKey : 'sb_publishable_B-2gaazo_xyB5v8zQbEIKA_XMjH9KJl';

export const supabase = createClient(supabaseUrl, supabaseKey);
