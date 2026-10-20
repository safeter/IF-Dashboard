-- ============================================================
-- Innovation Fund Manager — who may register (RUN THIS ONE)
--
-- The app's sign-in screen has a Register tab. Without this script, ANYONE
-- who finds the site could create an account and read and change all the
-- data. With it, only email addresses on the access list can register,
-- and only people on the list can see the data.
--
-- Paste the whole file into Supabase → SQL Editor → Run. Safe to run again.
--
-- The first time it runs, everyone who already has an account is put on
-- the list, so nobody who uses the app today is locked out. The result at the end shows the list:
-- remove anyone you don't recognise.
--
-- To let someone in later: Supabase → Table Editor → access_list →
-- Insert row → their email. They can then register on the app.
-- To take someone's access away: delete their row.
-- ============================================================
begin;

-- Existing accounts are copied onto the list on the first run only, so
-- running this again never gives back access you took away.
create temp table _ifm_first_run on commit drop as
  select to_regclass('public.access_list') is null as first_run;

-- The list. Addresses are stored lower-case so "Pascal@Concordia.ca" and
-- "pascal@concordia.ca" are the same person.
create table if not exists public.access_list (
  email    text primary key check (email = lower(trim(email)) and position('@' in email) > 1),
  note     text,
  added_at timestamptz not null default now()
);
create or replace function public.ifm_tidy_access_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end $$;
drop trigger if exists ifm_tidy_access_email on public.access_list;
create trigger ifm_tidy_access_email
  before insert or update on public.access_list
  for each row execute function public.ifm_tidy_access_email();

-- Nobody reads or edits the list through the app's public API: not even
-- signed-in people can see who else is on it. It is managed from the
-- Supabase dashboard, which is not subject to these rules.
alter table public.access_list enable row level security;
revoke all on public.access_list from anon, authenticated;

-- Everyone with an account today keeps access (first run only).
insert into public.access_list (email, note)
select lower(trim(email)), 'had an account before the access list'
from auth.users
where email is not null and position('@' in email) > 1
  and (select first_run from _ifm_first_run)
on conflict (email) do nothing;

-- Is the signed-in person on the list? SECURITY DEFINER so it can read the
-- list, which signed-in people otherwise can't.
create or replace function public.ifm_has_access()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.access_list
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;
revoke all on function public.ifm_has_access() from public, anon;
grant execute on function public.ifm_has_access() to authenticated;

-- Registration: refuse to create an account for an address not on the list.
-- This also applies to "Add user" in the Supabase dashboard, so the list is
-- the one place that decides.
create or replace function public.ifm_check_signup()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.email is null or not exists (
    select 1 from public.access_list where email = lower(trim(new.email))
  ) then
    raise exception 'Innovation Fund Manager: % is not on the access list (Table Editor → access_list).', coalesce(new.email, 'this account');
  end if;
  return new;
end $$;
revoke all on function public.ifm_check_signup() from public, anon, authenticated;
drop trigger if exists ifm_check_signup on auth.users;
create trigger ifm_check_signup
  before insert on auth.users
  for each row execute function public.ifm_check_signup();

-- The data: only people on the list. Every existing rule on app_state is
-- replaced: rules combine with OR, so one leftover "anyone signed in" rule
-- would cancel the list.
alter table public.app_state enable row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_state' loop
    execute format('drop policy %I on public.app_state', p.policyname);
  end loop;
end $$;
create policy "listed people read"   on public.app_state for select to authenticated using (public.ifm_has_access());
create policy "listed people add"    on public.app_state for insert to authenticated with check (public.ifm_has_access());
create policy "listed people change" on public.app_state for update to authenticated using (public.ifm_has_access()) with check (public.ifm_has_access());
create policy "listed people delete" on public.app_state for delete to authenticated using (public.ifm_has_access());
revoke all on public.app_state from anon;
grant select, insert, update, delete on public.app_state to authenticated;

commit;

-- ============================================================
-- Done. Who is on the access list now, and whether they have registered:
-- ============================================================
select a.email,
       case when u.id is null then 'not registered yet' else 'registered' end as account,
       a.note,
       a.added_at::date as since
from public.access_list a
left join auth.users u on lower(u.email) = a.email
order by 2, 1;
