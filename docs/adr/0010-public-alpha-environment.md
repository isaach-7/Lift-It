# ADR 0010: Public alpha environment

## Status

Accepted on 2026-09-10.

## Context

The workout-tracker v1 is complete in the repository and passes its automated
quality gate. It has not yet run from a public HTTPS origin. The existing hosted
Supabase project contains the owner's account and workout data and has already
received the main transactional workout migrations. Creating a new database now
would delay the first deployment and require moving or recreating that data.

The first release needs to be reachable for real-device testing, but it does not
yet need public discovery, external-user email delivery or production-scale
environment isolation.

## Decision

Deploy the current `main` application to Vercel as a link-accessible public alpha.
Keep every route `noindex, nofollow` and use the generated Vercel HTTPS origin.
Treat the existing hosted Supabase project as the alpha production database after
verifying all seven migrations and the five rollback-only hosted SQL suites.

Initially support only the owner's authorized account. Keep privileged values out
of Vite and Vercel browser variables. Configure exact localhost, preview and
production authentication callback and password-reset paths in Supabase.

## Consequences

The alpha can ship without a domain purchase, custom SMTP or data migration. The
existing project must not be used for destructive experiments after deployment.
Before external beta users are invited, create a separate development Supabase
project and configure a custom domain, verified SMTP sender and support process.
