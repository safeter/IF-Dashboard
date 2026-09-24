-- ############################################################
-- NOT YET — DON'T RUN. This script is frozen, parked for later.
-- It turns on roles (admin / editor / viewer) and document storage, and
-- the app half that uses them is not built yet. Running it now would
-- lock out every colleague who isn't added to the access list, with no
-- screen in the app to add them. See docs/frozen/README.md.
-- ############################################################

-- ============================================================
-- Innovation Fund Manager — setup script
--
-- Paste the whole file into Supabase → SQL Editor → Run.
-- It is safe to run again: every step checks what already exists.
--
-- BEFORE RUNNING: change ONE thing — the email on the line marked
-- "EDIT THIS" below. Use the exact address you sign in to the app with.
-- That person becomes the first admin. If the line is left as it is,
-- the script stops and changes nothing.
--
-- Part 1  Who can use the app, and what each person can do.
-- Part 2  Private storage for team documents (budgets, calendars…).
-- Each part is its own transaction: if Part 2 fails, Part 1 is kept.
--
-- Optional, separate file: supabase/reminders.sql (weekly email of
-- overdue deliverables).
-- ============================================================


-- ============================================================
-- PART 1 — ROLES
--
--   admin   everything, plus: manage who has access, restore backups,
--           start / rename / delete cycles
--   editor  add and change data, upload documents
--   viewer  read only
--
-- Anyone signed in who is NOT on the list sees nothing. Until now every
-- signed-in account could read and change everything — and Supabase lets
-- new accounts register by default — so this also closes that door.
-- ============================================================
begin;

create temp table _ifm_setup (first_admin text) on commit drop;
insert into _ifm_setup values ('you@concordia.ca');   -- <<< EDIT THIS: your sign-in email

-- Refuse to run with the placeholder, so nobody locks themselves out.
do $$
declare v text;
begin
  select lower(trim(first_admin)) into v from _ifm_setup;
  if v is null or v = 'you@concordia.ca' or position('@' in v) < 2 then
    raise exception 'Setup stopped, nothing was changed: put your own sign-in email on the line marked "EDIT THIS" near the top, then run again.';
  end if;
end $$;

