import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export interface Student {
  id: string;
  student_id: string;
  name: string;
  profile_photo_url: string;
  cover_photo_url: string;
  profile_photo_base64?: string;
  cover_photo_base64?: string;
  phone_number?: string;
  facebook_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  email?: string;
   hometown?: string;
   permanent_address?: string;
   present_address?: string;
   religion?: string;
   job_designation?: string;
   organization_name?: string;
  created_at: string;
  submitted_at?: string;
  blood_group?: string;
  gender?: string;
  submit_ip?: string;
  approved_by?: string;
  approved_at?: string;
}
