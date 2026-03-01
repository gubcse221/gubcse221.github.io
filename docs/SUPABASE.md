# Supabase: Connect & Database Migrate

## 1. Connect the app (env)

1. In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **API**:
   - Copy **Project URL** → use as `VITE_SUPABASE_URL`
   - Copy **anon public** key → use as `VITE_SUPABASE_ANON_KEY`

2. In the repo root, copy the example env and fill in values:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key

3. Restart the dev server so the app picks up the new env.

---

## 2. Connect the CLI (optional, for migrations)

Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if needed:

```bash
npm install -g supabase
```

Link this repo to your remote project (use the **Reference ID** from Project Settings → General):

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

When prompted, enter your **database password** (from Project Settings → Database).

---

## 3. Run database migrations

Apply all migrations in `supabase/migrations/` to your remote database:

```bash
supabase db push
```

Or, if you use the CLI only for local DB:

```bash
supabase db push  # after supabase link
```

**Migrations in this repo:**

| Migration | Description |
|-----------|-------------|
| `20260301052642_create_students_table.sql` | Creates `students` table and read-only RLS |
| `20260301053703_update_students_table.sql` | Adds `phone_number`, `authorized`, base64 photo columns, `submitted_at` |
| `20260301060000_students_rls_insert_update_delete.sql` | RLS so app can insert (submit), update (approve), delete (reject) |

---

## 4. New migrations

Create a new migration file:

```bash
supabase migration new your_change_name
```

Edit the new file under `supabase/migrations/`, then apply:

```bash
supabase db push
```

---

## 5. GitHub Actions (deploy with Supabase)

To have the deployed site use your Supabase project:

1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key

3. In `.github/workflows/deploy-pages.yml`, in the **Build** job, add env so Vite can see them:

   ```yaml
   - name: Build
     run: npm run build
     env:
       VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
       VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
   ```

Then each deploy will be built with your Supabase config.
