# Frozen work: roles, reminders, document uploads

Parked on purpose, to be picked up later. **Nothing here is live, and none of it should be run yet.**

## What's parked

| Piece | Where | State |
|---|---|---|
| Supabase setup: roles + document storage | `supabase/setup.sql` | Written and tested (38 checks). **Don't run** until the app side below is finished — it would lock out every colleague not yet on the access list, and there's no screen to add them. |
| Weekly reminder email | `supabase/reminders.sql` | Written and tested (20 checks). Depends on `setup.sql`. Needs a [Resend](https://resend.com) account. |
| App side of roles | `docs/frozen/roles-app.patch` | About half done: the sign-in check, the "no access" screen, and read-only saving for viewers. |

## Why roles need both halves

`setup.sql` makes the database refuse anyone who isn't on the access list, and refuses viewers' edits. The app half makes the screens match: viewers don't see controls that won't work, and admins get a **Team access** panel to add people. Ship them together.

## Resuming roles

1. `git apply docs/frozen/roles-app.patch` — it applies cleanly to the code as it stood when frozen. It adds `src/lib/access.js` and changes `src/main.jsx` and `src/lib/cloud.js`.
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
