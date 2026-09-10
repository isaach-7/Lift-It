A practical guide to building LiftIt’s React frontend so that it works with the browser’s rendering pipeline instead of against it.

This guide is adapted for the current LiftIt stack:

* Frontend: React
* Hosting: Vercel
* Database: Supabase Postgres
* Authentication: Supabase Auth
* File storage: Supabase Storage
* Backend logic: Supabase Edge Functions
* Primary target: responsive web app, especially mobile use during workouts

Core idea

LiftIt should be visually polished but mechanically simple.

The interface can have exercise images, workout cards, timers, charts, modals, transitions, loading states, and interactive controls, but the browser should not have to fight the design to render them.

The general goal is:

1. Load the important interface quickly.
2. Keep the layout stable while Supabase data loads.
3. Let CSS handle layout wherever possible.
4. Avoid unnecessary JavaScript work.
5. Use React for state and interaction, not for calculating basic layout.
6. Keep animations cheap.
7. Keep Supabase requests and third-party services from blocking the basic interface.
8. Design primarily for mobile performance, since live workouts are likely to be logged on a phone.

The goal is not to optimise everything from day one. The goal is to make sensible architectural choices now and measure performance later.

⸻

1. Make the first screen cheap

The first visible screen should require as little work as reasonably possible.

For LiftIt, the most important first screens are likely to be:

* Login/register
* Home/dashboard
* Current workout
* Workout template view

Avoid making the entire interface wait for multiple Supabase requests before anything useful appears.

For example, the workout page should be able to render its basic structure immediately:

Chest Day
Bench Press
[loading set data]
Incline Press
[loading set data]

rather than:

Loading...

followed by the entire page suddenly appearing.

Good first screens should have:

* predictable component dimensions
* minimal blocking assets
* lightweight initial JavaScript
* clear loading states
* no unnecessary third-party scripts
* stable navigation and toolbar heights

A page should not depend on JavaScript measuring the viewport or DOM before it knows how to lay itself out.

⸻

2. Prioritise the real main content

Traditional websites often have a hero image as their Largest Contentful Paint element.

LiftIt is different.

Inside the actual app, the most important visible content may instead be:

* the current workout card
* the workout title
* the exercise list
* the active exercise
* a large dashboard panel

Do not add large images simply because performance advice often discusses hero images.

For a future public landing page, a product screenshot or phone mockup may become the main visual. In that case:

* give it explicit dimensions
* provide responsive image sizes
* load it eagerly if it is above the fold
* avoid loading it through JavaScript after the page starts

Exercise images generally do not need high loading priority unless they are the main visible content.

⸻

3. Design around Supabase loading states

A major source of visual instability in LiftIt will be data arriving asynchronously from Supabase.

Every important data-driven component should deliberately support:

loading
loaded
empty
error

For example:

if (isLoading) {
  return <WorkoutSkeleton />;
}
if (error) {
  return <WorkoutError />;
}
if (!workout) {
  return <EmptyWorkout />;
}
return <Workout workout={workout} />;

The important part is that the loading state should approximately match the dimensions of the final content.

Bad:

[spinner]
then suddenly
[large exercise card]
[large exercise card]
[large exercise card]

Better:

[exercise card skeleton]
[exercise card skeleton]
[exercise card skeleton]
then
[exercise card]
[exercise card]
[exercise card]

This reduces layout shift and makes the app feel faster even when the network request takes the same amount of time.

⸻

4. Treat CSS as the main layout system

Use CSS for layout wherever possible.

Prefer:

* Flexbox
* CSS Grid
* media queries
* container queries where useful
* aspect-ratio
* min()
* max()
* clamp()

Avoid JavaScript that measures elements purely to decide where normal interface components should go.

Good:

.exercise-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

Avoid patterns such as:

const width = element.getBoundingClientRect().width;
if (width > 600) {
  // manually rearrange layout
}

unless JavaScript measurement is genuinely required.

For LiftIt, normal workout cards, set tables, exercise grids, dashboards, navigation, and forms should almost always be handled by CSS.

⸻

5. Keep the live workout layout stable

