import { createBrowserClient } from '@supabase/ssr';

// Use fallbacks to prevent build-time crashes if env vars are missing
// Note: Calls using these placeholders will fail at runtime, which is expected behavior without config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
