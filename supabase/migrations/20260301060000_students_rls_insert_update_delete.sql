/*
  # RLS policies for students: allow insert (submit), update (approve), delete (reject)

  - Allow anon and authenticated to INSERT (public submissions)
  - Allow anon and authenticated to UPDATE (admin approve: set authorized, photo URLs)
  - Allow anon and authenticated to DELETE (admin reject/remove)
*/

CREATE POLICY "Anyone can insert students"
  ON students
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update students"
  ON students
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete students"
  ON students
  FOR DELETE
  TO anon, authenticated
  USING (true);
