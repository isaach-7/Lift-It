# Performance Review

## Test environment

- Date: 2026-09-10
- Build: local production build with Vite 8.2.2 and Node 24
- Measurement: Vite minified output and gzip estimates
- Browser field data: not yet available

## Initial measurements

Before this audit, the production build emitted a 515.82 KB entry chunk, 150.25
KB gzipped. Private page routes were already dynamically imported into separate
chunks. The entry still bundled React, React Router and Supabase together with the
small application bootstrap. The desktop authentication JPEG was 278 KB.

## Changes

- Kept the existing route-level lazy loading and loading fallback.
- Split React and Supabase into stable vendor chunks using Vite 8's supported
  Rolldown `codeSplitting` configuration.
- Converted the authentication image to WebP and retained its explicit intrinsic
  dimensions.
- Added immutable caching for fingerprinted `/assets/` build files.

## Results

The application entry chunk is now 18.38 KB, 5.85 KB gzipped. React is 285.03 KB,
90.62 KB gzipped, and Supabase is 214.54 KB, 55.05 KB gzipped. The small Rolldown
runtime is 0.36 KB gzipped. The initial JavaScript total is approximately 151.88
KB gzipped, so this change improves cache boundaries rather than claiming a lower
cold-load transfer. The authentication WebP is 102 KB, a 63 percent reduction.

No chart, calendar, editor or analytics dependency exists. The largest private
route chunk is the workout editor at 5.69 KB gzipped. Adding another bundle-analysis
dependency is not justified at this size.

## Remaining release measurements

Run Lighthouse and browser performance checks against a deployed preview on a
narrow mobile viewport and throttled network. Record LCP, CLS and INP after the
production domain and representative Supabase data exist. Verify the Content
Security Policy in the browser console and exercise sign-in, session restoration,
image loading and live workout saves before release.
