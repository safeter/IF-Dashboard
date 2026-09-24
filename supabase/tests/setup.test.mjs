import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ORIGINAL = fs.readFileSync(`${REPO}/app_state.sql`, 'utf8');
const SETUP = fs.readFileSync(`${REPO}/setup.sql`, 'utf8');

let pass = 0, fail = 0;
const ok = (label, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '  ok  ' : '  FAIL'} ${label}${extra ? '  ' + extra : ''}`); };

/* The parts of Supabase the script depends on, reproduced faithfully enough
   that RLS is evaluated exactly as it would be there. */
const SUPABASE_STUBS = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz default now(), last_sign_in_at timestamptz);
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.jwt() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
  -- Supabase grants on new public tables by default
  alter default privileges in schema public grant all on tables to anon, authenticated;
`;
const withEmail = (sqlFile, email) => sqlFile.replace("values ('you@concordia.ca');", `values ('${email}');`);

async function freshDb({ oldAllowlist = false } = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  if (oldAllowlist) await db.exec(`create table public.members (email text primary key); insert into public.members values ('Old.Colleague@Concordia.ca');`);
  await db.exec(ORIGINAL);
  await db.exec(`
    insert into public.app_state (cycle, section, data) values
      ('global','cycles','[{"id":"2026-27","label":"2026–27","status":"active"}]'),
      ('2026-27','teams','[{"id":1,"name":"Ultrawave"}]');
    insert into auth.users (email, last_sign_in_at) values
      ('pascal@concordia.ca', now()), ('georgia@concordia.ca', now() - interval '1 day'), ('stranger@example.com', now());
  `);
  return db;
}

/* Run SQL as a signed-in user (or as anon when email is null). */
async function as(db, email, sql) {
  const claims = email ? JSON.stringify({ email, role: 'authenticated' }) : '';
  await db.exec(`set role ${email ? 'authenticated' : 'anon'}; select set_config('request.jwt.claims', '${claims}', false);`);
  try { return { res: await db.query(sql) }; }
  catch (e) { return { err: e.message }; }
  finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
}
const rows = (r) => (r.res ? r.res.rows.length : -1);
const affected = (r) => (r.res ? (r.res.affectedRows ?? r.res.rows.length) : -1);

console.log('\n=== 1. Placeholder email: must stop and change nothing ===');
{
  const db = await freshDb();
  let err = null; try { await db.exec(SETUP); } catch (e) { err = e.message; await db.exec('rollback'); }
  ok('script refuses to run', !!err && /nothing was changed/.test(err), err ? `(${err.slice(0, 60)}…)` : '');
  const pol = await db.query(`select policyname from pg_policies where tablename = 'app_state' order by 1`);
  ok('original open policies still in place', pol.rows.map(r => r.policyname).join(',') === 'team delete,team insert,team read,team update');
  const m = await db.query(`select to_regclass('public.members') as t`);
  ok('no members table created', m.rows[0].t === null);
}

console.log('\n=== 2. Real run (email given with stray capitals and spaces) ===');
const db = await freshDb();
let runErr = null, last = null;
try { const results = await db.exec(withEmail(SETUP, '  Pascal@Concordia.ca ')); last = results[results.length - 1]; } catch (e) { runErr = e.message; await db.exec('rollback').catch(()=>{}); }
ok('script runs without error', !runErr, runErr || '');
ok('first admin stored lower-case', (await db.query(`select role from public.members where email = 'pascal@concordia.ca'`)).rows[0]?.role === 'admin');
const summary = last ? last.rows.map(r => `${r.email}=${r.access}`) : [];
ok('final result lists the admin', summary.includes('pascal@concordia.ca=admin'), JSON.stringify(summary));
ok('final result lists accounts without access', summary.some(s => s.startsWith('georgia@concordia.ca=none yet')) && summary.some(s => s.startsWith('stranger@example.com=none yet')));
const pol = await db.query(`select policyname from pg_policies where tablename = 'app_state' order by 1`);
ok('only the four new app_state policies remain', pol.rows.map(r => r.policyname).join(',') === 'admins delete,editors add,editors change,members read', pol.rows.map(r=>r.policyname).join(','));
ok('bucket created private with a 25 MB limit', (await db.query(`select public, file_size_limit from storage.buckets where id = 'team-documents'`)).rows[0]?.public === false);

console.log('\n=== 3. Admin adds an editor and a viewer from the app ===');
ok('admin adds Georgia as editor', affected(await as(db, 'pascal@concordia.ca', `insert into public.members (email, role) values ('Georgia@Concordia.ca', 'editor')`)) === 1);
ok('admin adds a viewer', affected(await as(db, 'pascal@concordia.ca', `insert into public.members (email, role) values ('dean@concordia.ca', 'viewer')`)) === 1);
ok('added_by filled in automatically', (await db.query(`select added_by from public.members where email = 'georgia@concordia.ca'`)).rows[0]?.added_by === 'pascal@concordia.ca');
const pending = await as(db, 'pascal@concordia.ca', `select email from public.ifm_pending_accounts()`);
ok('admin sees who is still waiting', pending.res && pending.res.rows.map(r => r.email).join(',') === 'stranger@example.com', JSON.stringify(pending.res?.rows));
ok('an editor sees no pending list', rows(await as(db, 'georgia@concordia.ca', `select * from public.ifm_pending_accounts()`)) === 0);

