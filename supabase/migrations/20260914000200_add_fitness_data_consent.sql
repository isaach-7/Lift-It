begin;

alter table public.profiles
  add column fitness_data_consent_at timestamptz,
  add column privacy_notice_version text,
  add constraint profile_fitness_consent_pair check (
    (fitness_data_consent_at is null and privacy_notice_version is null)
    or (
      fitness_data_consent_at is not null
      and privacy_notice_version is not null
      and char_length(privacy_notice_version) between 1 and 40
    )
  );

create function public.enforce_fitness_data_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare owner_id uuid;
begin
  case tg_table_name
    when 'weight_logs' then owner_id := new.user_id;
    when 'workout_templates' then owner_id := new.user_id;
    when 'workout_template_exercises' then owner_id := new.user_id;
    when 'workout_template_sets' then
      select user_id into owner_id from public.workout_templates
        where id = new.workout_template_id;
    when 'workout_sessions' then owner_id := new.user_id;
    when 'session_exercises' then
      select user_id into owner_id from public.workout_sessions
        where id = new.session_id;
    when 'sets' then
      select s.user_id into owner_id
        from public.workout_sessions s
        join public.session_exercises e on e.session_id = s.id
        where e.id = new.session_exercise_id;
    when 'exercise_progression' then owner_id := new.user_id;
  end case;

  if owner_id is null or not exists (
    select 1 from public.profiles
      where id = owner_id and fitness_data_consent_at is not null
  ) then
    raise exception 'Explicit fitness data consent required';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_fitness_data_consent() from public, anon, authenticated;

create trigger require_consent_for_weight_logs
  before insert or update on public.weight_logs
  for each row execute function public.enforce_fitness_data_consent();
create trigger require_consent_for_workout_templates
  before insert or update on public.workout_templates
  for each row execute function public.enforce_fitness_data_consent();
create trigger require_consent_for_workout_template_exercises
  before insert or update on public.workout_template_exercises
  for each row execute function public.enforce_fitness_data_consent();
create trigger require_consent_for_workout_template_sets
  before insert or update on public.workout_template_sets
  for each row execute function public.enforce_fitness_data_consent();
create trigger require_consent_for_workout_sessions
  before insert or update on public.workout_sessions
  for each row execute function public.enforce_fitness_data_consent();
create trigger require_consent_for_session_exercises
  before insert or update on public.session_exercises
  for each row execute function public.enforce_fitness_data_consent();
create trigger require_consent_for_sets
  before insert or update on public.sets
  for each row execute function public.enforce_fitness_data_consent();
create trigger require_consent_for_exercise_progression
  before insert or update on public.exercise_progression
  for each row execute function public.enforce_fitness_data_consent();

revoke all on function public.save_profile(text, integer, numeric, numeric, uuid, text)
  from public, anon, authenticated;
drop function public.save_profile(text, integer, numeric, numeric, uuid, text);

create function public.save_profile(
  p_name text,
  p_goal integer,
  p_height numeric,
  p_weight numeric,
  p_weight_id uuid,
  p_unit text,
  p_consent boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.profiles;
  result public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_name is null or p_goal is null then raise exception 'Name and goal required'; end if;
  if p_unit not in ('kg', 'lb') then raise exception 'Invalid weight unit'; end if;

  select * into existing from public.profiles
    where id = auth.uid() for update;
  if not found then raise exception 'Profile unavailable'; end if;
  if existing.fitness_data_consent_at is null and p_consent is distinct from true then
    raise exception 'Explicit fitness data consent required';
  end if;

  update public.profiles set
    preferred_name = btrim(p_name),
    weekly_goal = p_goal,
    height_cm = p_height,
    preferred_weight_unit = p_unit,
    onboarding_completed_at = coalesce(onboarding_completed_at, now()),
    fitness_data_consent_at = coalesce(fitness_data_consent_at, now()),
    privacy_notice_version = coalesce(privacy_notice_version, '2026-09-14')
    where id = auth.uid()
    returning * into result;

  if p_weight is not null then
    insert into public.weight_logs(id, user_id, weight_kg)
      values(p_weight_id, auth.uid(), p_weight)
      on conflict (id) do nothing;
    if not exists (
      select 1 from public.weight_logs
      where id = p_weight_id and user_id = auth.uid() and weight_kg = p_weight
    ) then raise exception 'Weight request conflict'; end if;
  end if;
  return result;
end;
$$;

revoke all on function public.save_profile(text, integer, numeric, numeric, uuid, text, boolean)
  from public, anon;
grant execute on function public.save_profile(text, integer, numeric, numeric, uuid, text, boolean)
  to authenticated;

commit;
