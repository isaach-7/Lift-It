begin;

create or replace function public.finish_workout(p_id uuid,p_abandon boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.workout_sessions;
begin
  if p_abandon is null then raise exception 'Completion choice required'; end if;
  select * into s from public.workout_sessions
    where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'Workout unavailable'; end if;
  if s.status<>'in_progress' then return; end if;
  update public.workout_sessions
    set status=case when p_abandon then 'abandoned' else 'completed' end,
      completed_at=now()
    where id=p_id;
end; $$;

commit;
