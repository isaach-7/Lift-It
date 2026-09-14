# Password accounts: setup and verification

## Environment

Copy `.env.example` to `.env.local` and set the project URL and publishable key.
Never use a service-role key in frontend environment variables. Start with
`npm run dev` and open `http://localhost:5173`.

Use separate hosted projects:

- local development and every Vercel Preview use the `LiftIt Development`
  Supabase project;
- Vercel Production uses the existing production Supabase project.

Scope both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` separately in
Vercel. Store them as Config values because Vite intentionally exposes them in
the browser bundle. Do not add Preview to a production value or Production to a
development value. Neither environment needs a service-role key.

## Authentication configuration

Enable Email and new signups. Keep Confirm email enabled. Set minimum password
length to 12. Passwords are handled by Supabase Auth and its salted password
hashing; they never enter LiftIt profile tables or recovery drafts.

Keep confirmation and recovery templates using `{{ .ConfirmationURL }}`. Ordinary
sign-in uses email and password. Existing email-link accounts use Forgot password
to establish a password while retaining their account ID and workouts.

Local URLs:

- Site URL: `http://localhost:5173`
- Verification redirect: `http://localhost:5173/auth/callback`
- Recovery redirect: `http://localhost:5173/update-password`

Production URLs:

- Site URL: `https://www.lift-it.site`
- Verification redirect: `https://www.lift-it.site/auth/callback`
- Recovery redirect: `https://www.lift-it.site/update-password`

Keep exact localhost, generated production, and active Vercel preview redirects
until development is fully separated. Do not use a broad wildcard. Production
authentication email uses the verified Resend domain and the sender
`Lift-It <no-reply@lift-it.site>`. SMTP credentials remain in the provider
dashboards and must never be committed to this repository.

Sources:

- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-smtp

## Database migrations

Apply historical files once, in timestamp order:

1. `20260908000100_create_profiles.sql`
2. `20260909000100_create_workout_templates.sql`
3. `20260909000200_create_exercise_library.sql`
4. `20260909000300_complete_workout_flow.sql`
5. `20260910000100_add_weight_unit_preference.sql`
6. `20260910000200_allow_partial_workout_completion.sql`
7. `20260910000300_allow_set_reopening.sql`
8. `20260914000100_remove_obsolete_profile_function.sql`
9. `20260914000200_add_fitness_data_consent.sql`

Check hosted status before applying. The project originally used manual SQL
Editor migrations; reconcile these exact versions with CLI migration history
before adopting `supabase db push`. Never replay an already applied migration.
Migration 003 preserves account IDs and existing templates and adds transactional
profile, template, session, set and progression operations. The later migrations
add the kg/lb display preference, intentional partial completion and reversible
set completion. Migration 008 removes the obsolete five-argument `save_profile`
overload after the unit-aware replacement is available. Existing users complete
onboarding; name-only templates remain editable drafts. Migration 009 records
explicit fitness-data consent and rejects profile, body-measurement, routine and
workout writes until consent has been recorded.

Apply this history to `LiftIt Development` before testing a new migration. Apply
new migrations to development first, run every hosted SQL suite inside its
rollback-only transaction, and use the reviewed Preview before applying the same
migration to production.

## Verification

`npm run check` runs lint, formatting, 112 unit/component tests, five SQL suites and
a production build. The SQL harness uses PGlite with auth roles and Supabase-like
default table grants. Also run the SQL files under `supabase/tests/` against the
hosted project as postgres. Each creates synthetic records in a transaction and
ends in ROLLBACK; none sends an email. On a failed SQL test, roll back before retry.

Complete these real browser checks before release:

1. Register an allowed email, verify it and finish onboarding with optional
   measurements omitted. Confirm failed onboarding retains input.
2. Sign out and sign in with the password; refresh to verify session restoration.
3. Use Forgot password on an existing email-link account, follow the recovery
   link, set a password and confirm the original workouts remain.
4. Check consumed/expired links, resend, incorrect passwords, rate limits and
   connection failures. Recovery must stay on the password-update route.
5. Create an ordered workout with sets; start, save a set, refresh, resume and
   finish. Check rest timers, save retry and unfinished-set confirmation.
6. Confirm weekly attendance and exercise history after completion. Abandon a
   separate session and confirm it does not appear in completed summaries.
7. Inspect both themes at 375px and desktop, keyboard controls, long names,
   unavailable images, chart errors and optional preview failure.

## Security Advisor warnings

After migration 009, the expected Security Advisor result is zero errors and
eight documented warnings. Seven warnings identify the intentionally callable
SECURITY DEFINER functions `add_workout_set`, `finish_workout`,
`log_workout_set`, `save_profile`, `save_workout_template`, `start_workout` and
`unlog_workout_set`. They provide the transactional API for authenticated users,
have fixed search paths, validate `auth.uid()` ownership, and revoke anonymous
execution. The hosted rollback suites continuously test those ownership checks.

The eighth warning is leaked-password protection. It is unavailable on the
current plan; keep the 12-character server-side minimum and enable leaked-password
protection when the project moves to a plan that supports it.

## Encrypted database export

The free project has no retained physical backups. Until paid backups are
enabled, create encrypted exports regularly and before database migrations. Keep
the passphrase in a password manager, never in the repository or shell history:

```bash
read -s LIFTIT_BACKUP_PASSPHRASE
export LIFTIT_BACKUP_PASSPHRASE
node scripts/backup-database.mjs export \
  --project-ref poeehnvtbsazynreojfi \
  --out /secure/off-device/liftit-$(date +%F).backup
node scripts/backup-database.mjs verify \
  --file /secure/off-device/liftit-$(date +%F).backup
unset LIFTIT_BACKUP_PASSPHRASE
```

The script reads through the authenticated Supabase CLI, holds plaintext only in
memory, encrypts with AES-256-GCM using a scrypt-derived key, refuses to overwrite
an existing file, and writes with owner-only permissions. Verification decrypts,
authenticates and parses the export, then reports row counts without exposing
account data. Store at least one verified copy off the deployment host. Auth
password hashes are intentionally excluded; restored users reset their password.

## Account deletion runbook

1. Receive the request at `support@lift-it.site` and locate the exact registered
   address in Supabase Auth. Do not treat the message's From header alone as proof.
2. Reply only to the registered address with a random, single-use verification
   code. Require the requester to return that code before continuing, and expire
   it after one hour.
3. Record only the request time, verification time and Auth user ID needed for the
   operation. Do not copy workout or body data into support notes.
4. Delete the user from Supabase Authentication. The foreign key from
   `public.profiles` cascades through all application-owned data.
5. Confirm the Auth user, profile, routines, sessions, sets, progression and body
   measurements no longer exist. Tell the requester that provider backups and
   security logs expire under provider retention schedules.

The beta verification used possession of both confirmation and recovery links to
verify a disposable development account, deleted that exact Auth user, and
confirmed no profile, routine or session rows were orphaned.

Mocked UI checks and rollback-only SQL checks do not establish email delivery or
replace the real registration/recovery journey. See `docs/progress.md` for the
checks actually completed and remaining release gates.
