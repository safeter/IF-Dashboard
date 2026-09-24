-- ############################################################
-- NOT YET — DON'T RUN. Frozen, parked for later, and it depends on
-- setup.sql, which is frozen too. See docs/frozen/README.md.
-- ############################################################

-- ============================================================
-- Innovation Fund Manager — weekly reminder email (OPTIONAL)
--
-- Every Monday morning, admins and editors get one email listing the
-- deliverables that are overdue or due in the next 7 days, across the
-- active cycle's Phase I teams. Nothing is sent in a week with nothing due.
--
-- Run supabase/setup.sql first.
--
-- You need an email-sending service. This uses Resend (resend.com), whose
-- free tier is plenty for a weekly email:
--   1. Sign up, then Settings → API Keys → Create API key (sending access).
--   2. To send to your colleagues, verify a sending domain in Resend.
--      Without one, you can only use onboarding@resend.dev, which delivers
--      ONLY to the email address your Resend account was created with —
--      fine for trying it out, not for the whole team.
--
-- Then edit the two values on the line marked "EDIT THIS" and run the whole
-- file in Supabase → SQL Editor. The key is stored encrypted in Supabase
-- Vault, never in a table. Safe to run again (e.g. to change the key).
-- ============================================================
begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;

create temp table _ifm_mail (api_key text, sender text) on commit drop;
insert into _ifm_mail values (
  're_PASTE_YOUR_RESEND_API_KEY',                           -- <<< EDIT THIS: your Resend API key
  'Innovation Fund Manager <onboarding@resend.dev>'         -- <<< and the sender (a verified address)
);

do $$
declare k text;
begin
  select api_key into k from _ifm_mail;
  if k is null or k like 're_PASTE%' or k not like 're_%' then
    raise exception 'Reminders not set up, nothing was changed: paste your Resend API key (it starts with re_) on the line marked "EDIT THIS", then run again.';
  end if;
end $$;

-- Store the key and sender in Vault (encrypted). Update them if they exist.
do $$
declare
  k text; s text; kid uuid; sid uuid;
begin
  select api_key, sender into k, s from _ifm_mail;
  select id into kid from vault.decrypted_secrets where name = 'ifm_resend_api_key';
  select id into sid from vault.decrypted_secrets where name = 'ifm_reminder_from';
  if kid is null then perform vault.create_secret(k, 'ifm_resend_api_key', 'Innovation Fund Manager: Resend API key');
  else perform vault.update_secret(kid, k); end if;
  if sid is null then perform vault.create_secret(s, 'ifm_reminder_from', 'Innovation Fund Manager: reminder sender');
  else perform vault.update_secret(sid, s); end if;
end $$;

-- A date typed into the app that is not a real day (say 2026-02-31) is
-- skipped rather than stopping the whole email.
create or replace function public.ifm_try_date(v text)
returns date
language plpgsql immutable
as $$
begin
  if v !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  return v::date;
exception when others then
  return null;
end $$;

-- What the next email would list: outstanding deliverables of running
-- (not withdrawn) teams in the active cycle, overdue or due within 7 days.
create or replace function public.ifm_reminder_digest()
returns table (team text, deliverable text, due date, days_late integer)
language sql stable security definer
set search_path = public
as $$
  with active as (
    select c ->> 'id' as id
    from public.app_state s, jsonb_array_elements(s.data) c
    where s.cycle = 'global' and s.section = 'cycles'
      and jsonb_typeof(s.data) = 'array' and c ->> 'status' = 'active'
    limit 1
  ), profiles as (
    select p
    from public.app_state s
    join active a on s.cycle = a.id
    cross join lateral jsonb_array_elements(case when jsonb_typeof(s.data) = 'array' then s.data else '[]'::jsonb end) p
    where s.section = 'teamProfiles'
  ), items as (
    select
      coalesce(nullif(trim(p ->> 'name'), ''), 'Untitled team') as team,
      coalesce(nullif(trim(d ->> 'title'), ''), 'Untitled deliverable') as deliverable,
      public.ifm_try_date(d ->> 'due') as due
    from profiles
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(p -> 'deliverables') = 'array' then p -> 'deliverables' else '[]'::jsonb end
    ) d
    where coalesce(p ->> 'status', 'active') <> 'withdrawn'
      and coalesce(d ->> 'status', 'pending') <> 'submitted'
  )
  select team, deliverable, due, (current_date - due)::integer
  from items
  where due is not null and due <= current_date + 7
  order by due, team, deliverable
$$;

-- Build and send the email. Returns a line saying what happened.
create or replace function public.ifm_send_reminder_digest()
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  api_key text; sender text; recipients text[]; lines text; n integer; req bigint;
begin
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'ifm_resend_api_key';
  select decrypted_secret into sender  from vault.decrypted_secrets where name = 'ifm_reminder_from';
  if api_key is null then return 'No Resend key stored — run reminders.sql again.'; end if;

  select array_agg(email order by email) into recipients from public.members where role in ('admin', 'editor');
  if recipients is null then return 'Nobody to send to.'; end if;

  select count(*), string_agg(
           format('• %s — %s: %s', team, deliverable,
             case when days_late > 1 then format('overdue by %s days', days_late)
                  when days_late = 1 then 'overdue by 1 day'
                  when days_late = 0 then 'due today'
                  else 'due ' || to_char(due, 'Dy FMDD Mon') end),
           E'\n' order by due, team, deliverable)
    into n, lines
  from public.ifm_reminder_digest();

  if n = 0 then return 'Nothing overdue or due this week — no email sent.'; end if;

  select net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'from', coalesce(sender, 'Innovation Fund Manager <onboarding@resend.dev>'),
      'to', to_jsonb(recipients),
      'subject', format('Innovation Fund: %s deliverable%s overdue or due this week', n, case when n = 1 then '' else 's' end),
      'text', 'Deliverables to chase this week:' || E'\n\n' || lines || E'\n\n' ||
              'Open Innovation Fund Manager → Phase I teams → Deliverables to send each team a reminder.'
    )
  ) into req;

  return format('Sent to %s recipient%s, listing %s item%s (request %s).',
    array_length(recipients, 1), case when array_length(recipients, 1) = 1 then '' else 's' end,
    n, case when n = 1 then '' else 's' end, req);
end $$;

-- These read everything and hold the key: callable by the scheduler only,
-- never through the app's public API.
revoke all on function public.ifm_try_date(text) from public, anon, authenticated;
revoke all on function public.ifm_reminder_digest() from public, anon, authenticated;
revoke all on function public.ifm_send_reminder_digest() from public, anon, authenticated;

-- Every Monday at 12:00 UTC: 8 a.m. in Montréal in summer, 7 a.m. in winter.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ifm-weekly-reminders') then
    perform cron.unschedule('ifm-weekly-reminders');
  end if;
  perform cron.schedule('ifm-weekly-reminders', '0 12 * * 1', 'select public.ifm_send_reminder_digest()');
end $$;

commit;

-- ============================================================
-- Done. The result below is what next Monday's email would list today.
--
-- Send one now, to check it arrives:   select public.ifm_send_reminder_digest();
-- Change the day or time:              run this file again after editing '0 12 * * 1'
-- Stop the weekly email:               select cron.unschedule('ifm-weekly-reminders');
-- ============================================================
select * from public.ifm_reminder_digest();
