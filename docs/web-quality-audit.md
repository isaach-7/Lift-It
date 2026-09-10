# Web Quality Audit

Date: 2026-09-10

This audit applies the supplied SEO, JavaScript delivery, form security and
browser-aware design guides to the current workout-tracker v1. It distinguishes
controls that belong in the repository now from release work that needs a public
domain, deployed headers or real browser field data.

## Search and document structure

- The application uses semantic headings, forms, labels, buttons, navigation and
  crawlable links.
- Every route receives a specific document title and description. The static HTML
  contains useful fallback metadata before JavaScript runs.
- Current routes are authentication or owner-only product screens. HTML metadata,
  the Vercel `X-Robots-Tag` and `robots.txt` consistently prevent indexing.
- A sitemap, canonical URLs, public structured data and `llms.txt` are intentionally
  absent. There is no public content to list and no confirmed production origin.
- Search Console and index requests remain blocked on a public landing page and
  production domain. At that point, indexing rules must become route-specific so
  private screens remain excluded.
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

## Release checks that require deployment

1. Exercise registration, recovery, session restore and workout persistence on a
   Vercel preview while checking the console for Content Security Policy failures.
2. Run Lighthouse on a narrow mobile viewport with network throttling and record
   LCP, CLS and INP in `docs/performance.md`.
3. Confirm HTTP redirects to HTTPS and inspect all response headers on the final
   production origin.
4. When a public landing page exists, add its canonical URL, sitemap and appropriate
   structured data, then verify Search Console ownership and submit the sitemap.
