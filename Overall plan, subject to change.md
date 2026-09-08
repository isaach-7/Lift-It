# Workout Tracker + Calorie Tracker — Project Plan

## 1. Goal & Context
- CV/portfolio project to support applications for spring weeks, internships, the Year in Industry placement, and eventually a grad job.
- First substantial project outside coursework (previous project: OCR A-Level Computer Science NEA).
- Hoping for real, actual users — not just a demo.
- Non-negotiable: must be authentically self-built, not "vibe coded." Every decision should be explainable in an interview.
- Background: most familiar with Python and SQL; no prior React experience; willing to be flexible on stack.

## 2. Overall Roadmap
1. **Workout tracker** (Hevy-style) — build to a fully finished, polished state first.
2. **Calorie tracker** (MyFitnessPal-style) — stretch goal only, starts after workout tracker is fully done. May be skipped entirely if too much time has already gone into the workout tracker.
3. **Social features** — deferred until there's a mobile app version. Purpose: showcase platform-to-platform communication skills.
4. **AI assistant** — future expansion to help create tailored workouts. Big selling point, but explicitly a "later" feature, not part of core scope.
5. Long-term: convert web app into a mobile app (React Native), then eventually publish to the App Store with ads once the calorie tracker/barcode scanning is built out.

## 3. Tech Stack (v1)
- **Frontend:** React, hosted on Vercel.
- **Backend/DB/Auth:** Supabase (Postgres, auth, storage).
- **Custom logic:** Supabase Edge Functions (e.g. progression rule engine).
- **Why this stack:** leverages existing Python/SQL comfort where possible (SQL via Postgres), avoids reinventing auth/infra plumbing as a first project, gets real momentum toward shipping to actual users, and starting with React now pays off later when porting to React Native.
- Approach: build the **website first** for simplicity; convert to a native/React Native app later.

## 4. Development Philosophy & Authenticity
- Avoid AI-authored code the developer can't fully explain — use AI as a tool for speed, not as the author.
- Write a design doc (`docs/design.md`) before coding — proves genuine upfront thinking.
- Use small, frequent, meaningful commits (Conventional Commits style: `feat:`, `fix:`, `refactor:`) rather than one large dump — this is the primary authenticity signal.
- Use GitHub Issues as a task list, even solo, referencing issue numbers in commits.
- Use feature branches + PRs even solo, with PR descriptions explaining what changed and why.
- Write short ADRs (Architecture Decision Records) for non-trivial decisions (e.g. "why Supabase," "why Open Food Facts," "why snapshot session settings").
- Keep a dated build/progress log (`docs/progress.md`) — source material for interviews and CV bullets later.
- Comments should be sparse, explaining non-obvious *why*, not *what* — avoid narrating obvious code.
- No Word docs for planning — everything lives as markdown in the repo, versioned with the code.
- README written last, read first: what it is, standout feature (auto-increment), screenshots/GIF, live link, tech stack, links to design docs/ADRs.
-Do not use any characters that aren’t typa or by a standard keyboard such as em dashes and invisible Unicode characters, also do not use any emojis.

## 5. v1 — Workout Tracker

### Core Flow
- Login/register.
- Home page: create a workout (template), add exercises, sets, reps, and weights.
- Ability to start a workout live (e.g. on phone in the gym).
- On completion, everything logged to the database.
- Per-exercise progress charts.
- Auto-increment/decrement weight feature built in.

### Live Session Behaviour
- Each set is saved to the database immediately when logged (not batched at the end) — so locking the phone or losing connection mid-workout doesn't lose data. Reopening the app shows the workout still in progress with whatever was updated.
- Two-device conflicts are a low priority (unlikely in practice), but ideally the app shows "workout in progress" if a user is logged in on both devices.
- A live `workout_session` snapshots its exercise settings (rep range, rest timer, increment amount) from the template at start time, rather than reading live from the template — so template edits mid-session don't retroactively affect it.

### Rest Timers
- Configurable per exercise, set up at workout-creation time.

### Progression Logic (the core USP feature)
- Not a complex algorithm — framed as a feature, not "AI" or heavy logic.
- Auto-increment is a toggleable user preference (on/off).
- Rep ranges are user-customisable (default upper 10, default lower 6).
- **Behaviour:** when a set is marked "done" (reps + weight entered):
  - If reps > 10 (strictly above): next set's weight increments.
  - If reps < 6 (strictly below): next set's weight decrements.
  - Otherwise: next set's weight stays the same.
  - Example: Set 1 = 10 reps → unchanged. Set 2 = 6 reps → unchanged. Set 3 = 4 reps → next set decremented.
