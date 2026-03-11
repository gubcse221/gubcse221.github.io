## GUB CSE 221 – Student Memorial Directory

Memorial directory for **Green University of Bangladesh – CSE Batch 221**, built with React, Vite, Tailwind CSS and Supabase. Students can submit their profile, admins review/approve, and the directory is rendered as a beautiful card grid with infinite scroll and search.

### Tech Stack

- **Frontend**: React 18 (TypeScript) + Vite
- **Styling**: Tailwind CSS
- **Routing**: `react-router-dom`
- **Backend / DB**: Supabase (PostgreSQL + Auth + Storage-style base64 fields)
- **CI / Hosting**: GitHub Pages (via `docs/` output) + GitHub Actions

### Project Structure

```text
.
├─ src/
│  ├─ App.tsx               # Public directory (student grid, search, GitHub footer)
│  ├─ main.tsx              # App entry, React Router setup
│  ├─ index.css             # Tailwind base + global styles
│  ├─ lib/
│  │  ├─ supabase.ts        # Supabase client + Student interface
│  │  └─ imageUtils.ts      # Image compression & base64 helpers
│  └─ pages/
│     ├─ UploadPage.tsx     # Student submission form + visual cropper
│     └─ AdminPage.tsx      # Admin dashboard (login + approve/delete)
│
├─ public/
│  └─ assets/
│     ├─ bg.png             # Repeating background texture
│     ├─ cover.JPG          # Default card cover image / OG image
│     └─ *.png / *.jpg      # Logos and misc assets
│
├─ supabase/
│  ├─ config.toml           # Supabase CLI project config
│  └─ migrations/           # SQL migrations for `students` table + RLS
│
├─ docs/                    # Built site for GitHub Pages (index.html, 404.html)
├─ dist/                    # Vite build output (local)
├─ package.json             # Scripts + dependencies
└─ README.md
```

### Supabase Setup

1. **Create a Supabase project** and note:
   - Project URL
   - `anon` public API key

2. **Configure environment variables** (see `.env.example`):

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_EMAIL=admin@example.com   # optional: restrict admin panel to this email
```

3. **Apply database migrations** (using Supabase CLI):

```bash
supabase db reset        # or: supabase db push
```

This will create the `students` table with:

- basic profile fields (`name`, `student_id`, `email`, `phone_number`)
- social links (Facebook, X, LinkedIn)
- base64 image columns (`profile_photo_base64`, `cover_photo_base64`)
- URL cache columns (`profile_photo_url`, `cover_photo_url`)
- `authorized` flag for admin approval and `submitted_at` timestamp

### Running the Project

Install dependencies (Node 18+ recommended):

```bash
npm install
```

Run in development mode:

```bash
npm run dev
```

Type-check and lint:

```bash
npm run typecheck
npm run lint
```

Build for production (Vite):

```bash
npm run build
```
```bash

npx supabase db push --db-url "postgresql://postgres:5c6bfabc8e3f4fd69591083e7fef680d@172.16.0.14:5432/postgres"

```

### Application Flows

- **Public Directory (`/`)**
  - Shows approved students (`authorized = 1`) in a responsive card grid.
  - Infinite scroll pagination and search by **name** or **student ID**.
  - Hero section uses `cover.JPG`; full-page textured background uses `bg.png`.
  - Footer shows GitHub repo links and **live GitHub contributor avatars** via the GitHub API.

- **Upload Page (`/upload`)**
  - Student form with validation (name, ID, email, phone, socials).
  - Drag + resize **visual cropper** for profile (1:1) and cover (16:9) images.
  - Images are compressed on the client and saved as base64 to Supabase.
  - New submissions are created with `authorized = 0` and wait for admin approval.

- **Admin Panel (`/admin`)**
  - Supabase email/password auth (optionally restricted via `VITE_ADMIN_EMAIL`).
  - Pending submissions review: full-size profile/cover preview, metadata, approve/delete actions.
  - Approved student list for quick overview and cleanup.

### Deployment Notes

- The repo is configured for **GitHub Pages** (via `docs/` and a GitHub Actions workflow).
- You can customize metadata in `index.html` (OG tags, title, favicon) and background/branding images under `public/assets`.

### License

This project is licensed under the **MIT License** (see `LICENSE`).
