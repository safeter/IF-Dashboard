import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ORIGINAL = fs.readFileSync(`${REPO}/app_state.sql`, 'utf8');
const ACCESS = fs.readFileSync(`${REPO}/access.sql`, 'utf8');

let pass = 0, fail = 0;
const ok = (label, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '  ok  ' : '  FAIL'} ${label}${extra ? '  ' + extra : ''}`); };

/* The parts of Supabase the script depends on. Accounts are created by the
   auth server's own role, which has no rights on the public schema — the
   same as on Supabase, so the registration check must work without them. */
const SUPABASE_STUBS = `
  create role anon nologin; create role authenticated nologin; create role supabase_auth_admin nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz default now());
  grant usage on schema auth to supabase_auth_admin; grant all on auth.users to supabase_auth_admin;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.jwt() to anon, authenticated;
  -- Supabase grants on new public tables by default
  alter default privileges in schema public grant all on tables to anon, authenticated;
`;

async function freshDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(ORIGINAL);
  await db.exec(`
    insert into public.app_state (cycle, section, data) values ('2026-27','teams','[{"id":1,"name":"Ultrawave"}]');
    insert into auth.users (email) values ('Pascal@Concordia.ca'), ('georgia@concordia.ca');
    -- a leftover wide-open rule under another name must not survive
    create policy "anyone at all" on public.app_state for select to authenticated using (true);
  `);
  return db;
}

async function as(db, email, sql) {
  const claims = email ? JSON.stringify({ email, role: 'authenticated' }) : '';
  await db.exec(`set role ${email ? 'authenticated' : 'anon'}; select set_config('request.jwt.claims', '${claims}', false);`);
  try { return { res: await db.query(sql) }; }
  catch (e) { return { err: e.message }; }
  finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
}
/* Create an account the way the auth server does when someone registers. */
async function register(db, email) {
  await db.exec('set role supabase_auth_admin');
  try { await db.query('insert into auth.users (email) values ($1)', [email]); return null; }
  catch (e) { return e.message; }
  finally { await db.exec('reset role'); }
}
const rows = (r) => (r.res ? r.res.rows.length : -1);
const affected = (r) => (r.res ? (r.res.affectedRows ?? r.res.rows.length) : -1);

console.log('\n=== 1. First run ===');
const db = await freshDb();
let last = null, runErr = null;
try { const r = await db.exec(ACCESS); last = r[r.length - 1]; } catch (e) { runErr = e.message; }
ok('script runs without error', !runErr, runErr || '');
const listed = (await db.query('select email from public.access_list order by 1')).rows.map(r => r.email);
ok('everyone with an account is on the list, lower-case', listed.join(',') === 'georgia@concordia.ca,pascal@concordia.ca', listed.join(','));
ok('final result shows the list', last && last.rows.length === 2 && last.rows.every(r => r.account === 'registered'), JSON.stringify(last?.rows?.map(r => r.email + ':' + r.account)));
const pols = (await db.query(`select policyname from pg_policies where tablename = 'app_state' order by 1`)).rows.map(r => r.policyname);
ok('every older rule replaced, including a stray open one', pols.join(',') === 'listed people add,listed people change,listed people delete,listed people read', pols.join(','));

console.log('\n=== 2. People already using the app keep working ===');
ok('existing user reads the data', rows(await as(db, 'pascal@concordia.ca', 'select * from public.app_state')) === 1);
ok('existing user saves a change', affected(await as(db, 'georgia@concordia.ca', `update public.app_state set data = '[]' where section = 'teams'`)) === 1);
ok('existing user adds a section', !(await as(db, 'georgia@concordia.ca', `insert into public.app_state (cycle, section) values ('2026-27','notes')`)).err);
ok('the check ignores capitals in the sign-in email', rows(await as(db, 'PASCAL@concordia.ca', 'select * from public.app_state')) === 2);

console.log('\n=== 3. Registration ===');
const strangerErr = await register(db, 'stranger@example.com');
ok('an address not on the list cannot register', !!strangerErr && /not on the access list/.test(strangerErr), strangerErr ? `(${strangerErr.slice(0, 70)}…)` : '');
ok('…and no account was created', (await db.query(`select 1 from auth.users where email = 'stranger@example.com'`)).rows.length === 0);
ok('an account without an email cannot be created', !!(await register(db, null)));
await db.exec(`insert into public.access_list (email) values ('  New.Judge@Concordia.ca ')`);
ok('an address added by hand is tidied to lower-case', (await db.query(`select 1 from public.access_list where email = 'new.judge@concordia.ca'`)).rows.length === 1);
const judgeErr = await register(db, 'New.Judge@concordia.ca');
ok('a listed address can register (any capitals)', !judgeErr, judgeErr || '');
ok('…and then sees the data', rows(await as(db, 'new.judge@concordia.ca', 'select * from public.app_state')) === 2);

console.log('\n=== 4. Outsiders see nothing ===');
// someone who registered while listed, then was taken off the list
await db.exec(`insert into public.access_list (email) values ('old.account@example.com')`);
ok('(setup) listed account registers', !(await register(db, 'old.account@example.com')));
await db.exec(`delete from public.access_list where email = 'old.account@example.com'`);
ok('signed in but not listed: reads nothing', rows(await as(db, 'old.account@example.com', 'select * from public.app_state')) === 0);
ok('signed in but not listed: cannot change', affected(await as(db, 'old.account@example.com', `update public.app_state set data = '"x"'`)) === 0);
ok('signed in but not listed: cannot add', !!(await as(db, 'old.account@example.com', `insert into public.app_state (cycle, section) values ('x','y')`)).err);
ok('signed in but not listed: cannot delete', affected(await as(db, 'old.account@example.com', `delete from public.app_state`)) === 0);
ok('not signed in: reads nothing', !!(await as(db, null, 'select * from public.app_state')).err || rows(await as(db, null, 'select * from public.app_state')) === 0);
ok('the app can ask "do I have access?" — yes', (await as(db, 'pascal@concordia.ca', 'select public.ifm_has_access() as a')).res?.rows[0].a === true);
ok('the app can ask "do I have access?" — no', (await as(db, 'old.account@example.com', 'select public.ifm_has_access() as a')).res?.rows[0].a === false);
ok('not signed in: cannot ask', !!(await as(db, null, 'select public.ifm_has_access()')).err);
ok('signed-in people cannot read the list', !!(await as(db, 'pascal@concordia.ca', 'select * from public.access_list')).err);
ok('signed-in people cannot add themselves to the list', !!(await as(db, 'old.account@example.com', `insert into public.access_list (email) values ('old.account@example.com')`)).err);
ok('signed-in people cannot run the registration check directly', !!(await as(db, 'pascal@concordia.ca', 'select public.ifm_check_signup()')).err);

console.log('\n=== 5. Removing someone takes their access away ===');
await db.exec(`delete from public.access_list where email = 'georgia@concordia.ca'`);
ok('removed person reads nothing', rows(await as(db, 'georgia@concordia.ca', 'select * from public.app_state')) === 0);

console.log('\n=== 6. Running it again ===');
let again = null; try { await db.exec(ACCESS); } catch (e) { again = e.message; }
ok('second run has no errors', !again, again || '');
const pols2 = (await db.query(`select policyname from pg_policies where tablename = 'app_state'`)).rows.length;
ok('still exactly four rules', pols2 === 4, String(pols2));
ok('one registration check, not two', (await db.query(`select count(*)::int n from pg_trigger where tgname = 'ifm_check_signup'`)).rows[0].n === 1);
ok('someone you removed stays removed', (await db.query(`select 1 from public.access_list where email = 'georgia@concordia.ca'`)).rows.length === 0);
ok('…and still sees nothing', rows(await as(db, 'georgia@concordia.ca', 'select * from public.app_state')) === 0);
ok('people added by hand are kept', (await db.query(`select 1 from public.access_list where email = 'new.judge@concordia.ca'`)).rows.length === 1);

console.log(`\n${fail ? 'FAILED' : 'ALL'} ${pass}/${pass + fail} checks${fail ? ` (${fail} failed)` : ' pass'}`);
process.exit(fail ? 1 : 0);
