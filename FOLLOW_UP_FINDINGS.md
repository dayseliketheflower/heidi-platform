# Follow-up findings — schema audit, 2026-07-04

Found during migration reconciliation (see `MIGRATION_HISTORY.md`). The two critical RLS holes (panic_alerts, boundary_agreements) are already fixed and baselined. Everything below is intentionally untouched pending your review.

## 1. Dead admin-role policies (profiles vs. users)

Five RLS policies gate admin access via `EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')`:

- `"Admin can manage all incidents"` (incidents)
- `"Admin can read all agreements"` (boundary_agreements)
- `"Admin can read all applications"` (provider_applications)
- `"Admin can read all bookings"` (bookings)
- `"Admin can read all sessions"` (sessions)
- `"Admin only"` (admin_log)

But `profiles.role` has `CHECK (role = ANY (ARRAY['client','provider']))` — it is not possible for any row to ever have `role = 'admin'`. These six policies can never match for anyone, meaning today there is no working admin-read path through RLS for incidents, boundary_agreements, provider_applications, bookings, sessions, or admin_log — whatever admin tooling exists must be going through `service_role` directly, bypassing RLS entirely.

By contrast, `"Admins can read all users"` (on `users`) checks `users.role = 'admin'`, and `users.role`'s CHECK constraint does allow `'admin'` — this is the one policy of this shape that actually works. The panic_alerts fix in this pass was pointed at `users.role` for that reason.

**Decision needed:** either (a) allow `'admin'` in `profiles.role`'s CHECK constraint and make sure profiles rows for admins get that value set, or (b) repoint these six policies at `users.role = 'admin'` like the panic_alerts fix. Not done here since it touches either a constraint change or six policies at once — wanted your sign-off first.

## 2. Duplicate / legacy-looking tables

- **`sessions` vs. `active_sessions`** — `sessions` is FK'd to `bookings` and looks like the real check-in tracker. `active_sessions` stores denormalized `client_name`/`provider_name` as raw text with zero foreign keys, and has RLS enabled but **no policies at all** (fully locked except via service_role). Looks like an earlier prototype table never removed.
- **`incidents` vs. `incident_reports` + `incident_notes`** — two parallel, unrelated incident-tracking schemas with different shapes (`incidents`: booking_id/reporter_id/description/wants_followup; `incident_reports`: title/status/reporter_id, with `incident_notes` referencing `incident_reports`). No FK links the two systems together.
- **`flagged_messages`** — `session_id` has no FK constraint, and `sender` is stored as raw text rather than a UUID reference. Not integrated with the real `messages`/`conversations` schema.
- **`companion_notes`** and **`incident_reports`** — RLS enabled but no SELECT policy at all defined for either. Data can be inserted (in incident_reports' case) but never read back except via service_role.

**Decision needed:** confirm which of these are intentionally legacy/dead vs. still load-bearing before any cleanup.

## 3. Hardcoded anon key in trigger functions

`notify_companion_confirmation()` and `notify_waitlist_confirmation()` (SECURITY DEFINER functions, fired on INSERT into `provider_applications`/`client_signups`) have the Supabase anon key hardcoded as a literal `Authorization: Bearer ...` string in the function body, calling `https://dzowogyemuauogzwylfv.supabase.co/functions/v1/send-*-confirmation` directly — the production project's URL, hardcoded.

Low risk on its own (anon keys are meant to be public), but two things worth flagging:
- It's now permanently in the git history of `00000000000000_baseline.sql` once that file is committed.
- **This is a blocker for a clean staging environment** (Task 2): if the baseline is applied verbatim to a new `heidi-staging` Supabase project, these triggers will still call the *production* edge functions with the *production* anon key on every staging signup — staging inserts would trigger real production-side confirmation emails/webhooks, not staging-isolated ones. This needs to be parameterized (e.g. read the project URL/key from `current_setting()` or Vault) before staging can safely apply this baseline.

## 4. Harmless duplicate policies (no security impact, just redundant)

- `bookings`: `"Client can insert booking"` / `"Clients can create bookings"` — identical logic (`client_id = auth.uid()`).
- `bookings`: `"Client can read own bookings"` / `"Clients can read own bookings"` — identical logic.
- `boundary_agreements`: `"Client can insert own agreement"` / `"Client can insert own agreements"` — identical logic, singular/plural naming only.

Safe to consolidate whenever convenient; not touched here per your instruction.
