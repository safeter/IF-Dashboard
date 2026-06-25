# IF-Dashboard — Innovation Fund tool

Internal dashboard + knowledge base for the GCS Innovation Fund.
Vite + React front end, Supabase for shared data + login, deploy on Netlify or Vercel.

The app runs three ways with no code changes:
- **No database configured** → local demo mode (works, but edits don't persist). Good for a first deploy.
- **Database configured** → every screen's data is shared and persists for the whole team, behind login.

---

## 1. Push this to GitHub

From this folder (these match the commands GitHub showed you):

```bash
git init
git add .
git commit -m "Innovation Fund dashboard"
git branch -M main
git remote add origin https://github.com/safeter/IF-Dashboard.git
git push -u origin main
```

> If you prefer GitHub Desktop: drag this folder in, then Commit → Push.

## 2. Set up the database (Supabase)

1. In your project (`bgewhsybjymnohvmydqz`) open **SQL Editor → New query**.
2. Paste the contents of **`supabase/app_state.sql`** and click **Run**. (That's the only one you need now. `supabase/schema.sql` is the richer relational version for later.)
3. **Authentication → Providers**: enable **Google** (or **Email** for magic links).
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
   - Never copy the `service_role` key or the DB password into the app or the repo.

## 3. Run locally (optional but nice)

```bash
npm install
cp .env.example .env.local      # then paste your anon key into .env.local
npm run dev
```

Open the local URL. Sign in, edit something, refresh — it should persist.

## 4. Deploy

### Netlify
1. netlify.com → **Add new site → Import from GitHub** → pick `IF-Dashboard`.
2. Build command `npm run build`, publish directory `dist` (the included `netlify.toml` sets this).
3. **Site settings → Environment variables**: add
   - `VITE_SUPABASE_URL` = `https://bgewhsybjymnohvmydqz.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
4. **Deploy**. You get a `something.netlify.app` URL.

### Vercel (alternative — pick one, not both)
Import the repo, add the same two environment variables, deploy. `vercel.json` handles routing.

## 5. Point login back at your live URL
Supabase → **Authentication → URL Configuration**: set **Site URL** to your Netlify/Vercel URL and add it to **Redirect URLs**. Otherwise Google/magic-link sign-in won't return correctly.

Done — share the URL with your team. Every future `git push` redeploys automatically.

---

## How persistence works
Each screen (calls, selection, classes, pizza, sessions, calendar, checklist, road-to-demo-day, cohorts, alumni) is saved as a JSON record in the `app_state` table, shared by everyone signed in. Writes are debounced, so inline typing isn't chatty. It's last-write-wins per screen — fine for a small team. When you outgrow it (per-judge scoring, cross-cohort queries), migrate to `supabase/schema.sql`.

## Restricting access
By default any signed-in Google/email user can read and write. To limit it to your team, use the allowlist (or domain rule) noted at the bottom of `supabase/app_state.sql`.

## Data residency note
Supabase's nearest region is typically East US, not Canada. If Concordia has rules about where applicant data lives, check with IT/REB before loading real data. The schema is standard Postgres and ports to an approved host if needed.
