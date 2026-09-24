import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ORIGINAL = fs.readFileSync(`${REPO}/app_state.sql`, 'utf8');
const SETUP = fs.readFileSync(`${REPO}/setup.sql`, 'utf8').replace("values ('you@concordia.ca');", "values ('pascal@concordia.ca');");
// PGlite has no pg_cron / pg_net binaries; the stubs below stand in for them.
const REMINDERS_RAW = fs.readFileSync(`${REPO}/reminders.sql`, 'utf8');
const REMINDERS = REMINDERS_RAW.replace(/create extension if not exists pg_cron;\n/, '').replace(/create extension if not exists pg_net;\n/, '');
const withKey = (s, k) => s.replace("'re_PASTE_YOUR_RESEND_API_KEY',", `'${k}',`);

let pass = 0, fail = 0;
const ok = (l, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? '  ok  ' : '  FAIL'} ${l}${x ? '  ' + x : ''}`); };
const iso = (off) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + off); return d.toISOString().slice(0, 10); };

const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz default now(), last_sign_in_at timestamptz);
  create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.jwt() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  -- Vault
  create schema vault;
  create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text, description text);
  create view vault.decrypted_secrets as select id, name, secret as decrypted_secret, description from vault.secrets;
  create function vault.create_secret(new_secret text, new_name text, new_description text default '') returns uuid language sql as
    $$ insert into vault.secrets (name, secret, description) values (new_name, new_secret, new_description) returning id $$;
  create function vault.update_secret(secret_id uuid, new_secret text) returns void language sql as
    $$ update vault.secrets set secret = new_secret where id = secret_id $$;
  -- pg_net: record the request instead of sending it
  create schema net;
  create table net.sent (id bigserial primary key, url text, headers jsonb, body jsonb);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language sql as $$ insert into net.sent (url, headers, body) values (url, headers, body) returning id $$;
  -- pg_cron
  create schema cron;
  create table cron.job (jobid serial primary key, jobname text unique, schedule text, command text);
  create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as
    $$ insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
       on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
  create function cron.unschedule(job_name text) returns boolean language sql as $$ delete from cron.job where jobname = job_name returning true $$;
`);
await db.exec(ORIGINAL);
await db.exec(SETUP);
await db.exec(`insert into public.members (email, role) values ('georgia@concordia.ca', 'editor'), ('dean@concordia.ca', 'viewer')`);

const profiles = [
  { name: 'Ultrawave', deliverables: [
      { title: 'Interim report', due: iso(-5), status: 'pending' },
      { title: 'Budget and calendar', due: iso(0), status: 'pending' },
      { title: 'Pitch deck', due: iso(3), status: 'pending' },
      { title: 'Final report', due: iso(20), status: 'pending' },     // too far out
      { title: 'Signed agreement', due: iso(-10), status: 'submitted' }, // already in
      { title: 'Typo date', due: '2026-02-31', status: 'pending' },     // not a real day
      { title: 'No date', due: '', status: 'pending' } ] },
  { name: 'Cyber-Eye', status: 'withdrawn', deliverables: [{ title: 'Should not appear', due: iso(-3), status: 'pending' }] },
  { name: 'Tutela AI', deliverables: 'not-an-array' },
  { name: '', deliverables: [{ title: '', due: iso(-1) }] },
];
await db.query(`insert into public.app_state (cycle, section, data) values
  ('global', 'cycles', $1), ('2026-27', 'teamProfiles', $2), ('2025-26', 'teamProfiles', $3)`,
  [JSON.stringify([{ id: '2025-26', status: 'past' }, { id: '2026-27', status: 'active' }]),
   JSON.stringify(profiles),
   JSON.stringify([{ name: 'Last year', deliverables: [{ title: 'Old', due: iso(-2) }] }])]);

console.log('\n=== 1. Placeholder key: stops, changes nothing ===');
let e1 = null; try { await db.exec(REMINDERS); } catch (e) { e1 = e.message; await db.exec('rollback'); }
ok('refuses without a real key', !!e1 && /nothing was changed/.test(e1));
ok('no secret stored', (await db.query(`select count(*)::int n from vault.secrets`)).rows[0].n === 0);
ok('nothing scheduled', (await db.query(`select count(*)::int n from cron.job`)).rows[0].n === 0);