The live workout page is one of the most important parts of the application.

Many values will change while the user stays on the same screen:

* reps
* weights
* set completion state
* rest timer
* progression recommendations
* exercise status
* Supabase save state

These changes should not make the interface jump around.

For example:

SET      KG      REPS
1        80      8
2        80      -
3        80      -

should keep roughly the same dimensions when:

80

changes to:

82.5

Likewise, a rest timer changing from:

9:59

to:

10:00

should not resize the surrounding UI.

Use:

* fixed or minimum column widths
* predictable button sizes
* stable card heights where practical
* reserved areas for status messages
* tabular numbers for timers where appropriate

Example:

.rest-timer {
  font-variant-numeric: tabular-nums;
  min-width: 5ch;
}

The goal is to let values change without causing the whole component tree to visually move.

⸻

6. Give exercise images predictable dimensions

Exercise images should never determine the layout after they finish loading.

Use a consistent image container.

Example:

.exercise-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

Then:

<img
  className="exercise-image"
  src={exercise.imageUrl}
  alt={exercise.name}
/>

Where possible:

* store known dimensions
* use consistent aspect ratios
* compress images
* use modern formats such as WebP or AVIF
* provide smaller images for mobile
* avoid loading unnecessarily large originals

If exercise images are stored in Supabase Storage, optimise the files before uploading or use an appropriate image transformation strategy later.

The exercise list should remain usable if an image loads slowly or fails completely.

⸻

7. Keep React rendering predictable

React makes it easy to update the interface, but unnecessary rerenders can become expensive as the app grows.

This will matter particularly on the live workout page.

For example, updating a one-second rest timer should ideally not cause every exercise and every set in the workout to rerender unnecessarily.

Organise components so frequently changing state is reasonably isolated.

For example:

WorkoutSession
|
+-- WorkoutHeader
|
+-- ExerciseList
|   |
|   +-- ExerciseCard
|       |
|       +-- SetRow
|
+-- RestTimer

If only RestTimer needs to update every second, the rest of the workout should not need to perform expensive work because of it.

Do not add React.memo, useMemo, or useCallback everywhere by default.

First write clear React code.

Then profile actual performance problems and optimise where needed.

⸻

8. Avoid unnecessary layout reads and writes

Layout thrashing happens when JavaScript repeatedly changes the DOM and then asks the browser to recalculate dimensions.

For example:

element.style.height = "200px";
const height = element.offsetHeight;
otherElement.style.height = "300px";
const otherHeight = otherElement.offsetHeight;

Repeated patterns like this can become expensive.

LiftIt should rarely need this type of behaviour.

Prefer CSS for:

* responsive layouts
* expanding cards
* grids
* set rows
* exercise lists
* mobile navigation

If DOM measurement is genuinely required, group reads together and writes together rather than constantly switching between them.

⸻

9. Prefer compositor-friendly animation

Most normal interface animations should use:

transform
opacity

These are usually cheaper for browsers to animate than properties that affect layout.

Good:

.modal {
  transform: translateY(8px);
  opacity: 0;
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}
.modal[data-open="true"] {
  transform: translateY(0);
  opacity: 1;
}

Avoid unnecessarily animating:

width
height
top
left
margin
padding

Possible LiftIt animations include:

* opening an exercise picker
* showing a progression message
* opening a settings panel
* displaying a modal
* changing tabs
* completing a set

These should generally use subtle transform and opacity transitions rather than large layout-changing animations.

⸻

10. Use will-change only when there is a reason

Do not add:

will-change: transform;

to every animated component.

It can cause the browser to create additional compositor layers, which consume memory.

Only use it if profiling shows an animation benefits from it or if an element has a known short-lived high-performance animation.

Example:

.drawer[data-state="opening"],
.drawer[data-state="open"] {
  will-change: transform;
}

This is an optimisation, not a default styling rule.

⸻

11. Respect reduced motion

Animations should improve clarity, not be necessary to understand the interface.

Support:

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms;
    transition-duration: 0.01ms;
  }
}

A more refined implementation can selectively disable non-essential movement.

The application must remain fully usable without animation.

⸻

