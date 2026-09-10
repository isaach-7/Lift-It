begin;

create function public.unlog_workout_set(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.sets;
  e public.session_exercises;
  owner uuid;
  session_status text;
  restored numeric;
begin
  select * into s from public.sets where id = p_id for update;
  select * into e from public.session_exercises
    where id = s.session_exercise_id;
  select user_id, status into owner, session_status
    from public.workout_sessions where id = e.session_id for update;
  if owner is distinct from auth.uid() or owner is null then
    raise exception 'Set unavailable';
  end if;
  if session_status <> 'in_progress' then
    raise exception 'Workout is not active';
  end if;

  if s.completed_at is not null then
    update public.sets set
      reps = null,
      weight = null,
      completed_at = null,
      next_weight = null,
      override_scope = null
      where id = p_id
      returning * into s;

    if e.auto_increment_enabled then
      select x.next_weight into restored
        from public.sets x
        join public.session_exercises se on se.id = x.session_exercise_id
        join public.workout_sessions ws on ws.id = se.session_id
        where ws.user_id = owner
          and se.exercise_id = e.exercise_id
          and se.equipment_key = e.equipment_key
          and se.auto_increment_enabled
          and x.completed_at is not null
          and x.set_type <> 'warmup'
          and x.next_weight is not null
          and x.override_scope is distinct from 'once'
        order by x.completed_at desc, ws.started_at desc, x.set_number desc
        limit 1;

      if restored is null then
        delete from public.exercise_progression
          where user_id = owner
            and exercise_id = e.exercise_id
            and equipment_key = e.equipment_key;
      else
        insert into public.exercise_progression(
          user_id, exercise_id, equipment_key, current_weight
        ) values(owner, e.exercise_id, e.equipment_key, restored)
        on conflict(user_id, exercise_id, equipment_key) do update set
          current_weight = excluded.current_weight,
          updated_at = now();
      end if;
    end if;
  end if;

  select current_weight into restored
    from public.exercise_progression
    where user_id = owner
      and exercise_id = e.exercise_id
      and equipment_key = e.equipment_key;

  return jsonb_build_object(
    'set', to_jsonb(s),
    'current_weight', to_jsonb(restored)
  );
end; $$;

revoke all on function public.unlog_workout_set(uuid) from public, anon;
grant execute on function public.unlog_workout_set(uuid) to authenticated;

commit;
