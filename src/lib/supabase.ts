import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Student {
  id: string;
  student_id: string;
  name: string;
  profile_photo_url: string;
  cover_photo_url: string;
  facebook_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  email?: string;
  created_at: string;
}