12. Save workout data without blocking the interface

During a workout, each completed set is saved to Supabase immediately.

The interface should not feel frozen while that network request runs.

A sensible flow is:

User completes set
        |
        v
UI updates
        |
        v
Save request sent to Supabase
        |
        +---- success
        |
        +---- failure -> show retry/error state

Do not make ordinary interactions wait unnecessarily for unrelated network work.

However, do not hide save failures.

The user needs to know whether their workout data is actually persisted.

A set could have states such as:

editing
saving
saved
error

The visual treatment should remain compact enough that switching between these states does not resize the entire row.

⸻

13. Keep progression logic separate from presentation

The automatic progression feature is core application logic.

For example:

reps > upper limit -> increase
reps < lower limit -> decrease
otherwise -> unchanged

The browser UI should display the resulting recommendation without tightly coupling the layout to how the rule is calculated.

Keep a clear separation between:

business logic
data storage
React presentation

This makes the system easier to:

* test
* explain
* maintain
* move between frontend and Supabase Edge Functions later if necessary

Do not bury important progression rules inside visual React components.

⸻

14. Avoid unnecessary JavaScript dependencies

Every dependency adds some combination of:

* bundle size
* maintenance
* security exposure
* complexity
* code the developer needs to understand

Before adding a package, ask:

Can the browser already do this?
Can React already do this?
Can simple CSS do this?
Can Supabase already do this?

Examples:

Do not add a large animation library simply to fade a modal.

Do not add a layout library for something CSS Grid can handle.

Do not install a general utility package just to use one tiny helper function.

Dependencies are completely acceptable when they solve a real problem, but they should earn their place in the project.

⸻

15. Lazy-load expensive features, not basic functionality

Some parts of LiftIt may become relatively expensive:

* progress charts
* large exercise libraries
* calorie tracker
* barcode scanner
* future AI assistant
* social features

These do not necessarily need to be included in the first JavaScript required to start a workout.

Route-level code splitting or lazy loading can be considered later.

For example:

const ProgressPage = React.lazy(
  () => import("./pages/ProgressPage")
);

Do not over-engineer code splitting early.

Use it when the application becomes large enough for bundle size to become a meaningful issue.

Core workout functionality should remain simple and reliable.

⸻

16. Design charts with reserved space

Progress charts will load data from Supabase.

The chart container should already have a predictable height before the chart appears.

Good:

Progress
Max Weight
+-------------------------+
|                         |
|     chart skeleton      |
|                         |
+-------------------------+

then:

Progress
Max Weight
+-------------------------+
|       /\                |
|   /\ /  \               |
|__/  V    \__            |
+-------------------------+

Bad:

Progress
Loading...

followed by the entire page suddenly expanding.

Charts also do not need to block the rest of the progress page from rendering.

⸻

17. Treat large searchable lists carefully

This becomes more important later for:

* the exercise library
* food search
* calorie tracking
* social feeds

Do not immediately render thousands of DOM nodes.

Initially, normal filtering and pagination may be enough.

If lists become genuinely large, consider:

* server-side pagination
* database filtering
* debounced search
* virtualisation
* incremental loading

Do not implement virtualisation before it is needed.

For Supabase searches, avoid downloading an entire large table purely so React can filter it locally.

Prefer querying the relevant records from the database.

⸻

18. Keep third-party services outside the critical path

LiftIt may eventually use:

* analytics
* ads
* nutrition APIs
* barcode libraries
* AI services
* social integrations

None of these should be required for the basic workout tracker to function.

The dependency hierarchy should remain approximately:

Core LiftIt interface
        |
        v
Workout functionality
        |
        v
Supabase

with optional services surrounding it:

analytics
ads
AI
marketing
other integrations

If analytics fails, a workout should still save.

If an ad provider fails, the workout page should still function.

If an AI service is unavailable, users should still be able to create and complete normal workouts.

⸻

19. Keep authentication loading predictable

Supabase Auth may require the application to determine whether the user already has an authenticated session.

Avoid flashing:

Login page

for a fraction of a second and then replacing it with:

Dashboard

if the user was already authenticated.

