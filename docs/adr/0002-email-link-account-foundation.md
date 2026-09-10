# ADR 0002: Email-link accounts

## Status

Accepted, 2026-09-08.

## Decision

Use Supabase email magic links and its built-in implicit browser flow for this
client-rendered application. Keep the default confirmation-link email template.
The SDK owns token parsing, session storage, refresh, and auth events. React owns
checking, signed-in, signed-out, and recoverable error presentation.

Create profiles in an auth.users insert trigger with a fixed empty search_path.
Grant clients only SELECT, constrained to their own row by Row Level Security.
Do not create the future workout schema yet.

## Consequences

There are no passwords to implement or recover. Links are single-use and email
delivery is a dependency of sign-in. Localhost links must be opened on the machine
running Vite. Production email delivery requires separate configuration before
public release. No server-rendered auth layer or Edge Function is needed.

References:

- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/managing-user-data
