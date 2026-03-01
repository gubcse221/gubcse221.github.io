/*
  # Update students table with phone, authorization, and base64 images

  1. Modified Tables
    - `students` table updates:
      - Add `phone_number` column
      - Add `authorized` column (0 or 1, default 0)
      - Modify `profile_photo_url` and `cover_photo_url` to store base64 or URLs
      - Add `profile_photo_base64` for uploaded images
      - Add `cover_photo_base64` for uploaded images
      - Add `submitted_at` for tracking submission time

  2. Note
    - Base64 images will be stored directly in the database
    - Authorized column controls visibility on main page
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE students ADD COLUMN phone_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'authorized'
  ) THEN
    ALTER TABLE students ADD COLUMN authorized integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'profile_photo_base64'
  ) THEN
    ALTER TABLE students ADD COLUMN profile_photo_base64 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'cover_photo_base64'
  ) THEN
    ALTER TABLE students ADD COLUMN cover_photo_base64 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE students ADD COLUMN submitted_at timestamptz DEFAULT now();
  END IF;
END $$;