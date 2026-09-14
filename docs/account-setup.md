# Password accounts: setup and verification

## Environment

Copy `.env.example` to `.env.local` and set the project URL and publishable key.
Never use a service-role key in frontend environment variables. Start with
`npm run dev` and open `http://localhost:5173`.

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

Check hosted status before applying. The project originally used manual SQL
Editor migrations; reconcile these exact versions with CLI migration history
before adopting `supabase db push`. Never replay an already applied migration.
Migration 003 preserves account IDs and existing templates and adds transactional
profile, template, session, set and progression operations. The later migrations
add the kg/lb display preference, intentional partial completion and reversible
set completion. Existing users complete onboarding; name-only templates remain
editable drafts.

## Verification

`npm run check` runs lint, formatting, 106 unit/component tests, five SQL suites and
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

Mocked UI checks and rollback-only SQL checks do not establish email delivery or
replace the real registration/recovery journey. See `docs/progress.md` for the
checks actually completed and remaining release gates.
