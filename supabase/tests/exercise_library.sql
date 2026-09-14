-- Disposable accounts, workouts, and selections are rolled back together.
begin;

do $$ begin
  assert (select count(*) from public.exercises) = 73,
    'Expected the complete built-in exercise library';
  assert (select count(*) from public.exercises where muscle_group = 'Chest') = 12,
    'Chest exercise count changed';
  assert (select count(*) from public.exercises where muscle_group = 'Shoulders') = 10,
    'Shoulder exercise count changed';
  assert (select count(*) from public.exercises where muscle_group = 'Triceps') = 9,
    'Triceps exercise count changed';
  assert (select count(*) from public.exercises where muscle_group = 'Biceps') = 12,
    'Biceps exercise count changed';
  assert (select count(*) from public.exercises where muscle_group = 'Legs') = 14,
    'Leg exercise count changed';
  assert (select count(*) from public.exercises where muscle_group = 'Back') = 16,
    'Back exercise count changed';
  assert not exists (
    select 1 from public.exercises
    where cardinality(instructions) < 2 or image_path = ''
  ), 'Every exercise needs instructions and an image';
  assert (
    select array_agg(name order by name)
    from public.exercises where supports_added_weight
  ) = array['Dip', 'Pull-Up', 'Push-Up'],
    'Weighted bodyweight options changed';
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000031', 'exercises-a@example.invalid'),
  ('00000000-0000-4000-8000-000000000032', 'exercises-b@example.invalid');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000031';
select public.save_profile('Exercise tester A', 3, null, null, null, 'kg', true);

insert into public.workout_templates (id, user_id, name) values
  ('00000000-0000-4000-8000-000000000041', auth.uid(), 'Push day');

insert into public.workout_template_exercises (
  user_id,
  workout_template_id,
  exercise_id,
  position
) values (
  auth.uid(),
  '00000000-0000-4000-8000-000000000041',
  '10000000-0000-4000-8000-000000000001',
  0
);

do $$ begin
  assert (select count(*) from public.workout_template_exercises) = 1,
    'Owner could not add an exercise';
  begin
    insert into public.workout_template_exercises (
      user_id, workout_template_id, exercise_id, position
    ) values (
      auth.uid(),
      '00000000-0000-4000-8000-000000000041',
      '10000000-0000-4000-8000-000000000001',
      1
    );
    raise exception 'Duplicate exercise was allowed';
  exception when unique_violation then null;
  end;
  begin
    insert into public.exercises (
      id, name, muscle_group, primary_muscle, equipment_type,
      image_path, instructions
    ) values (
      '00000000-0000-4000-8000-000000000099',
      'Unauthorized exercise',
      'Chest',
      'Chest',
      'barbell',
      '/exercise-images/unauthorized.jpg',
      array['One', 'Two']
    );
    raise exception 'System exercise insert was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000032';
select public.save_profile('Exercise tester B', 3, null, null, null, 'kg', true);

insert into public.workout_templates (id, user_id, name) values
  ('00000000-0000-4000-8000-000000000042', auth.uid(), 'Pull day');

do $$ begin
  assert (select count(*) from public.exercises) = 73,
    'Authenticated users should see the system library';
  assert (select count(*) from public.workout_template_exercises) = 0,
    'User B can see User A selections';
  begin
    insert into public.workout_template_exercises (
      user_id, workout_template_id, exercise_id, position
    ) values (
      '00000000-0000-4000-8000-000000000031',
      '00000000-0000-4000-8000-000000000041',
      '10000000-0000-4000-8000-000000000002',
      1
    );
    raise exception 'Cross-user exercise insert was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

delete from public.workout_template_exercises
where workout_template_id = '00000000-0000-4000-8000-000000000041';

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000031';
do $$ begin
  assert (select count(*) from public.workout_template_exercises) = 1,
    'Cross-user delete removed a selection';
  assert not has_table_privilege('anon', 'public.exercises', 'SELECT'),
    'Anonymous exercise reads were allowed';
  assert not has_table_privilege('authenticated', 'public.exercises', 'INSERT'),
    'Client exercise inserts were allowed';
  assert not has_table_privilege('authenticated', 'public.exercises', 'UPDATE'),
    'Client exercise updates were allowed';
  assert not has_table_privilege('authenticated', 'public.exercises', 'DELETE'),
    'Client exercise deletes were allowed';
end $$;

delete from public.workout_template_exercises
where workout_template_id = '00000000-0000-4000-8000-000000000041';

do $$ begin
  assert (select count(*) from public.workout_template_exercises) = 0,
    'Owner could not remove an exercise';
end $$;

reset role;
rollback;
