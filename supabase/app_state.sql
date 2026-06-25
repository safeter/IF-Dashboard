-- ============================================================
-- RUN THIS ONE NOW.
-- Persistence for the dashboard: each screen's data is stored as JSON,
-- shared by everyone signed in. Paste into Supabase → SQL Editor → Run.
-- ============================================================

create table if not exists app_state (
  cycle      text not null default 'current',
  section    text not null,
  data       jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now(),
  primary key (cycle, section)
);

alter table app_state enable row level security;

-- Any signed-in user can read and write. (Tighten with the allowlist below.)
create policy "team read"   on app_state for select to authenticated using (true);
create policy "team insert" on app_state for insert to authenticated with check (true);
create policy "team update" on app_state for update to authenticated using (true) with check (true);
create policy "team delete" on app_state for delete to authenticated using (true);

-- ---- OPTIONAL: restrict to specific people ----
-- create table members (email text primary key);
-- insert into members (email) values ('you@concordia.ca');
-- Then drop the policies above and recreate each with:
--   using ( (auth.jwt() ->> 'email') in (select email from members) )
-- (and the same expression in with check for insert/update).
-- Or restrict by domain: (auth.jwt() ->> 'email') like '%@concordia.ca'