Have an intentional authentication loading state.

For example:

Checking session
      |
      +-- authenticated -> app
      |
      +-- unauthenticated -> login

This state should be visually simple and should not cause unnecessary layout changes.

⸻

20. Do not make offline-looking behaviour dishonest

The workout screen may optimistically update before a Supabase request finishes.

That can make the interface feel fast, but the application should distinguish between:

changed locally

and:

successfully saved

This is especially important because workouts may be logged in gyms with unreliable connectivity.

If a save fails:

* retain the user’s entered value where practical
* clearly indicate the failure
* provide a retry path
* avoid silently pretending the data was stored

More advanced offline synchronisation can be considered later.

It does not need to be part of v1.

⸻

21. Mobile is the primary performance target

Even though LiftIt begins as a website, live workout tracking will often happen from a phone.

Design and test primarily around:

* narrow screens
* touch interaction
* weaker mobile CPUs
* inconsistent gym Wi-Fi or mobile data
* one-handed interaction
* portrait orientation
* virtual keyboard behaviour

Avoid assuming every user has:

* a large desktop display
* perfect bandwidth
* a powerful processor
* a mouse

Desktop should still look polished, but mobile should not feel like a compressed desktop site.

⸻

22. Make touch targets stable and usable

Workout controls need to be easy to operate while the user is training.

Buttons such as:

Complete Set
Start Timer
Add Set
Change Weight
Next Exercise

should have comfortable touch areas.

Do not make buttons shrink or move when their labels change.

For example:

Save

becoming:

Saving...

should not suddenly change the width of the surrounding interface.

Use stable button dimensions where appropriate.

⸻

23. Keep form state responsive

Workout logging involves frequent text and numeric input.

Typing should update local React state immediately.

Do not perform a database write on every keystroke unless there is a deliberate reason.

For example:

User types:
8

React can update immediately.

The actual save can happen when the set is marked complete or at another intentional persistence point.

This reduces unnecessary network requests and keeps input responsive.

The exact saving behaviour should follow the application’s data integrity requirements.

⸻

24. Optimise network requests before micro-optimising React

If a page feels slow, do not immediately start adding:

React.memo
useMemo
useCallback

everywhere.

First investigate:

* Are too many Supabase queries being made?
* Are queries returning unnecessary columns?
* Are large image files being downloaded?
* Is the same data being fetched repeatedly?
* Is data being fetched sequentially when it could be fetched together?
* Is the database query itself inefficient?

A 600 ms unnecessary network request usually matters more than saving a tiny React computation.

Measure first.

⸻

25. Request only the data the page needs

Avoid:

SELECT *

as the default approach once the schema becomes substantial.

If the exercise picker only needs:

id
name
muscle_group
image_url

then request those fields rather than every exercise property.

Smaller responses reduce:

* transfer size
* parsing work
* memory use
* accidental coupling between components and database fields

This becomes increasingly important as the schema grows.

⸻

26. Avoid database waterfalls where practical

Be careful with patterns such as:

fetch workout
    |
    v
fetch exercises
    |
    v
fetch sets
    |
    v
fetch progression

where every request waits for the previous one unnecessarily.

Where the data model allows it, use:

* joined Supabase queries
* parallel requests
* appropriate database views
* Edge Functions for genuinely complex server-side operations

Do not combine everything into one enormous request either.

The goal is a sensible number of predictable queries.

⸻

27. Keep Edge Functions purposeful

Supabase Edge Functions should be used for logic that genuinely belongs on the server.

Possible examples include:

* progression operations that need trusted server-side behaviour
* future external API calls involving private keys
* AI requests
* protected third-party integrations

Do not move ordinary UI logic into Edge Functions simply because they exist.

Likewise, do not duplicate the same business rule in several different locations without a reason.

⸻

28. Prefetch only predictable next steps

Prefetching can improve navigation, but it should follow actual user behaviour.

Possible future examples:

Home -> Start Workout
Workout Template -> Live Workout
Cart -> Checkout

For LiftIt, a likely path may be:

Home
  |
  v
Workout Template
  |
  v
Start Workout

