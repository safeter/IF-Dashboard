# CLAUDE.md

Guidance for Claude Code in this repository.

## Deploy

- Host: **Cloudflare Pages**, project `gcsifdashboard`, live at https://gcsifdashboard.pages.dev (free plan).
- Every push to `master` (including a merged pull request) builds (`npm run build` → `dist`) and publishes automatically. Pull requests get their own preview URL. No manual step, no need to batch commits.
- Build-time env vars are set in Cloudflare → Workers & Pages → gcsifdashboard → Settings → Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. A new `VITE_*` variable must be added there too, then redeployed.
- Data lives in Supabase (project `bgewhsybjymnohvmydqz`); the host holds no data.
- Single-page routing: `public/_redirects` (`/* /index.html 200`). Keep it.
- The old Netlify site was deleted on 2026-11-20. `vercel.json` is a legacy config for another host and is ignored.
