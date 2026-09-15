# Performance Review

## Initial test environment

- Date: 2026-09-10
- Build: local production build with Vite 8.2.2 and Node 24
- Measurement: Vite minified output and gzip estimates
- Browser field data: not available

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

## Public beta verification

The 2026-09-14 beta checks covered the public landing page and authenticated app
at mobile and desktop widths in both themes. The local Lighthouse baseline was:

| Profile | Performance | Accessibility | Best practices | SEO |
| ------- | ----------: | ------------: | -------------: | --: |
| Mobile  |          95 |           100 |            100 | 100 |
| Desktop |         100 |           100 |            100 | 100 |

Cumulative layout shift and total blocking time were zero in both runs. The
browser console remained free of warnings and errors while registration,
recovery, profile onboarding, routine editing, live set persistence,
refresh-and-resume, completion, history, exercise imagery and private-route
loading were exercised against deployed Supabase environments.

Production checks also confirmed that the Content Security Policy permits the
required Supabase HTTPS and WebSocket traffic without permitting third-party
scripts. Hashed assets retain immutable caching and the authentication image
retains explicit dimensions.

## Remaining measurement work

Real-user Core Web Vitals and interaction data are not available because LiftIt
does not install analytics or real-user monitoring for the current beta. Use
manual browser performance profiles during representative gym sessions and
repeat Lighthouse after material changes to the landing page, session logger, or
initial dependency graph. Add field monitoring only after an explicit analytics
and privacy decision; it is not required for the core workout path.