- Applies to every set except **warmup** sets. **Failure** sets are treated the same as standard sets for this logic (the "failure" label is just for the user's own record).
- Sets can be marked as: warmup, standard, or failure.
- Weight increments configured per exercise at setup, depending on equipment type:
  - Machines with fixed/predetermined increments: user manually inputs the "next weight" value.
  - Plate-loaded machines: increments by ~2.5kg or another reasonable default.
  - Dumbbells: increments to the next available dumbbell size (e.g. 34kg → 36kg).
- If a user skips an exercise for a while, the weight recommendation stays unchanged (no auto-reset) — user can change it manually.
- Manual override: allowed at any time. If auto-increment is on, changing the weight triggers a confirmation warning, and the user chooses whether the change applies to just the next set, or permanently from then on.
- No default reps/weight are pre-filled for a first-time exercise entry — user inputs manually.
- "Today" uses standard/normal day boundaries — no special timezone handling planned.

### Exercise Library
- Each exercise has an image (sourced from the internet — ideally royalty-free sources like Unsplash/Pexels to avoid copyright issues) shown during selection.
- Clicking an exercise shows how to perform it — instructions written as simple bullet points.
- All content (images + instructions) will be self-authored/self-sourced rather than pulled from a third-party exercise API — niche exercises will be skipped to keep scope manageable.

### Progress Charts
- v1 metric: **max weight lifted per session, per exercise** (not estimated 1-rep max or total volume — those are possible future additions).
- Computed by grouping `sets` by session (via session → session_exercises → sets) and taking the max weight logged that session, per exercise, charted over time.

### Global Profile Data
- Height and weight (and weight tracking over time) are global profile-level data, shared across the workout tracker and calorie tracker — not duplicated per app.

## 6. Proposed Database Schema

```
profiles
- id, height, date_of_birth (optional), created_at

weight_logs
- id, user_id, weight, logged_at

exercises
- id, name, muscle_group, equipment_type (machine/plate_loaded/dumbbell/bodyweight/barbell)
- image_url, instructions (bullet list), created_by (nullable — null = system default)

workout_templates
- id, user_id, name, created_at

workout_template_exercises
- id, workout_template_id, exercise_id, order
- rest_timer_seconds, auto_increment_enabled
- rep_range_upper (default 10), rep_range_lower (default 6)
- increment_amount

workout_sessions
- id, user_id, workout_template_id (nullable), status (in_progress/completed/abandoned)
- started_at, completed_at

session_exercises
- id, session_id, exercise_id, order
- (snapshotted) rest_timer_seconds, auto_increment_enabled, rep_range_upper, rep_range_lower, increment_amount

sets
- id, session_exercise_id, set_number, weight, reps
- set_type (warmup/standard/failure), completed_at

exercise_progression
- id, user_id, exercise_id, current_weight, updated_at
  (single source of truth for "next weight" pre-fill, in-session and across sessions)
```

## 7. v1 (Stretch) — Calorie Tracker
- Separate page, cloning MyFitnessPal.
- User configures daily calorie and macro goals.
- Height/weight used for weight tracking (shared with global profile data).
- Shows macros per logged food.
- Food search against a nutrition database.
- **API decision:** blocked on finding a good, low-cost food database. Recommended approach discussed:
  - **Open Food Facts** — free, no API key, no rate limits, has both barcode lookup and text search. Best fit for zero-cost/low-risk v1, but is primarily a packaged/branded product database (crowdsourced, sometimes incomplete) — needs defensive handling of missing data.
  - **USDA FoodData Central** — free, no key, government-verified, but better suited to generic/homemade foods (e.g. "fried egg," "banana") than packaged products, and has no real barcode/international coverage.
  - **FatSecret** — larger, more polished dataset with strong barcode coverage, but a commercial platform likely requiring a paid plan at real-user scale.
  - Possible hybrid: USDA for generic food search, Open Food Facts for barcode/branded lookups, merged into one results list.
- Will trust whatever calorie value the chosen API returns, rather than recalculating from macros.
- Editing a logged food entry recalculates the day's totals.
- Full expansion plan (later, if pursued): barcode scanning, all paid-tier MyFitnessPal features free, eventually ad-supported, targeting App Store release.

## 8. Deferred / Future Features
- **Social features** — showcase platform-to-platform communication skills; deliberately deferring until there's a mobile app.
- **AI assistant** — tailored workout creation/programming; major future selling point, explicitly out of scope for now.
