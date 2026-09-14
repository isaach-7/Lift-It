# ADR 0011: Searchable public beta

## Status

Accepted on 2026-09-14.

## Context

The public alpha established the production domain, custom authentication email
delivery and the complete hosted workout journey. LiftIt now needs a useful public
entry point without exposing authenticated screens to search or allowing preview
deployments to experiment against production data.

Workout and optional body information may reveal health information. Open
registration therefore needs a clear adult audience, a public privacy notice and
an explicit-consent gate before onboarding stores that information.

## Decision

Use `https://www.lift-it.site` as the permanent canonical production origin. Make
`/` a public landing page and move the authenticated dashboard to `/app`. Keep
registration open to people aged 16 or over, with the United Kingdom as the
initial audience. Keep the product focused on routines, live workout logging and
progression.

Only `/` is indexable. Authentication, password recovery, `/app`, profiles,
workouts, sessions, the public privacy notice and unknown routes remain
`noindex`. Publish a canonical link, Open Graph metadata, `sitemap.xml` and a
crawlable `robots.txt`. Do not disallow private routes in `robots.txt`, because a
crawler must be able to read their `noindex` directive.

Use the existing Supabase project only for Vercel Production. Use the separate
LiftIt Development Supabase project for local and Vercel Preview builds before
applying further migrations. Keep credentials and privileged keys in provider
dashboards; the browser receives only project URLs and publishable keys.

Require an unticked acknowledgement during initial onboarding. It confirms that
the person is at least 16, has read the privacy notice and explicitly consents to
LiftIt storing workout and optional body information. Store the consent time and
privacy-notice version. Core account processing is necessary to provide the
service; explicit consent is the additional lawful basis when fitness or body
information is special-category health data.

Publish a privacy notice that names Supabase, Vercel and Resend as processors,
explains purposes, retention, deletion, safeguards and user rights, and states
that LiftIt neither sells data nor uses advertising analytics. Accept verified
account-deletion requests at `support@lift-it.site`; delete the Auth user so the
existing cascading foreign keys remove application data. Self-service deletion
is deferred.

Continue using Supabase-managed encryption, TLS, Row Level Security and scoped
RPC functions. Do not add custom column encryption that would obstruct workout
queries without a practical security gain. Keep the server-side 12-character
password minimum. Treat leaked-password detection as a paid-plan follow-up.
Document justified Security Advisor warnings, enforce direct PostgreSQL SSL only
after ruling out non-SSL clients, and establish either paid backups or a tested
encrypted export before describing the service as durable storage.

## Consequences

The public homepage can be discovered while private application states remain
out of search results. Existing links to the former dashboard root must redirect
through the new routing rules. Preview database changes no longer risk production
workout data. Onboarding gains one required choice and the service must honour
consent withdrawal and verified deletion requests. Supporting children, new
analytics, social features, calorie tracking and other product expansion remain
out of scope.
