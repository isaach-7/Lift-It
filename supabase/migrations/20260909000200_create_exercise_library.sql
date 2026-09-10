begin;

alter table public.workout_templates
  add constraint workout_templates_id_user_unique unique (id, user_id);

create table public.exercises (
  id uuid primary key,
  name text not null unique check (
    char_length(name) between 1 and 120
    and name = btrim(name)
  ),
  muscle_group text not null check (
    muscle_group in ('Chest', 'Shoulders', 'Triceps', 'Biceps', 'Legs', 'Back')
  ),
  primary_muscle text not null check (
    char_length(primary_muscle) between 1 and 80
    and primary_muscle = btrim(primary_muscle)
  ),
  secondary_muscles text[] not null default array[]::text[],
  equipment_type text not null check (
    equipment_type in (
      'barbell',
      'dumbbell',
      'cable',
      'machine',
      'plate_loaded',
      'smith_machine',
      'bodyweight'
    )
  ),
  image_path text not null check (image_path like '/exercise-images/%.jpg'),
  supports_added_weight boolean not null default false,
  instructions text[] not null check (cardinality(instructions) between 2 and 5),
  created_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index exercises_group_name_idx
  on public.exercises (muscle_group, name);

alter table public.exercises enable row level security;
revoke all on public.exercises from anon, authenticated;
grant select on public.exercises to authenticated;

create policy "Users can read available exercises"
  on public.exercises for select to authenticated
  using (created_by is null or (select auth.uid()) = created_by);

create table public.workout_template_exercises (
  user_id uuid not null,
  workout_template_id uuid not null,
  exercise_id uuid not null references public.exercises (id),
  position integer not null check (position between 0 and 199),
  rest_timer_seconds integer not null default 90
    check (rest_timer_seconds between 0 and 3600),
  auto_increment_enabled boolean not null default true,
  rep_range_lower integer not null default 6
    check (rep_range_lower between 1 and 99),
  rep_range_upper integer not null default 10
    check (rep_range_upper between 2 and 100),
  increment_amount numeric(7, 2) not null default 2.5
    check (increment_amount > 0),
  created_at timestamptz not null default now(),
  primary key (workout_template_id, exercise_id),
  foreign key (workout_template_id, user_id)
    references public.workout_templates (id, user_id) on delete cascade,
  check (rep_range_lower < rep_range_upper)
);

create index workout_template_exercises_owner_template_position_idx
  on public.workout_template_exercises (
    user_id,
    workout_template_id,
    position,
    exercise_id
  );

alter table public.workout_template_exercises enable row level security;
revoke all on public.workout_template_exercises from anon, authenticated;
grant select, insert, delete on public.workout_template_exercises
  to authenticated;

create policy "Users can read their own workout exercises"
  on public.workout_template_exercises for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own workout exercises"
  on public.workout_template_exercises for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own workout exercises"
  on public.workout_template_exercises for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into public.exercises (
  id,
  name,
  muscle_group,
  primary_muscle,
  secondary_muscles,
  equipment_type,
  image_path,
  supports_added_weight,
  instructions
) values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'Barbell Bench Press', 'Chest', 'Chest', array['Front delts', 'Triceps'], 'barbell', '/exercise-images/barbell-bench-press.jpg', false, array['Set your eyes under the bar and plant both feet.', 'Lower the bar to the mid chest with forearms vertical.', 'Press up while keeping the upper back braced.']),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Dumbbell Bench Press', 'Chest', 'Chest', array['Front delts', 'Triceps'], 'dumbbell', '/exercise-images/dumbbell-bench-press.jpg', false, array['Lie back with the dumbbells above the chest.', 'Lower with elbows slightly below the bench.', 'Press the dumbbells up without bouncing them together.']),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'Incline Dumbbell Press', 'Chest', 'Upper chest', array['Front delts', 'Triceps'], 'dumbbell', '/exercise-images/incline-dumbbell-press.jpg', false, array['Set the bench to a low or moderate incline.', 'Lower the dumbbells beside the upper chest.', 'Press up while keeping the shoulders down and back.']),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'Incline Barbell Bench Press', 'Chest', 'Upper chest', array['Front delts', 'Triceps'], 'barbell', '/exercise-images/incline-barbell-bench-press.jpg', false, array['Set a low or moderate bench incline and brace the upper back.', 'Lower the bar under control toward the upper chest.', 'Press the bar up without letting the shoulders roll forward.']),
  ('10000000-0000-4000-8000-000000000005'::uuid, 'Converging Chest Press Machine', 'Chest', 'Chest', array['Front delts', 'Triceps'], 'machine', '/exercise-images/converging-chest-press-machine.jpg', false, array['Adjust the seat so the handles line up with the mid chest.', 'Press the handles forward and inward under control.', 'Return until the chest is stretched without lifting the shoulders.']),
  ('10000000-0000-4000-8000-000000000006'::uuid, 'Converging Incline Chest Press Machine', 'Chest', 'Upper chest', array['Front delts', 'Triceps'], 'machine', '/exercise-images/converging-incline-chest-press-machine.jpg', false, array['Adjust the seat so the handles begin near the upper chest.', 'Press along the machine path while keeping the back supported.', 'Lower slowly without letting the weight stack slam.']),
  ('10000000-0000-4000-8000-000000000007'::uuid, 'Pec Fly Machine', 'Chest', 'Chest', array['Front delts'], 'machine', '/exercise-images/pec-fly-machine.jpg', false, array['Set the handles so the upper arms start just behind the torso.', 'Bring the arms together with a soft bend at the elbows.', 'Return slowly until the chest is comfortably stretched.']),
  ('10000000-0000-4000-8000-000000000008'::uuid, 'Low-to-High Cable Fly', 'Chest', 'Upper chest', array['Front delts'], 'cable', '/exercise-images/low-to-high-cable-fly.jpg', false, array['Set both pulleys low and take a split stance.', 'Sweep the handles upward and inward toward the upper chest.', 'Return along the same path while keeping the torso still.']),
  ('10000000-0000-4000-8000-000000000009'::uuid, 'High-to-Low Cable Fly', 'Chest', 'Lower chest', array['Front delts'], 'cable', '/exercise-images/high-to-low-cable-fly.jpg', false, array['Set both pulleys high and lean forward slightly.', 'Sweep the handles down and together in front of the lower chest.', 'Control the return without shrugging the shoulders.']),
  ('10000000-0000-4000-8000-000000000010'::uuid, 'Smith Machine Bench Press', 'Chest', 'Chest', array['Front delts', 'Triceps'], 'smith_machine', '/exercise-images/smith-machine-bench-press.jpg', false, array['Place the bench so the bar tracks to the mid chest.', 'Lower the bar under control with the upper back braced.', 'Press to straight arms without forcing the elbows past comfort.']),
  ('10000000-0000-4000-8000-000000000011'::uuid, 'Smith Machine Incline Bench Press', 'Chest', 'Upper chest', array['Front delts', 'Triceps'], 'smith_machine', '/exercise-images/smith-machine-incline-bench-press.jpg', false, array['Set the bench on a low incline beneath the bar path.', 'Lower the bar toward the upper chest.', 'Press up while keeping the shoulders against the bench.']),
  ('10000000-0000-4000-8000-000000000012'::uuid, 'Push-Up', 'Chest', 'Chest', array['Front delts', 'Triceps', 'Core'], 'bodyweight', '/exercise-images/push-up.jpg', true, array['Keep a straight line from head to heels.', 'Lower the chest between the hands with the elbows controlled.', 'Push the floor away while keeping the trunk braced.']),
  ('10000000-0000-4000-8000-000000000013'::uuid, 'Dumbbell Shoulder Press', 'Shoulders', 'Front delts', array['Side delts', 'Triceps'], 'dumbbell', '/exercise-images/dumbbell-shoulder-press.jpg', false, array['Start with the dumbbells just outside shoulder height.', 'Press overhead without overextending the lower back.', 'Lower until the elbows reach a comfortable depth.']),
  ('10000000-0000-4000-8000-000000000014'::uuid, 'Smith Machine Shoulder Press', 'Shoulders', 'Front delts', array['Side delts', 'Triceps'], 'smith_machine', '/exercise-images/smith-machine-shoulder-press.jpg', false, array['Position the seat so the bar clears the face safely.', 'Press the bar overhead while keeping the ribs down.', 'Lower to a comfortable point near shoulder height.']),
  ('10000000-0000-4000-8000-000000000015'::uuid, 'Standing Barbell Shoulder Press', 'Shoulders', 'Front delts', array['Side delts', 'Triceps', 'Core'], 'barbell', '/exercise-images/standing-barbell-shoulder-press.jpg', false, array['Stand tall with the bar at the upper chest.', 'Brace the trunk and press the bar overhead.', 'Finish with the bar over the midfoot, then lower with control.']),
  ('10000000-0000-4000-8000-000000000016'::uuid, 'Seated Barbell Shoulder Press', 'Shoulders', 'Front delts', array['Side delts', 'Triceps'], 'barbell', '/exercise-images/seated-barbell-shoulder-press.jpg', false, array['Sit with the upper back supported and the bar at shoulder height.', 'Press overhead without flaring the ribs.', 'Lower the bar under control to a comfortable depth.']),
  ('10000000-0000-4000-8000-000000000017'::uuid, 'Dumbbell Lateral Raise', 'Shoulders', 'Side delts', array['Upper traps'], 'dumbbell', '/exercise-images/dumbbell-lateral-raise.jpg', false, array['Hold the dumbbells by the sides with soft elbows.', 'Raise the arms out until roughly level with the shoulders.', 'Lower slowly without swinging through the torso.']),
  ('10000000-0000-4000-8000-000000000018'::uuid, 'Single-Arm Cable Lateral Raise', 'Shoulders', 'Side delts', array['Upper traps'], 'cable', '/exercise-images/single-arm-cable-lateral-raise.jpg', false, array['Stand side-on to a low pulley and hold the far handle.', 'Lead with the elbow as the arm rises out to the side.', 'Lower under cable tension without leaning or swinging.']),
  ('10000000-0000-4000-8000-000000000019'::uuid, 'Cable Lateral Raise', 'Shoulders', 'Side delts', array['Upper traps'], 'cable', '/exercise-images/cable-lateral-raise.jpg', false, array['Start with the cables low and crossed in front if needed.', 'Raise both arms out with a small elbow bend.', 'Pause near shoulder height and return slowly.']),
  ('10000000-0000-4000-8000-000000000020'::uuid, 'Machine Lateral Raise', 'Shoulders', 'Side delts', array['Upper traps'], 'machine', '/exercise-images/machine-lateral-raise.jpg', false, array['Adjust the seat so the pads sit just above the elbows.', 'Raise the pads by driving the elbows outward.', 'Lower slowly and keep the shoulders away from the ears.']),
  ('10000000-0000-4000-8000-000000000021'::uuid, 'Seated Shoulder Press Machine', 'Shoulders', 'Front delts', array['Side delts', 'Triceps'], 'machine', '/exercise-images/seated-shoulder-press-machine.jpg', false, array['Adjust the seat so the handles begin near shoulder height.', 'Press overhead while keeping the back against the pad.', 'Lower smoothly without letting the stack slam.']),
  ('10000000-0000-4000-8000-000000000022'::uuid, 'Arnold Press', 'Shoulders', 'Front delts', array['Side delts', 'Triceps'], 'dumbbell', '/exercise-images/arnold-press.jpg', false, array['Begin seated with palms facing you at shoulder height.', 'Rotate the palms forward as you press overhead.', 'Reverse the path slowly while keeping the torso braced.']),
  ('10000000-0000-4000-8000-000000000023'::uuid, 'Triceps Pushdown', 'Triceps', 'Triceps', array['Forearms'], 'cable', '/exercise-images/triceps-pushdown.jpg', false, array['Pin the elbows beside the torso with the handle at chest height.', 'Extend the elbows until the arms are straight.', 'Return slowly without letting the elbows drift forward.']),
  ('10000000-0000-4000-8000-000000000024'::uuid, 'Overhead Cable Triceps Extension', 'Triceps', 'Triceps long head', array['Core'], 'cable', '/exercise-images/overhead-cable-triceps-extension.jpg', false, array['Face away from the pulley with the cable behind the head.', 'Keep the upper arms still and extend the elbows.', 'Allow a controlled stretch before the next repetition.']),
  ('10000000-0000-4000-8000-000000000025'::uuid, 'Close-Grip Bench Press', 'Triceps', 'Triceps', array['Chest', 'Front delts'], 'barbell', '/exercise-images/close-grip-bench-press.jpg', false, array['Use a comfortable grip just inside normal bench width.', 'Lower the bar with the elbows close to the torso.', 'Press up while keeping the wrists stacked over the forearms.']),
  ('10000000-0000-4000-8000-000000000026'::uuid, 'Smith Machine JM Press', 'Triceps', 'Triceps', array['Chest', 'Front delts'], 'smith_machine', '/exercise-images/smith-machine-jm-press.jpg', false, array['Use a close grip and begin with the bar above the upper chest.', 'Bend the elbows to bring the bar toward the chin or upper chest.', 'Extend the elbows while keeping the upper arms controlled.']),
  ('10000000-0000-4000-8000-000000000027'::uuid, 'Single-Arm Cable Triceps Extension', 'Triceps', 'Triceps', array['Forearms'], 'cable', '/exercise-images/single-arm-cable-triceps-extension.jpg', false, array['Stand square to the pulley with the working elbow by the side.', 'Straighten the arm without rotating the torso.', 'Return slowly while keeping the upper arm still.']),
  ('10000000-0000-4000-8000-000000000028'::uuid, 'Single-Arm Overhead Cable Triceps Extension', 'Triceps', 'Triceps long head', array['Core'], 'cable', '/exercise-images/single-arm-overhead-cable-triceps-extension.jpg', false, array['Turn away from a low cable with the elbow beside the head.', 'Extend the elbow until the arm is straight overhead.', 'Lower slowly into a comfortable triceps stretch.']),
  ('10000000-0000-4000-8000-000000000029'::uuid, 'Seated Dip Machine', 'Triceps', 'Triceps', array['Chest', 'Front delts'], 'machine', '/exercise-images/seated-dip-machine.jpg', false, array['Adjust the seat and secure the thighs under the pad.', 'Press the handles down while keeping the chest tall.', 'Return until the elbows are comfortably bent.']),
  ('10000000-0000-4000-8000-000000000030'::uuid, 'Dip', 'Triceps', 'Triceps', array['Chest', 'Front delts'], 'bodyweight', '/exercise-images/dip.jpg', true, array['Support yourself on parallel bars with shoulders down.', 'Lower until the upper arms reach a comfortable depth.', 'Press back up without bouncing out of the bottom.']),
  ('10000000-0000-4000-8000-000000000031'::uuid, 'EZ-Bar Skull Crusher', 'Triceps', 'Triceps long head', array['Forearms'], 'barbell', '/exercise-images/ez-bar-skull-crusher.jpg', false, array['Lie back with the bar above the shoulders.', 'Bend only the elbows to lower the bar toward the forehead.', 'Extend the elbows while keeping the upper arms steady.']),
  ('10000000-0000-4000-8000-000000000032'::uuid, 'Cable Preacher Curl', 'Biceps', 'Biceps', array['Forearms'], 'cable', '/exercise-images/cable-preacher-curl.jpg', false, array['Set the upper arms firmly against the preacher pad.', 'Curl the handle without lifting the elbows from the pad.', 'Lower to near-straight arms under control.']),
  ('10000000-0000-4000-8000-000000000033'::uuid, 'Barbell Preacher Curl', 'Biceps', 'Biceps', array['Forearms'], 'barbell', '/exercise-images/barbell-preacher-curl.jpg', false, array['Rest the upper arms fully on the preacher pad.', 'Curl the bar while keeping the shoulders still.', 'Lower slowly without locking the elbows forcefully.']),
  ('10000000-0000-4000-8000-000000000034'::uuid, 'Barbell Biceps Curl', 'Biceps', 'Biceps', array['Forearms'], 'barbell', '/exercise-images/barbell-biceps-curl.jpg', false, array['Stand tall with the elbows close to the sides.', 'Curl the bar without swinging the hips.', 'Lower until the arms are almost straight.']),
  ('10000000-0000-4000-8000-000000000035'::uuid, 'Dumbbell Biceps Curl', 'Biceps', 'Biceps', array['Forearms'], 'dumbbell', '/exercise-images/dumbbell-biceps-curl.jpg', false, array['Hold the dumbbells by the sides with the palms forward.', 'Curl while keeping the elbows close to the torso.', 'Lower each dumbbell slowly without leaning back.']),
  ('10000000-0000-4000-8000-000000000036'::uuid, 'Cable Biceps Curl', 'Biceps', 'Biceps', array['Forearms'], 'cable', '/exercise-images/cable-biceps-curl.jpg', false, array['Stand over a low pulley with the arms nearly straight.', 'Curl the handle while keeping the upper arms still.', 'Return under tension without letting the stack touch down.']),
  ('10000000-0000-4000-8000-000000000037'::uuid, 'Single-Arm Cable Biceps Curl', 'Biceps', 'Biceps', array['Forearms'], 'cable', '/exercise-images/single-arm-cable-biceps-curl.jpg', false, array['Face a low pulley with the working arm nearly straight.', 'Curl the handle without moving the shoulder forward.', 'Lower slowly and complete both sides.']),
  ('10000000-0000-4000-8000-000000000038'::uuid, 'Cable Hammer Curl', 'Biceps', 'Brachialis', array['Biceps', 'Brachioradialis'], 'cable', '/exercise-images/cable-hammer-curl.jpg', false, array['Use a rope with the palms facing each other.', 'Curl while keeping the elbows pinned by the sides.', 'Lower under control and keep the neutral grip.']),
  ('10000000-0000-4000-8000-000000000039'::uuid, 'Dumbbell Hammer Curl', 'Biceps', 'Brachialis', array['Biceps', 'Brachioradialis'], 'dumbbell', '/exercise-images/dumbbell-hammer-curl.jpg', false, array['Hold the dumbbells with palms facing the thighs.', 'Curl without rotating the wrists or swinging.', 'Lower slowly until the elbows are almost straight.']),
  ('10000000-0000-4000-8000-000000000040'::uuid, 'Barbell Reverse Curl', 'Biceps', 'Brachioradialis', array['Biceps', 'Forearms'], 'barbell', '/exercise-images/barbell-reverse-curl.jpg', false, array['Hold the bar with palms facing down and wrists straight.', 'Curl while keeping the elbows close to the sides.', 'Lower under control without bending the wrists.']),
  ('10000000-0000-4000-8000-000000000041'::uuid, 'Cable Reverse Curl', 'Biceps', 'Brachioradialis', array['Biceps', 'Forearms'], 'cable', '/exercise-images/cable-reverse-curl.jpg', false, array['Use an overhand grip on a straight cable attachment.', 'Curl with the elbows still and the wrists neutral.', 'Lower slowly while maintaining cable tension.']),
  ('10000000-0000-4000-8000-000000000042'::uuid, 'Incline Dumbbell Curl', 'Biceps', 'Biceps', array['Forearms'], 'dumbbell', '/exercise-images/incline-dumbbell-curl.jpg', false, array['Sit against an incline bench with the arms hanging down.', 'Curl without allowing the elbows to move forward.', 'Lower slowly into a comfortable stretch.']),
  ('10000000-0000-4000-8000-000000000043'::uuid, 'Machine Preacher Curl', 'Biceps', 'Biceps', array['Forearms'], 'machine', '/exercise-images/machine-preacher-curl.jpg', false, array['Adjust the seat so the upper arms lie flat on the pad.', 'Curl the handles without lifting the shoulders.', 'Return slowly without letting the stack slam.']),
  ('10000000-0000-4000-8000-000000000044'::uuid, 'Barbell Back Squat', 'Legs', 'Quadriceps', array['Glutes', 'Hamstrings', 'Core'], 'barbell', '/exercise-images/barbell-back-squat.jpg', false, array['Set the bar securely across the upper back and brace.', 'Sit down between the hips while the knees track over the feet.', 'Drive through the whole foot to stand tall.']),
  ('10000000-0000-4000-8000-000000000045'::uuid, 'Hack Squat', 'Legs', 'Quadriceps', array['Glutes', 'Hamstrings'], 'machine', '/exercise-images/hack-squat.jpg', false, array['Set the shoulders and back firmly against the pads.', 'Lower until the knees reach a comfortable depth.', 'Push through the whole foot without locking the knees harshly.']),
  ('10000000-0000-4000-8000-000000000046'::uuid, 'Pendulum Squat', 'Legs', 'Quadriceps', array['Glutes', 'Hamstrings'], 'plate_loaded', '/exercise-images/pendulum-squat.jpg', false, array['Set the shoulders under the pads and brace against the backrest.', 'Follow the machine arc into a controlled deep squat.', 'Drive the platform away while keeping the feet planted.']),
  ('10000000-0000-4000-8000-000000000047'::uuid, 'Leg Extension', 'Legs', 'Quadriceps', array[]::text[], 'machine', '/exercise-images/leg-extension.jpg', false, array['Align the knee joint with the machine pivot.', 'Extend the knees until the legs are nearly straight.', 'Lower slowly without letting the stack slam.']),
  ('10000000-0000-4000-8000-000000000048'::uuid, 'Lying Leg Curl', 'Legs', 'Hamstrings', array['Calves'], 'machine', '/exercise-images/lying-leg-curl.jpg', false, array['Align the knees with the machine pivot and keep the hips down.', 'Curl the pad toward the glutes without lifting the torso.', 'Lower slowly to almost straight legs.']),
  ('10000000-0000-4000-8000-000000000049'::uuid, 'Seated Leg Curl', 'Legs', 'Hamstrings', array['Calves'], 'machine', '/exercise-images/seated-leg-curl.jpg', false, array['Align the knees with the pivot and secure the thigh pad.', 'Curl the lower legs down and back.', 'Return slowly while keeping the hips against the seat.']),
  ('10000000-0000-4000-8000-000000000050'::uuid, 'Standing Calf Raise', 'Legs', 'Calves', array[]::text[], 'machine', '/exercise-images/standing-calf-raise.jpg', false, array['Place the balls of the feet on the platform with heels free.', 'Rise as high as comfortable through the ankles.', 'Lower the heels slowly into a controlled stretch.']),
  ('10000000-0000-4000-8000-000000000051'::uuid, 'Seated Calf Raise', 'Legs', 'Calves', array[]::text[], 'machine', '/exercise-images/seated-calf-raise.jpg', false, array['Set the knee pad firmly above the knees.', 'Raise the heels while keeping the balls of the feet planted.', 'Lower slowly through a comfortable ankle range.']),
  ('10000000-0000-4000-8000-000000000052'::uuid, 'Hip Abduction Machine', 'Legs', 'Hip abductors', array['Glutes'], 'machine', '/exercise-images/hip-abduction-machine.jpg', false, array['Sit with the outer knees against the pads.', 'Open the legs without rocking the torso.', 'Return slowly and keep tension on the hips.']),
  ('10000000-0000-4000-8000-000000000053'::uuid, 'Hip Adduction Machine', 'Legs', 'Hip adductors', array['Inner thighs'], 'machine', '/exercise-images/hip-adduction-machine.jpg', false, array['Sit with the inner knees against the pads.', 'Bring the legs together without bouncing.', 'Return slowly into a comfortable stretch.']),
  ('10000000-0000-4000-8000-000000000054'::uuid, 'Leg Press', 'Legs', 'Quadriceps', array['Glutes', 'Hamstrings'], 'machine', '/exercise-images/leg-press.jpg', false, array['Set the feet securely on the platform and keep the hips down.', 'Lower the platform until the knees reach a comfortable depth.', 'Press through the whole foot without locking the knees harshly.']),
  ('10000000-0000-4000-8000-000000000055'::uuid, 'Romanian Deadlift', 'Legs', 'Hamstrings', array['Glutes', 'Lower back'], 'barbell', '/exercise-images/romanian-deadlift.jpg', false, array['Hold the bar close to the thighs with soft knees.', 'Push the hips back while keeping the spine braced.', 'Stand by driving the hips forward as the bar stays close.']),
  ('10000000-0000-4000-8000-000000000056'::uuid, 'Bulgarian Split Squat', 'Legs', 'Quadriceps', array['Glutes', 'Hamstrings'], 'dumbbell', '/exercise-images/bulgarian-split-squat.jpg', false, array['Place the rear foot on a bench and set a stable front stance.', 'Lower the rear knee while the front foot stays planted.', 'Drive through the front foot to stand.']),
  ('10000000-0000-4000-8000-000000000057'::uuid, 'Barbell Hip Thrust', 'Legs', 'Glutes', array['Hamstrings'], 'barbell', '/exercise-images/barbell-hip-thrust.jpg', false, array['Brace the upper back on a bench and pad the bar over the hips.', 'Drive through the heels until the hips are fully extended.', 'Lower under control without overextending the lower back.']),
  ('10000000-0000-4000-8000-000000000058'::uuid, 'Lat Pulldown', 'Back', 'Lats', array['Biceps', 'Mid back'], 'cable', '/exercise-images/lat-pulldown.jpg', false, array['Sit securely under the thigh pads with a tall chest.', 'Pull the bar toward the upper chest by driving the elbows down.', 'Return slowly until the arms are straight overhead.']),
  ('10000000-0000-4000-8000-000000000059'::uuid, 'Diverging Lat Pulldown Machine', 'Back', 'Lats', array['Biceps', 'Mid back'], 'machine', '/exercise-images/diverging-lat-pulldown-machine.jpg', false, array['Adjust the seat and secure the thighs under the pad.', 'Drive both elbows down as the handles separate along the path.', 'Return slowly without shrugging at the top.']),
  ('10000000-0000-4000-8000-000000000060'::uuid, 'Plate-Loaded Diverging Lat Pulldown', 'Back', 'Lats', array['Biceps', 'Mid back'], 'plate_loaded', '/exercise-images/plate-loaded-diverging-lat-pulldown.jpg', false, array['Set the seat so the handles are reachable with straight arms.', 'Pull the independent handles down by leading with the elbows.', 'Control the machine back to a full comfortable stretch.']),
  ('10000000-0000-4000-8000-000000000061'::uuid, 'Wide-Grip Seated Cable Row', 'Back', 'Upper back', array['Lats', 'Rear delts', 'Biceps'], 'cable', '/exercise-images/wide-grip-seated-cable-row.jpg', false, array['Sit tall and take a wide grip with the arms straight.', 'Pull toward the upper torso while spreading the elbows.', 'Return without rounding or rocking the torso.']),
  ('10000000-0000-4000-8000-000000000062'::uuid, 'Narrow-Grip Seated Cable Row', 'Back', 'Mid back', array['Lats', 'Biceps'], 'cable', '/exercise-images/narrow-grip-seated-cable-row.jpg', false, array['Sit tall with the feet braced and arms straight.', 'Pull the handle toward the lower ribs with elbows close.', 'Return slowly without leaning far forward.']),
  ('10000000-0000-4000-8000-000000000063'::uuid, 'Wide-Grip Plate-Loaded Row', 'Back', 'Upper back', array['Lats', 'Rear delts', 'Biceps'], 'plate_loaded', '/exercise-images/wide-grip-plate-loaded-row.jpg', false, array['Adjust the seat so the chest stays against the pad.', 'Pull the wide handles back with the elbows flared slightly.', 'Return until the shoulder blades move forward under control.']),
  ('10000000-0000-4000-8000-000000000064'::uuid, 'Narrow-Grip Plate-Loaded Row', 'Back', 'Mid back', array['Lats', 'Biceps'], 'plate_loaded', '/exercise-images/narrow-grip-plate-loaded-row.jpg', false, array['Set the chest pad so the handles align with the lower ribs.', 'Pull with elbows close to the torso.', 'Return slowly without lifting the chest from the pad.']),
  ('10000000-0000-4000-8000-000000000065'::uuid, 'Cable Rear Delt Fly', 'Back', 'Rear delts', array['Upper back'], 'cable', '/exercise-images/cable-rear-delt-fly.jpg', false, array['Set the cables around shoulder height and cross the handles.', 'Open the arms with soft elbows and a still torso.', 'Return slowly while keeping tension on the rear shoulders.']),
  ('10000000-0000-4000-8000-000000000066'::uuid, 'Rear Delt Fly Machine', 'Back', 'Rear delts', array['Upper back'], 'machine', '/exercise-images/rear-delt-fly-machine.jpg', false, array['Face the pad and set the handles near shoulder height.', 'Open the arms by driving the elbows back and outward.', 'Return slowly without shrugging.']),
  ('10000000-0000-4000-8000-000000000067'::uuid, 'Face Pull', 'Back', 'Rear delts', array['Upper back', 'Rotator cuff'], 'cable', '/exercise-images/face-pull.jpg', false, array['Set a rope around face height and step back.', 'Pull toward the face while separating the rope ends.', 'Return with control and keep the shoulders down.']),
  ('10000000-0000-4000-8000-000000000068'::uuid, 'Plate-Loaded T-Bar Row', 'Back', 'Mid back', array['Lats', 'Biceps', 'Rear delts'], 'plate_loaded', '/exercise-images/plate-loaded-t-bar-row.jpg', false, array['Brace the torso on the pad if the machine provides one.', 'Pull the handles toward the lower ribs.', 'Lower until the arms are straight without losing the brace.']),
  ('10000000-0000-4000-8000-000000000069'::uuid, 'Pull-Up', 'Back', 'Lats', array['Biceps', 'Mid back', 'Core'], 'bodyweight', '/exercise-images/pull-up.jpg', true, array['Hang from the bar with the shoulders active.', 'Pull the chest upward by driving the elbows down.', 'Lower to straight arms under control.']),
  ('10000000-0000-4000-8000-000000000070'::uuid, 'One-Arm Dumbbell Row', 'Back', 'Lats', array['Mid back', 'Biceps', 'Rear delts'], 'dumbbell', '/exercise-images/one-arm-dumbbell-row.jpg', false, array['Brace one hand and keep the torso stable.', 'Pull the dumbbell toward the hip with the elbow close.', 'Lower until the arm is straight without twisting.']),
  ('10000000-0000-4000-8000-000000000071'::uuid, 'Bent-Over Barbell Row', 'Back', 'Mid back', array['Lats', 'Biceps', 'Rear delts'], 'barbell', '/exercise-images/bent-over-barbell-row.jpg', false, array['Hinge at the hips and brace the torso near horizontal.', 'Pull the bar toward the lower ribs.', 'Lower with control while maintaining the hinge.']),
  ('10000000-0000-4000-8000-000000000072'::uuid, 'Straight-Arm Cable Pulldown', 'Back', 'Lats', array['Triceps', 'Core'], 'cable', '/exercise-images/straight-arm-cable-pulldown.jpg', false, array['Stand back from a high pulley with soft elbows.', 'Sweep the handle down toward the thighs without bending the arms.', 'Return slowly while keeping the ribs controlled.']),
  ('10000000-0000-4000-8000-000000000073'::uuid, 'Conventional Barbell Deadlift', 'Back', 'Lower back', array['Glutes', 'Hamstrings', 'Traps', 'Forearms'], 'barbell', '/exercise-images/conventional-barbell-deadlift.jpg', false, array['Stand with the bar over the midfoot and brace before lifting.', 'Push the floor away while keeping the bar close.', 'Stand tall, then return the bar with a controlled hip hinge.']);

commit;