If measurement later shows that loading the workout page causes noticeable delay, prefetching related code or data could help.

Do not prefetch every route and every dataset.

That wastes bandwidth, especially on mobile.

⸻

29. Keep navigation lightweight

Changing between major application areas should not unnecessarily reload the entire page.

For example:

Home
Workouts
Progress
Profile

should behave like normal React application navigation.

Avoid placing large network requests or expensive initialization work in global components that rerun on every navigation.

Persistent elements such as the main navigation should remain stable.

⸻

30. Use performance optimisation after measurement

Do not optimise based only on theoretical advice.

Once meaningful parts of LiftIt exist, measure them.

Useful tools include:

* Chrome DevTools
* Lighthouse
* React DevTools Profiler
* Vercel performance tooling where appropriate
* Supabase query analysis where needed

Useful browser metrics include:

* LCP: Largest Contentful Paint
* CLS: Cumulative Layout Shift
* INP: Interaction to Next Paint

The workflow should be:

Build
  |
  v
Measure
  |
  v
Identify real problem
  |
  v
Fix
  |
  v
Measure again

not:

Guess possible problem
  |
  v
Add optimisation
  |
  v
Add more complexity

⸻

Website design checklist

First viewport

* Is the important content obvious?
* Can the structural UI appear without waiting for every Supabase request?
* Are authentication loading states intentional?
* Are exercise images given predictable dimensions?
* Does the page avoid downloading unnecessarily large media?
* Are optional scripts kept away from the initial experience?

Layout

* Are Grid and Flexbox used instead of JavaScript layout calculations?
* Are media dimensions constrained?
* Are loading states approximately the same size as final content?
* Do buttons remain stable when their state changes?
* Do long workout and exercise names wrap safely?
* Do numeric values changing size avoid shifting the interface?
* Does the mobile layout work independently rather than simply shrinking desktop?

Live workout

* Does completing a set avoid moving unrelated UI?
* Does the rest timer update without rerendering expensive components?
* Is saving state visible without taking over the interface?
* Can save failures be recovered from?
* Are user-entered values protected from accidental loss?
* Are progression recommendations visually stable?

Motion

* Are ordinary animations primarily transform and opacity?
* Are layout-changing animations rare?
* Is will-change only used where justified?
* Does the interface work with reduced motion enabled?

React

* Is state stored at a sensible component level?
* Are high-frequency updates isolated where practical?
* Are expensive components loaded only when needed?
* Are memoisation tools only added when there is evidence they help?
* Are large lists handled sensibly?

Supabase

* Are requests limited to the data the page needs?
* Are unnecessary sequential requests avoided?
* Are errors and slow connections handled?
* Are database writes placed at intentional persistence points?
* Are Edge Functions being used for server-side logic rather than ordinary presentation behaviour?
* Does core functionality remain understandable without hiding everything behind abstractions?

Assets

* Are exercise images compressed?
* Are image dimensions predictable?
* Are mobile devices receiving appropriately sized assets?
* Are SVGs used for simple icons where appropriate?
* Are large future assets lazy-loaded when they are below the fold?

Third-party services

* Can users still complete a workout if analytics fails?
* Can users still use the workout tracker if future AI services fail?
* Are ads or marketing scripts kept away from critical workout interactions?
* Are optional integrations isolated from core application functionality?

⸻

Practical LiftIt patterns

Home page

Good:

* render the basic dashboard structure immediately
* load user workout information into reserved card areas
* keep navigation stable
* avoid large decorative images
* keep optional analytics outside the critical path

Avoid:

* blank screen while several Supabase requests complete
* large animations before the dashboard becomes usable
* repeatedly fetching the same profile data
* dynamically calculating the page layout with JavaScript

⸻

Live workout

Good:

* stable set rows
* local input state
* immediate visual feedback
* background Supabase persistence
* clear save failure state
* isolated rest timer
* predictable button sizes
* lightweight animations

Avoid:

* rerendering the entire session every second
* shifting exercise cards when values change
* blocking the interface during every database request
* silently ignoring save failures
* measuring every component with JavaScript

⸻

Exercise library

Good:

