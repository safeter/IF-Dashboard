-- ============================================================
-- OPTIONAL / LATER: the full relational schema.
-- You do NOT need this to run the app — app_state.sql is enough.
-- Move to this when you want per-judge scoring, cross-cohort
-- queries, or to browse data as proper tables in Supabase.
-- (Migration from the JSON store is straightforward; ask when ready.)
-- ============================================================

create type pipeline_stage as enum ('flagged','invited','responded','scheduled','completed','decided');
create type agreed_status  as enum ('pending','yes','declined');
create type outcome_kind   as enum ('select','waitlist','reject');
create type session_kind   as enum ('talk','milestone','community','meeting');
create type road_status    as enum ('notstarted','progress','ready');
create type rsvp_status    as enum ('coming','maybe','no','pending');

create table cycles (
  id uuid primary key default gen_random_uuid(),
  label text not null, kickoff_date date, demo_day_date date,
  is_current boolean default false, created_at timestamptz default now()
);
create table calls (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references cycles(id) on delete cascade,
  name text not null, topic text, accent text default '#912338',
  open_date date, close_date date, subs int default 0,
  fixed boolean default false, sort int default 0, created_at timestamptz default now()
);
create table teams (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references cycles(id) on delete cascade,
  call_id  uuid references calls(id)  on delete set null,
  name text not null, blurb text, flagged_by text[] default '{}',
  score int check (score is null or (score >= 0 and score <= 60)),
  stage pipeline_stage default 'flagged', agreed agreed_status default 'pending',
  interview_at text, outcome outcome_kind, created_at timestamptz default now()
);
create table classes (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references cycles(id) on delete cascade,
  course text, prof text, campus text, visit_date text,
  advertised text[] default '{}', done boolean default false, created_at timestamptz default now()
);
create table pizza_qas (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references cycles(id) on delete cascade,
  title text, qa_date text, qa_time text, room text,
  registered int default 0, done boolean default false, created_at timestamptz default now()
);
create table sessions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references cycles(id) on delete cascade,
  session_date text, title text, speaker text, kind session_kind default 'talk',
  done boolean default false, sort int default 0, created_at timestamptz default now()
);
create table critical_dates (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references cycles(id) on delete cascade,
  month text, label text, color text, is_key boolean default false, created_at timestamptz default now()
);
create table demo_checklist (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references cycles(id) on delete cascade,
  grp text, label text, owner text, done boolean default false, sort int default 0
);
create table road_teams (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references cycles(id) on delete cascade,
  team text, last_seen text, runs int default 0, status road_status default 'notstarted'
);
create table cohort_teams (
  id uuid primary key default gen_random_uuid(),
  cohort_label text, year text, name text not null, blurb text,
  awards text[] default '{}', phase2 boolean default false, note text, created_at timestamptz default now()
);
create table alumni (
  id uuid primary key default gen_random_uuid(),
  team text, year text, contact text, status rsvp_status default 'pending',
  homecoming_year text, created_at timestamptz default now()
);
create table judges (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references cycles(id) on delete cascade, name text, affiliation text
);
create table scores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  judge_id uuid references judges(id) on delete cascade,
  value int check (value between 0 and 5), unique (team_id, judge_id)
);
-- team total = sum(value over its judges); 6 judges -> ceiling 30.