console.log('\n=== 2. Real run ===');
let e2 = null, last = null;
try { const r = await db.exec(withKey(REMINDERS, 're_test_123')); last = r[r.length - 1]; } catch (e) { e2 = e.message; await db.exec('rollback').catch(() => {}); }
ok('runs without error', !e2, e2 || '');
const listed = last ? last.rows.map(r => `${r.team}: ${r.deliverable} (${r.days_late})`) : [];
console.log('     digest:', JSON.stringify(listed));
ok('lists overdue, due-today and due-soon only', listed.length === 4
  && listed.includes('Ultrawave: Interim report (5)') && listed.includes('Ultrawave: Budget and calendar (0)')
  && listed.includes('Ultrawave: Pitch deck (-3)') && listed.includes('Untitled team: Untitled deliverable (1)'));
ok('skips submitted, far-off, undated and impossible dates', !listed.some(l => /Signed agreement|Final report|Typo date|No date/.test(l)));
ok('skips withdrawn teams', !listed.some(l => /Cyber-Eye/.test(l)));
ok('skips past cycles', !listed.some(l => /Last year/.test(l)));
ok('scheduled for Monday 12:00 UTC', (await db.query(`select schedule from cron.job where jobname = 'ifm-weekly-reminders'`)).rows[0]?.schedule === '0 12 * * 1');
ok('key stored in vault', (await db.query(`select secret from vault.secrets where name = 'ifm_resend_api_key'`)).rows[0]?.secret === 're_test_123');

console.log('\n=== 3. Sending ===');
const res = (await db.query(`select public.ifm_send_reminder_digest() r`)).rows[0].r;
console.log('     result:', res);
const sent = (await db.query(`select * from net.sent order by id desc limit 1`)).rows[0];
ok('posts to the Resend API', sent?.url === 'https://api.resend.com/emails');
ok('authorises with the stored key', sent?.headers?.Authorization === 'Bearer re_test_123');
ok('sends to admins and editors, not viewers', JSON.stringify(sent?.body?.to) === JSON.stringify(['georgia@concordia.ca', 'pascal@concordia.ca']));
ok('subject counts the items', sent?.body?.subject === 'Innovation Fund: 4 deliverables overdue or due this week', sent?.body?.subject);
console.log('     ---- email body ----\n' + String(sent?.body?.text).split('\n').map(l => '     ' + l).join('\n'));

console.log('\n=== 4. Quiet weeks and safety ===');
await db.query(`update public.app_state set data = '[]' where cycle = '2026-27' and section = 'teamProfiles'`);
const before = (await db.query(`select count(*)::int n from net.sent`)).rows[0].n;
const quiet = (await db.query(`select public.ifm_send_reminder_digest() r`)).rows[0].r;
ok('nothing due → no email', (await db.query(`select count(*)::int n from net.sent`)).rows[0].n === before, quiet);
await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"email":"pascal@concordia.ca"}', false);`);
let denied = null; try { await db.query(`select public.ifm_send_reminder_digest()`); } catch (e) { denied = e.message; }
let denied2 = null; try { await db.query(`select * from public.ifm_reminder_digest()`); } catch (e) { denied2 = e.message; }
await db.exec(`reset role;`);
ok('app users cannot trigger the sender', !!denied && /permission denied/.test(denied));
ok('app users cannot call the digest directly', !!denied2 && /permission denied/.test(denied2));

console.log('\n=== 5. Running it again with a new key ===');
let e3 = null; try { await db.exec(withKey(REMINDERS, 're_rotated_456')); } catch (e) { e3 = e.message; await db.exec('rollback').catch(() => {}); }
ok('re-run succeeds', !e3, e3 || '');
ok('key replaced, not duplicated', (await db.query(`select count(*)::int n, max(secret) s from vault.secrets where name = 'ifm_resend_api_key'`)).rows[0].s === 're_rotated_456');
ok('still one scheduled job', (await db.query(`select count(*)::int n from cron.job`)).rows[0].n === 1);

console.log(`\n${fail === 0 ? 'ALL' : fail + ' FAILED of'} ${pass + fail} checks${fail === 0 ? ' pass' : ''}`);
process.exit(fail ? 1 : 0);