-- The access list. If an older allowlist table called "members" already
-- exists (the optional one from app_state.sql), it is upgraded in place and
-- everyone already on it keeps full editing rights.
create table if not exists public.members (
  email    text primary key,
  role     text,
  name     text,
  added_at timestamptz not null default now(),
  added_by text
);
alter table public.members add column if not exists role     text;
alter table public.members add column if not exists name     text;
alter table public.members add column if not exists added_at timestamptz not null default now();
alter table public.members add column if not exists added_by text;
update public.members set email = lower(trim(email)) where email <> lower(trim(email));
update public.members set role = 'editor' where role is null;
alter table public.members alter column role set not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_role_check' and conrelid = 'public.members'::regclass) then
    alter table public.members add constraint members_role_check check (role in ('admin', 'editor', 'viewer'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'members_email_check' and conrelid = 'public.members'::regclass) then
    alter table public.members add constraint members_email_check check (email = lower(email) and position('@' in email) > 1);
  end if;
end $$;

insert into public.members (email, role, added_by)
select lower(trim(first_admin)), 'admin', 'setup script' from _ifm_setup
on conflict (email) do update set role = 'admin';

-- The signed-in person's role, or null if they are not on the list.
-- SECURITY DEFINER so policies can call it without tripping the members
-- table's own policies.
create or replace function public.app_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.members
  where email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;
revoke all on function public.app_role() from public, anon;
grant execute on function public.app_role() to authenticated;

-- Never let the last admin be removed or demoted.
create or replace function public.ifm_keep_one_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (select 1 from public.members where role = 'admin' and email <> old.email) then
    raise exception 'There must always be at least one admin. Make someone else an admin first.';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists ifm_keep_one_admin on public.members;
create trigger ifm_keep_one_admin
  before update or delete on public.members
  for each row execute function public.ifm_keep_one_admin();

-- Who added whom, filled in automatically.
create or replace function public.ifm_stamp_member()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.email := lower(trim(new.email));
  if new.added_by is null then new.added_by := lower(auth.jwt() ->> 'email'); end if;
  return new;
end $$;
drop trigger if exists ifm_stamp_member on public.members;
create trigger ifm_stamp_member
  before insert on public.members
  for each row execute function public.ifm_stamp_member();

-- Access rules on the list itself: members can see who has access; only
-- admins can change it. Every existing policy on the table is replaced, so
-- nothing older can quietly widen access.
alter table public.members enable row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'members' loop
    execute format('drop policy %I on public.members', p.policyname);
  end loop;
end $$;
create policy "members can see the list" on public.members
  for select to authenticated using (public.app_role() is not null);
create policy "admins add people" on public.members
  for insert to authenticated with check (public.app_role() = 'admin');
create policy "admins change roles" on public.members
  for update to authenticated using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy "admins remove people" on public.members
  for delete to authenticated using (public.app_role() = 'admin');
revoke all on public.members from anon;
grant select, insert, update, delete on public.members to authenticated;

-- Access rules on the app's data. Every existing policy on app_state is
-- dropped first: policies combine with OR, so one leftover "using (true)"
-- would silently cancel every role below.
alter table public.app_state enable row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_state' loop
    execute format('drop policy %I on public.app_state', p.policyname);
  end loop;
end $$;
create policy "members read" on public.app_state
  for select to authenticated using (public.app_role() is not null);
create policy "editors add" on public.app_state
  for insert to authenticated with check (public.app_role() in ('admin', 'editor'));
create policy "editors change" on public.app_state
  for update to authenticated
  using (public.app_role() in ('admin', 'editor'))
  with check (public.app_role() in ('admin', 'editor'));
create policy "admins delete" on public.app_state
  for delete to authenticated using (public.app_role() = 'admin');
revoke all on public.app_state from anon;
grant select, insert, update, delete on public.app_state to authenticated;

-- People who have an account but are not on the list yet. Admins see them in
-- the app's "Team access" panel and can let them in with one click. Returns
-- nothing to anyone else.
create or replace function public.ifm_pending_accounts()
returns table (email text, created_at timestamptz, last_sign_in_at timestamptz)
language sql stable security definer
set search_path = public, auth
as $$
  select lower(u.email)::text, u.created_at, u.last_sign_in_at
  from auth.users u
  where public.app_role() = 'admin'
    and u.email is not null
    and not exists (select 1 from public.members m where m.email = lower(u.email))
  order by u.last_sign_in_at desc nulls last, u.created_at desc
$$;
revoke all on function public.ifm_pending_accounts() from public, anon;
grant execute on function public.ifm_pending_accounts() to authenticated;

commit;


-- ============================================================
-- PART 2 — DOCUMENT STORAGE
--
-- A private bucket. Files are never public: the app fetches a short-lived
-- link each time someone opens one. Members can open files; admins and
-- editors can upload, replace and delete them. 25 MB per file; office
-- documents, PDFs, images and CSV only.
--
-- If this part fails with "must be owner of table objects", your project
-- manages storage rules through the dashboard: Part 1 is already saved, and
-- the four rules below can be added in Storage → Policies instead.
-- ============================================================
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-documents', 'team-documents', false, 26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/csv', 'text/plain',
    'image/png', 'image/jpeg'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Only this app's own rules are replaced; rules for any other bucket are
-- left alone.
drop policy if exists "ifm members open documents"    on storage.objects;
drop policy if exists "ifm editors upload documents"  on storage.objects;
drop policy if exists "ifm editors replace documents" on storage.objects;
drop policy if exists "ifm editors delete documents"  on storage.objects;

create policy "ifm members open documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'team-documents' and public.app_role() is not null);
create policy "ifm editors upload documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'team-documents' and public.app_role() in ('admin', 'editor'));
create policy "ifm editors replace documents" on storage.objects
  for update to authenticated
  using (bucket_id = 'team-documents' and public.app_role() in ('admin', 'editor'))
  with check (bucket_id = 'team-documents' and public.app_role() in ('admin', 'editor'));
create policy "ifm editors delete documents" on storage.objects
  for delete to authenticated
  using (bucket_id = 'team-documents' and public.app_role() in ('admin', 'editor'));

commit;


-- ============================================================
-- Done. The result below lists who has access now, and anyone with an
-- account who does not yet. Colleagues who used the app before today are
-- in the second group until an admin lets them in: sidebar → Team access.
-- ============================================================
select email, role as access, added_at::date as since
from public.members
union all
select lower(u.email), 'none yet — add in Team access', u.created_at::date
from auth.users u
where u.email is not null
  and not exists (select 1 from public.members m where m.email = lower(u.email))
order by 2, 1;
