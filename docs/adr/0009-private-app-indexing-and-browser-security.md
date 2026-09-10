# ADR 0009: Private app indexing and browser security

## Status

Accepted on 2026-09-10.

## Context

LiftIt currently exposes authentication and owner-only workout screens. It has no
public landing page with useful crawlable content and no confirmed production
origin. Publishing a sitemap, canonical URL or structured data now would either
expose thin private routes or require an invented domain. The app communicates
with Supabase directly and does not use analytics or a custom cross-origin API.

## Decision

Mark every current route `noindex, nofollow`, block crawlers in `robots.txt`, and
set the same policy as an HTTP header. Add route-specific titles and descriptions
for navigation clarity. Defer canonical URLs, sitemap, structured data, Search
Console and analytics until a public page and production origin exist.

Send a Content Security Policy that permits same-origin scripts, styles, fonts and
images plus Supabase HTTPS and WebSocket connections. Deny framing, plugins,
camera, location and microphone access. Cache fingerprinted build assets for one
year. Keep form validation dependency-free while data remains plain text and rely
on React output escaping, Supabase Auth, database constraints, Row Level Security
and authenticated database functions at trust boundaries.

## Consequences

Search engines will not index the current app. A future public landing page must
replace the global indexing policy with route-specific rules and add its real
canonical URL and sitemap. Any new external service or browser capability must be
added deliberately to the hosting policy and verified in a deployed preview.
