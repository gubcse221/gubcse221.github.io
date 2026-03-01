/*
  # Student Directory Schema

  1. New Tables
    - `students`
      - `id` (uuid, primary key)
      - `student_id` (text, unique) - Format: 221902011
      - `name` (text) - Full name of the student
      - `profile_photo_url` (text) - URL to profile picture
      - `cover_photo_url` (text) - URL to cover photo
      - `facebook_url` (text, nullable)
      - `twitter_url` (text, nullable)
      - `linkedin_url` (text, nullable)
      - `email` (text, nullable)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `students` table
    - Add policy for public read access (memorial/archive site)
*/

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,
  name text NOT NULL,
  profile_photo_url text NOT NULL,
  cover_photo_url text NOT NULL,
  facebook_url text,
  twitter_url text,
  linkedin_url text,
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view students"
  ON students
  FOR SELECT
  TO anon, authenticated
  USING (true);