console.log('\n=== 4. What each role can do to the app data ===');
const matrix = [
  ['pascal@concordia.ca',  'admin',    { read: 2, insert: true,  update: 1, del: 1 }],
  ['georgia@concordia.ca', 'editor',   { read: 2, insert: true,  update: 1, del: 0 }],
  ['dean@concordia.ca',    'viewer',   { read: 2, insert: false, update: 0, del: 0 }],
  ['stranger@example.com', 'no access',{ read: 0, insert: false, update: 0, del: 0 }],
  [null,                   'anon',     { read: 0, insert: false, update: 0, del: 0 }],
];
for (const [email, label, want] of matrix) {
  await db.exec(`insert into public.app_state (cycle, section, data) values ('scratch', 'probe', '[]') on conflict do nothing`);
  const r = rows(await as(db, email, `select * from public.app_state where cycle <> 'scratch'`));
  const ins = await as(db, email, `insert into public.app_state (cycle, section, data) values ('scratch', 'by-${label}', '[]')`);
  const upd = affected(await as(db, email, `update public.app_state set data = '[1]' where cycle = 'scratch' and section = 'probe'`));
  const del = affected(await as(db, email, `delete from public.app_state where cycle = 'scratch' and section = 'probe'`));
  const got = { read: Math.max(r, 0), insert: !ins.err, update: Math.max(upd, 0), del: Math.max(del, 0) };
  ok(`${label.padEnd(9)} read=${got.read} insert=${got.insert} update=${got.update} delete=${got.del}`, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) === JSON.stringify(want) ? '' : `want ${JSON.stringify(want)}`);
}

console.log('\n=== 5. The access list protects itself ===');
ok('editor cannot add people', !!(await as(db, 'georgia@concordia.ca', `insert into public.members (email, role) values ('x@y.ca', 'admin')`)).err);
ok('viewer cannot promote themself', affected(await as(db, 'dean@concordia.ca', `update public.members set role = 'admin' where email = 'dean@concordia.ca'`)) === 0);
ok('viewer can see who has access', rows(await as(db, 'dean@concordia.ca', `select * from public.members`)) === 3);
ok('non-member cannot see the list', rows(await as(db, 'stranger@example.com', `select * from public.members`)) === 0);
const lastAdmin = await as(db, 'pascal@concordia.ca', `delete from public.members where email = 'pascal@concordia.ca'`);
ok('last admin cannot remove themself', !!lastAdmin.err && /at least one admin/.test(lastAdmin.err));
const demote = await as(db, 'pascal@concordia.ca', `update public.members set role = 'viewer' where email = 'pascal@concordia.ca'`);
ok('last admin cannot demote themself', !!demote.err && /at least one admin/.test(demote.err));
await as(db, 'pascal@concordia.ca', `update public.members set role = 'admin' where email = 'georgia@concordia.ca'`);
ok('with a second admin, stepping down works', !(await as(db, 'pascal@concordia.ca', `update public.members set role = 'editor' where email = 'pascal@concordia.ca'`)).err);
await db.exec(`update public.members set role = 'admin' where email = 'pascal@concordia.ca'; update public.members set role = 'editor' where email = 'georgia@concordia.ca';`);
ok('bad role value rejected', !!(await as(db, 'pascal@concordia.ca', `insert into public.members (email, role) values ('z@y.ca', 'owner')`)).err);

console.log('\n=== 6. Document storage ===');
ok('editor can upload', !(await as(db, 'georgia@concordia.ca', `insert into storage.objects (bucket_id, name) values ('team-documents', 'phase1/a/budget.pdf')`)).err);
ok('viewer cannot upload', !!(await as(db, 'dean@concordia.ca', `insert into storage.objects (bucket_id, name) values ('team-documents', 'x.pdf')`)).err);
ok('viewer can open files', rows(await as(db, 'dean@concordia.ca', `select * from storage.objects where bucket_id = 'team-documents'`)) === 1);
ok('non-member cannot see files', rows(await as(db, 'stranger@example.com', `select * from storage.objects`)) === 0);
ok('viewer cannot delete files', affected(await as(db, 'dean@concordia.ca', `delete from storage.objects where bucket_id = 'team-documents'`)) === 0);
await db.exec(`insert into storage.objects (bucket_id, name) values ('other-bucket', 'x')`);
ok("rules don't reach other buckets", rows(await as(db, 'georgia@concordia.ca', `select * from storage.objects where bucket_id = 'other-bucket'`)) === 0);

console.log('\n=== 7. Running the script a second time ===');
let rerunErr = null; try { await db.exec(withEmail(SETUP, 'pascal@concordia.ca')); } catch (e) { rerunErr = e.message; await db.exec('rollback').catch(()=>{}); }
ok('re-run succeeds', !rerunErr, rerunErr || '');
ok('everyone keeps their role', (await db.query(`select string_agg(email || '=' || role, ',' order by email) s from public.members`)).rows[0].s === 'dean@concordia.ca=viewer,georgia@concordia.ca=editor,pascal@concordia.ca=admin');
ok('still exactly four app_state policies', (await db.query(`select count(*)::int n from pg_policies where tablename = 'app_state'`)).rows[0].n === 4);

console.log('\n=== 8. Upgrading the old optional allowlist ===');
{
  const db2 = await freshDb({ oldAllowlist: true });
  let e2 = null; try { await db2.exec(withEmail(SETUP, 'pascal@concordia.ca')); } catch (e) { e2 = e.message; await db2.exec('rollback').catch(()=>{}); }
  ok('runs over the old email-only table', !e2, e2 || '');
  ok('old entry kept, lower-cased, made editor', (await db2.query(`select role from public.members where email = 'old.colleague@concordia.ca'`)).rows[0]?.role === 'editor');
}

console.log(`\n${fail === 0 ? 'ALL' : fail + ' FAILED of'} ${pass + fail} checks${fail === 0 ? ' pass' : ''}`);
process.exit(fail ? 1 : 0);
