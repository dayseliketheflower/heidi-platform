# Migration History Reconciliation — 2026-07-04

## What was found

The migration tracking system had diverged completely from what was actually running in production:

- The local `supabase/migrations/` directory contained a single file, `001_users_table.sql`, covering only the original `users` table.
- The live database's `supabase_migrations.schema_migrations` history table contained four entries (`20260413000000`–`20260413000003`) that corresponded to no local migration file at all.
- The live `public` schema actually contained **20 tables** (`users`, `profiles`, `bookings`, `sessions`, `provider_profiles`, `provider_applications`, `boundary_agreements`, `incidents`, `incident_reports`, `incident_notes`, `reviews`, `conversations`, `messages`, `flagged_messages`, `panic_alerts`, `active_sessions`, `admin_log`, `companion_notes`, `client_signups`, `_admin_config`), 69 RLS policies/functions/triggers, and Stripe/Checkr integration columns — none of which existed as a versioned migration file anywhere in the repo.

Conclusion: essentially all schema changes since `001_users_table.sql` were applied directly against production (SQL editor or similar), never captured as migration files. There was no way to reproduce this schema from the repo alone.

## Critical issues fixed before baselining

Two live RLS policies allowed unauthorized access to safety-critical/PII data and were patched on production directly (via the Supabase Management API) before the schema was snapshotted:

1. **`panic_alerts`** — `"Admin can read all panic alerts"` had `USING (true)` with no role check, unlike every other admin policy in the schema. Any authenticated (and possibly anonymous) user could read every panic alert, including client/provider IDs, session location, and message. Fixed to check `users.role = 'admin'` (the only role column whose CHECK constraint actually permits `'admin'` — see Known Issues below).
2. **`boundary_agreements`** — two permissive duplicate policies (`WITH CHECK (true)` on INSERT, `USING (true) TO authenticated` on SELECT) sat alongside correctly-scoped ones. Since Postgres RLS policies are OR'd together, the permissive ones fully negated the scoped ones, letting any authenticated user read or write any booking's boundary agreement (which includes emergency contact name/phone). Both permissive policies were dropped.

Verified via before/after schema dump diff that no other table or policy was touched by these fixes.

## What was reconciled

- `supabase db dump --linked --schema public` was used to pull the exact, corrected live schema (tables, columns, constraints, indexes, RLS policies, triggers, functions).
- That dump became `supabase/migrations/00000000000000_baseline.sql` — the single file that reproduces the current production schema from scratch.
- The old `001_users_table.sql` was removed (fully superseded by the baseline).
- Production's `supabase_migrations.schema_migrations` table was repaired (bookkeeping only — `supabase migration repair`, no schema/data touched) so it contains exactly one entry: `00000000000000`, matching the baseline.
- `supabase db diff --linked` against production after the repair reports **"No schema changes found"** — confirmed zero drift.

## Rule going forward

**All schema changes go through a new numbered migration file — never the SQL editor directly.**

```
supabase migration new <description>
# edit the generated file in supabase/migrations/
supabase db push --linked
```

If a change is ever made directly against production outside this flow, treat the migration history as compromised again and re-run this reconciliation process before trusting `supabase db diff`.

## Known issues NOT fixed (see follow-up findings doc)

Several other schema issues were identified but intentionally left untouched pending review — see `FOLLOW_UP_FINDINGS.md`. Most notably: five other "Admin can ..." policies check `profiles.role = 'admin'`, but `profiles.role`'s CHECK constraint only allows `('client','provider')` — meaning those five policies can never match any row and are effectively dead code today.
