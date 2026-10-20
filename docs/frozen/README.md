# Frozen work: roles, reminders, document uploads

Parked on purpose, to be picked up later. **Nothing here is live, and none of it should be run yet.**

## What's parked

| Piece | Where | State |
|---|---|---|
| Supabase setup: roles + document storage | `supabase/setup.sql` | Written and tested (38 checks). **Don't run** until the app side below is finished — it would lock out every colleague not yet on the access list, and there's no screen to add them. |
| Weekly reminder email | `supabase/reminders.sql` | Written and tested (20 checks). Depends on `setup.sql`. Needs a [Resend](https://resend.com) account. |
| App side of roles | `docs/frozen/roles-app.patch` | About half done: the sign-in check, the "no access" screen, and read-only saving for viewers. |

## Since freezing: the access list

`supabase/access.sql` is live: an `access_list` table that decides who may register and who sees the data, managed from Supabase's Table Editor. When roles resume, `setup.sql` should take over from it:

- copy `access_list` emails into `members` (as editors) before replacing the app_state rules
- point the registration check (`ifm_check_signup` on `auth.users`) at `members` instead, or drop it
- the app's access check (`hasAccess` in `src/lib/auth.js`) becomes the patch's `fetchRole`; `src/main.jsx` has been rewritten since the patch, so expect to re-apply its `main.jsx` part by hand

## Why roles need both halves

`setup.sql` makes the database refuse anyone who isn't on the access list, and refuses viewers' edits. The app half makes the screens match: viewers don't see controls that won't work, and admins get a **Team access** panel to add people. Ship them together.

## Resuming roles

1. `git apply --include='src/lib/*' docs/frozen/roles-app.patch` adds `src/lib/access.js` and changes `src/lib/cloud.js` (both still apply cleanly). Its `src/main.jsx` part no longer applies since the registration screen was added; redo it by hand (role lookup, "no access" screen, read-only for viewers).
2. Still to build in `src/GCSInnovationFund.jsx`:
   - accept the `role` and `email` props the patch passes to `App`
   - viewers: a "view only" banner; hide add, delete and upload controls
   - admins only: Restore, and start / rename / delete cycle
   - a **Team access** panel: list members, change roles, remove, add by email, and let in accounts that are waiting (`ifm_pending_accounts()`)
3. Test every role in a browser, then run `setup.sql` (edit the one marked email line first).

The patch works before or after the script is run: with no `members` table the app behaves exactly as it does today.

## Resuming reminders

- **In the app (not started):** an "Email reminder" button per team on the Deliverables tab that drafts an email to the team listing what's owed, and records when each team was last reminded.
- **Automatic weekly email:** run `reminders.sql` after `setup.sql`, following the instructions at the top of that file.

## Resuming document uploads (not started)

`setup.sql` Part 2 creates a private `team-documents` bucket (25 MB per file; office documents, PDFs, images, CSV). The Budget and Calendar slots would take a file as well as a link, and open it through a short-lived signed URL.

Before storing real budgets there, check your project's region in **Supabase → Project Settings → General**. Files live in that region; if Concordia needs data kept in Canada, the project should be in Canada (Central).

## Re-running the SQL tests

The tests run the real scripts against PostgreSQL in Node (PGlite), with Supabase's `auth`, `storage`, `vault`, `pg_net` and `pg_cron` stood in for:

```bash
npm install --no-save @electric-sql/pglite
node supabase/tests/setup.test.mjs
node supabase/tests/reminders.test.mjs
```