* consistent image aspect ratios
* server-side search/filtering once the library becomes large
* lightweight exercise cards
* skeleton rows during loading
* lazy-load images that are well below the viewport

Avoid:

* downloading every exercise image immediately
* huge original images
* displaying thousands of exercises at once
* image loads changing card dimensions

⸻

Progress page

Good:

* reserve chart dimensions
* show basic statistics before expensive chart rendering if practical
* fetch only the sessions needed
* lazy-load chart libraries if they become a significant bundle cost

Avoid:

* chart library blocking the main workout experience
* page height changing dramatically once data arrives
* recalculating large datasets in the browser when SQL can perform the aggregation efficiently

⸻

Future calorie tracker

Good:

* debounce food searches
* search the database/API rather than downloading huge datasets
* paginate or virtualise long results
* reserve product image dimensions
* cache where sensible
* handle incomplete external API data safely

Avoid:

* querying on every keystroke
* rendering enormous food result lists
* letting external nutrition APIs block unrelated application functionality

⸻

Red flags for LiftIt

* The home screen is blank until Supabase finishes loading.
* The workout screen needs JavaScript measurements to determine its basic layout.
* Completing a set causes the page to visibly jump.
* The rest timer rerenders the entire workout every second.
* Exercise images have no predictable aspect ratio.
* Large images intended for desktop are downloaded on mobile.
* Every component uses useMemo, useCallback, or React.memo without evidence they are needed.
* Every state change immediately produces a database request.
* One screen performs several sequential Supabase requests that could reasonably be combined or parallelised.
* Third-party analytics or future ads can interfere with workout logging.
* A failed Supabase write looks identical to a successful save.
* Progress charts are loaded as part of the initial workout bundle even when the user never opens Progress.
* The exercise library downloads far more data than the user can see.
* Performance techniques are added simply because they are considered “best practice” rather than because they solve a real problem.

⸻

Quick rules of thumb

* CSS handles layout. React handles state and interaction.
* Supabase handles persistence. Do not make the browser pretend persistence succeeded when it did not.
* Stable UI is more important than flashy UI.
* Mobile performance matters more than making the desktop version unnecessarily elaborate.
* Reserve space for anything that loads later.
* Use transform and opacity for ordinary motion.
* Do not make one timer update the whole page.
* Do not download data that the user does not currently need.
* Do not install a library for something the browser can easily do itself.
* Do not optimise until there is something measurable to optimise.
* Network and database problems often matter more than tiny React optimisations.
* The workout tracker must remain functional even if optional third-party services fail.
* A clever implementation that is difficult to understand is usually worse for this project than a simple implementation that works reliably.

⸻

Performance review process

Once the main workout tracker is functional, create:

docs/performance.md

Record an initial audit.

For example:

# Performance Review
## Test environment
Device:
Browser:
Connection:
Commit:
## Initial measurements
LCP:
CLS:
INP:
## Problems found
1. Exercise images had inconsistent dimensions.
2. Rest timer caused unnecessary component rerenders.
3. Progress chart library was included in the initial bundle.
## Changes
1. Added fixed aspect-ratio image containers.
2. Isolated timer state into its own component.
3. Lazy-loaded the progress page chart library.
## Results
LCP:
CLS:
INP:
## Conclusion
Explain what improved, what did not, and which optimisations were
not worth the added complexity.

This creates a record of:

measurement
-> problem
-> engineering decision
-> implementation
-> result

That is more useful than trying to make the application theoretically perfect from the beginning.

⸻

AI assistant review prompt

When reviewing LiftIt with an AI coding assistant, use:

Review this React + Supabase project against the browser-aware design principles in this document. Focus on the main user flows, especially the live workout page. Check for unstable loading states, unnecessary React rerenders, layout calculated through JavaScript instead of CSS, unconstrained exercise images, expensive animations, unnecessary Supabase requests, request waterfalls, oversized data responses, high-frequency database writes, large initial bundles, and third-party scripts on the critical path. For each real issue, give the file path, explain why it matters, and suggest the smallest appropriate fix. Do not recommend speculative optimisations unless there is evidence they are useful.