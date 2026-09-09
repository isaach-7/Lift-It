# Account foundation: setup and verification

## 1. Create and connect the project

Create a dedicated LiftIt project in your Supabase account. Select your own
organization and a nearby region. Keep its database password in your password
manager; the frontend does not need it.

Copy `.env.example` to `.env.local`. In the project Connect dialog or API settings,
find the Project URL and publishable key and enter them in the matching variables.
Do not use a service-role key or secret key. `.env.local` is ignored by Git.

Start the frontend with `npm run dev`. Vite uses port 5173 and fails if that port
is occupied, so email redirects cannot silently point at the wrong server.

## 2. Configure email links

In Supabase Authentication, enable the Email provider and allow new sign-ups.
Keep the default confirmation-link templates for both sign-up and magic links;
they must contain `{{ .ConfirmationURL }}`, not only the numeric OTP token.

Under Authentication URL Configuration, use:

- Site URL: `http://localhost:5173`
- Allowed redirect URL: `http://localhost:5173/auth/callback`

Open links on the same machine running Vite. A phone's localhost refers to the
phone, not your computer. Public deployment and phone testing need their own
reachable URL and explicit redirect configuration later.

Supabase's built-in email sender is for development and restricts recipients to
project organization members, with tight rate limits. Use your organization
member email for the first real-link test. A second real email account may require
another organization member or custom SMTP. Production delivery is a later step.

Source: https://supabase.com/docs/guides/auth/auth-smtp

## 3. Apply the database migration

In the new project's SQL editor, run the complete contents of
`supabase/migrations/20260908000100_create_profiles.sql` once. This is an initial
migration for a project without an existing profiles table. A failure rolls the
whole migration back; fix the reported error before retrying.

The migration creates a profile automatically when Supabase creates an auth
account, including any accounts already created during setup. The browser cannot
insert, update, or delete profiles. RLS allows a signed-in user to read only their
own row. No frontend profile query is needed just to show the user's email.

Keep this migration as the versioned source of truth. If adopting the Supabase CLI
later, mark this exact manually applied migration as applied before pushing more
migrations; do not apply it twice.

After the profile migration, apply
`supabase/migrations/20260909000100_create_workout_templates.sql` once to enable
saved workout names. The home page can then create and rename templates.

## 4. Database isolation check

Run `supabase/tests/profiles.sql` in the SQL editor as postgres. It creates two
synthetic auth users inside a transaction, checks automatic profiles, tests each
user's visibility under the authenticated role, checks denied client write and
anonymous privileges, and checks cascading account deletion. It ends in ROLLBACK,
so no synthetic accounts remain after success. If it errors, roll back the failed
transaction before continuing. No email is sent by this SQL test.

Also run `supabase/tests/workout_templates.sql` after the template migration to
verify create/upsert/rename behavior, name validation, and cross-user isolation.
This test also rolls back its synthetic accounts and templates.

A successful run has no assertion errors. This tests database roles and policies;
it does not test the hosted Auth email service.

## 5. Real browser acceptance check

1. Visit `/` while signed out. Expect the email form and no private content.
2. Submit your permitted email. Expect a sending state, then check-inbox feedback.
3. Open the emailed link. Expect the private home page and your email; the URL
   should become `/` without callback tokens.
4. Refresh. Expect a brief session-checking state, then the private page.
5. Sign out. Expect the email form. Refresh again to confirm you remain signed out.
6. Reopen the consumed link. Expect an unavailable-link message and a new-link
   action. Also test an expired link after its configured expiration time.
7. Request a new link and confirm recovery works. Respect the email rate limit.
8. Disable the network when sending or signing out. Confirm a visible error and
   retry path. A failed request must not show new success feedback.
9. Check `/auth/callback` with no link parameters. Expect an unavailable-link page.
10. Inspect at a narrow mobile width and with keyboard navigation. Labels, focus,
    buttons, and long email addresses should remain usable.

## Automated checks

Run `npm run check`. UI tests use a mocked Supabase boundary to cover session
checking/restoration, email submission and retry, auth events, callback errors,
missing configuration, sign-out failures, and subscription cleanup. They do not
replace the real project checks above.
