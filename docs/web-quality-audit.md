# Web Quality Audit

- Initial audit: 2026-09-10
- Public beta verification: 2026-09-14
- Status refreshed: 2026-09-15

This audit applies the supplied SEO, JavaScript delivery, form security and
browser-aware design guides to the current workout-tracker v1. It distinguishes
controls that belong in the repository now from release work that needs a public
domain, deployed headers or real browser field data.

## Search and document structure

- The application uses semantic headings, forms, labels, buttons, navigation and
  crawlable links.
- Every route receives a specific document title and description. The static HTML
  contains useful fallback metadata before JavaScript runs.
- `/` is a public landing page with a production canonical URL, description, Open
  Graph metadata and crawlable links. The sitemap contains only that canonical
  page.
- `/app`, authentication, recovery, onboarding, profile, workout, session,
  privacy and unknown routes publish `noindex, follow` and no canonical URL.
  `robots.txt` permits crawling so search engines can read those directives.
- Public structured data and `llms.txt` remain intentionally absent because the
  current landing page has no supported rich-result type or content inventory
  that would make them useful.
- Search Console ownership and sitemap submission are operational follow-ups;
  their completion is not recorded in this repository.
- Analytics remains outside the critical path under the v1 scope. Adding it later
  requires consent and privacy decisions, a real measurement ID and an explicit
  Content Security Policy change.

## JavaScript and rendering

- Login, account callback and not-found screens remain eager and lightweight.
  Authenticated home, profile, workout editor, workout list and live session pages
  use route-level dynamic imports.
- Private lazy routes render inside a stable Suspense fallback. React Router's root
  error element provides recovery UI for route rendering and chunk-load failures.
- The production entry fell from 150.25 KB to 5.85 KB gzipped after React and
  Supabase moved to cacheable vendor chunks. Cold-load JavaScript remains about
  151.88 KB gzipped; `docs/performance.md` records the full result.
- The repository has no chart, calendar, editor, animation or analytics package.
  Existing dependencies solve core routing, rendering and Supabase access.
- No DOM measurement is used for normal layout. CSS Grid, Flexbox, media queries,
  minimum sizes and stable numeric widths control responsive behavior.
- The one-second elapsed session clock is isolated from the workout logger. Motion
  uses transform and opacity, and the global reduced-motion rule shortens all
  transitions and animations.
- Data queries name their required columns. Independent workout-plan reads run in
  parallel. Loading, loaded, empty and error states exist on data-driven flows.

## Images and delivery

- Exercise images are local, have intrinsic dimensions, use a stable aspect ratio,
  lazy load and retain a text fallback after an image failure.
- The desktop authentication image has intrinsic dimensions and a 102 KB WebP
  source. It is not present in the live workout route.
- Vite minifies production assets. Vercel serves fingerprinted build assets with
  immutable one-year caching and redirects HTTP through its managed HTTPS layer.

## Forms and trust boundaries

- Account forms bound email and new-password lengths, validate before calls,
  normalize email addresses and preserve values after recoverable failures.
- Workout names, profile values, equipment settings, sets and session actions have
  typed and bounded client validation at intentional save points. Submit controls
  expose pending state and prevent duplicate requests.
- Supabase Auth revalidates account requests. Postgres constraints and authenticated
  database functions revalidate profile, workout and set data on the trusted side.
  Row Level Security and narrow grants isolate user-owned records.
- User content is plain text. React escapes it at output, and the codebase has no
  `dangerouslySetInnerHTML`, raw `innerHTML`, `eval` or dynamic code execution.
  Installing an HTML sanitizer would add code without protecting an active HTML
  input or rendering path.
- There is no custom browser-facing API endpoint, cookie-authenticated cross-origin
  request or Vercel function, so an application CORS allowlist does not apply. A
  future Edge Function or external API must validate origin where relevant and
  always validate authorization and request data independently.

## Hosting security

- The Content Security Policy allows same-origin assets and only Supabase HTTPS and
  WebSocket connections. It blocks framing, plugins, external scripts and inline
  script or style execution.
- Vercel also sends HSTS, a strict referrer policy, MIME sniffing protection, frame
  denial and a permissions policy that disables unused camera, location and
  microphone access.
- Production Supabase keys remain limited to publishable client credentials.
  Service-role keys and SMTP credentials are excluded from Vite variables.

## Deployment verification completed

- Real confirmation, recovery, session restoration, profile onboarding, routine
  editing, set persistence, refresh-and-resume, workout completion and account
  deletion were exercised through deployed Preview and Production environments.
- The browser console remained free of Content Security Policy failures, warnings
  and errors during the verified journeys.
- `https://lift-it.site` redirects permanently to
  `https://www.lift-it.site/`; the canonical production routes return successfully
  over managed HTTPS.
- Production responses were checked for Content Security Policy, permissions,
  referrer, HSTS, content-type and frame protections.
- Mobile and desktop Lighthouse baselines are recorded in
  `docs/performance.md`. Both reported zero cumulative layout shift and total
  blocking time.
- The public canonical URL, Open Graph URL, `robots.txt`, and one-URL sitemap are
  deployed. Private routes retain route-level `noindex` metadata.

## Operational follow-up

- Verify Search Console ownership and submit the sitemap if this has not already
  been completed outside the repository.
- Gather qualitative performance feedback during real gym sessions. Field Core
  Web Vitals remain unavailable without adding real-user monitoring, which needs
  a separate analytics and privacy decision.
