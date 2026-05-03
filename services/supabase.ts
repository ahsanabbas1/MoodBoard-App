import { createClient } from '@supabase/supabase-js';

// Use environment variables or valid placeholder URLs to prevent crashes during initialization
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
