begin;

alter table public.profiles
  add column preferred_name text check (preferred_name = btrim(preferred_name) and char_length(preferred_name) between 1 and 60),
  add column height_cm numeric(6,2) check (height_cm > 0 and height_cm < 1000),
  add column weekly_goal integer check (weekly_goal between 1 and 7),
  add column onboarding_completed_at timestamptz;

create table public.weight_logs (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  weight_kg numeric(7,2) not null check (weight_kg > 0 and weight_kg < 10000),
  logged_at timestamptz not null default now()
);
create index weight_logs_owner_date on public.weight_logs(user_id, logged_at desc);
alter table public.weight_logs enable row level security;
revoke all on public.weight_logs from anon, authenticated;
grant select on public.weight_logs to authenticated;
create policy own_weights on public.weight_logs for select to authenticated using (user_id = (select auth.uid()));

create function public.save_profile(p_name text, p_goal integer, p_height numeric, p_weight numeric, p_weight_id uuid)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.profiles set preferred_name = btrim(p_name), weekly_goal = p_goal,
    height_cm = p_height, onboarding_completed_at = coalesce(onboarding_completed_at, now())
    where id = auth.uid() returning * into result;
  if not found then raise exception 'Profile unavailable'; end if;
  if p_name is null or p_goal is null then raise exception 'Name and goal required'; end if;
  if p_weight is not null then
    insert into public.weight_logs(id, user_id, weight_kg) values(p_weight_id, auth.uid(), p_weight)
      on conflict (id) do nothing;
    if not exists (select 1 from public.weight_logs where id=p_weight_id and user_id=auth.uid() and weight_kg=p_weight)
      then raise exception 'Weight request conflict'; end if;
  end if;
  return result;
end; $$;

alter table public.workout_template_exercises alter column auto_increment_enabled set default false;
alter table public.workout_template_exercises add constraint finite_increment check (increment_amount < 100000);
alter table public.workout_template_exercises add column available_weights numeric[] not null default '{}',
  add column uses_added_weight boolean not null default false,
  add column equipment_label text not null default 'Custom' check (char_length(equipment_label) between 1 and 120);
create table public.workout_template_sets (
  id uuid primary key,
  workout_template_id uuid not null,
  exercise_id uuid not null,
  position integer not null check(position between 0 and 99),
  set_type text not null check(set_type in ('warmup','standard','failure')),
  target_reps integer check(target_reps between 0 and 1000),
  target_weight numeric(8,2) check(target_weight >= 0 and target_weight < 100000),
  foreign key(workout_template_id,exercise_id) references public.workout_template_exercises(workout_template_id,exercise_id) on delete cascade,
  unique(workout_template_id,exercise_id,position)
);
alter table public.workout_template_sets enable row level security;
revoke all on public.workout_template_sets from anon, authenticated;
grant select on public.workout_template_sets to authenticated;
create policy own_template_sets on public.workout_template_sets for select to authenticated using (
  exists(select 1 from public.workout_templates t where t.id=workout_template_id and t.user_id=(select auth.uid()))
);

create function public.save_workout_template(p_id uuid, p_name text, p_exercises jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare e jsonb; s jsonb; n integer := 0; sn integer; weights numeric[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_exercises is null or jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises)>200 then raise exception 'Invalid exercises'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  if exists(select 1 from public.workout_templates where id=p_id and user_id<>auth.uid()) then raise exception 'Workout unavailable'; end if;
  insert into public.workout_templates(id,user_id,name) values(p_id,auth.uid(),btrim(p_name))
    on conflict(id) do update set name=excluded.name;
  delete from public.workout_template_exercises where workout_template_id=p_id;
  for e in select value from jsonb_array_elements(p_exercises) loop
    if not exists(select 1 from public.exercises where id=(e->>'exercise_id')::uuid and (created_by is null or created_by=auth.uid())) then raise exception 'Exercise unavailable'; end if;
    select coalesce(array_agg(v::numeric order by v::numeric), '{}') into weights from jsonb_array_elements_text(e->'available_weights') v;
    if cardinality(weights)>200 or exists(select 1 from unnest(weights) w where w<0 or w>=100000 or w::text='NaN') or cardinality(weights)<>(select count(distinct w) from unnest(weights) w) then raise exception 'Invalid available weights'; end if;
    insert into public.workout_template_exercises(user_id,workout_template_id,exercise_id,position,rest_timer_seconds,auto_increment_enabled,rep_range_lower,rep_range_upper,increment_amount,available_weights,uses_added_weight,equipment_label)
      values(auth.uid(),p_id,(e->>'exercise_id')::uuid,n,(e->>'rest_timer_seconds')::integer,(e->>'auto_increment_enabled')::boolean,(e->>'rep_range_lower')::integer,(e->>'rep_range_upper')::integer,(e->>'increment_amount')::numeric,weights,coalesce((e->>'uses_added_weight')::boolean,false),btrim(e->>'equipment_label'));
    sn:=0;
    if e->'sets' is null or jsonb_typeof(e->'sets') <> 'array' then raise exception 'Sets required'; end if;
    for s in select value from jsonb_array_elements(e->'sets') loop
      insert into public.workout_template_sets(id,workout_template_id,exercise_id,position,set_type,target_reps,target_weight)
        values((s->>'id')::uuid,p_id,(e->>'exercise_id')::uuid,sn,s->>'set_type',(s->>'target_reps')::integer,(s->>'target_weight')::numeric);
      sn:=sn+1;
    end loop;
    n:=n+1;
  end loop;
  return p_id;
end; $$;

create table public.workout_sessions (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_template_id uuid references public.workout_templates(id) on delete set null,
  name text not null,
  status text not null default 'in_progress' check(status in ('in_progress','completed','abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  check((status='in_progress' and completed_at is null) or (status<>'in_progress' and completed_at is not null))
);
create unique index one_active_workout on public.workout_sessions(user_id) where status='in_progress';
create index sessions_owner_completed on public.workout_sessions(user_id,completed_at desc);
create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  position integer not null,
  rest_timer_seconds integer not null,
  auto_increment_enabled boolean not null,
  rep_range_lower integer not null,
  rep_range_upper integer not null,
  increment_amount numeric not null,
  available_weights numeric[] not null,
  uses_added_weight boolean not null default false,
  equipment_label text not null,
  equipment_key text not null,
  unique(session_id,exercise_id)
);
create table public.sets (
  id uuid primary key,
  session_exercise_id uuid not null references public.session_exercises(id) on delete cascade,
  set_number integer not null check(set_number between 0 and 199),
  set_type text not null check(set_type in ('warmup','standard','failure')),
  target_reps integer,
  target_weight numeric,
  reps integer check(reps between 0 and 1000),
  weight numeric check(weight>=0 and weight<100000),
  completed_at timestamptz,
  next_weight numeric,
  override_scope text check(override_scope in ('once','permanent')),
  unique(session_exercise_id,set_number)
);
create table public.exercise_progression (
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  equipment_key text not null,
  current_weight numeric not null,
  updated_at timestamptz not null default now(),
  primary key(user_id,exercise_id,equipment_key)
);
alter table public.workout_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.sets enable row level security;
alter table public.exercise_progression enable row level security;
revoke all on public.workout_sessions, public.session_exercises, public.sets, public.exercise_progression from anon, authenticated;
grant select on public.workout_sessions, public.session_exercises, public.sets, public.exercise_progression to authenticated;
create policy own_sessions on public.workout_sessions for select to authenticated using(user_id=(select auth.uid()));
create policy own_session_exercises on public.session_exercises for select to authenticated using(exists(select 1 from public.workout_sessions s where s.id=session_id and s.user_id=(select auth.uid())));
create policy own_sets on public.sets for select to authenticated using(exists(select 1 from public.session_exercises e join public.workout_sessions s on s.id=e.session_id where e.id=session_exercise_id and s.user_id=(select auth.uid())));
create policy own_progression on public.exercise_progression for select to authenticated using(user_id=(select auth.uid()));

create function public.start_workout(p_id uuid,p_template_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare t public.workout_templates; e public.workout_template_exercises; sid uuid; active_id uuid; key text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  if exists(select 1 from public.workout_sessions where id=p_id and user_id=auth.uid()) then return p_id; end if;
  select id into active_id from public.workout_sessions where user_id=auth.uid() and status='in_progress';
  if found then return active_id; end if;
  select * into t from public.workout_templates where id=p_template_id and user_id=auth.uid() for update;
  if not found then raise exception 'Workout unavailable'; end if;
  if not exists(select 1 from public.workout_template_sets where workout_template_id=p_template_id) then raise exception 'Add exercises and sets first'; end if;
  if exists(select 1 from public.workout_template_exercises tx where tx.workout_template_id=p_template_id and not exists(select 1 from public.workout_template_sets ts where ts.workout_template_id=p_template_id and ts.exercise_id=tx.exercise_id)) then raise exception 'Each exercise needs a set'; end if;
  insert into public.workout_sessions(id,user_id,workout_template_id,name) values(p_id,auth.uid(),p_template_id,t.name);
  for e in select * from public.workout_template_exercises where workout_template_id=p_template_id order by position loop
    key:=md5(jsonb_build_array(e.equipment_label,e.increment_amount,e.available_weights,e.uses_added_weight)::text);
    insert into public.session_exercises(session_id,exercise_id,position,rest_timer_seconds,auto_increment_enabled,rep_range_lower,rep_range_upper,increment_amount,available_weights,uses_added_weight,equipment_label,equipment_key)
      values(p_id,e.exercise_id,e.position,e.rest_timer_seconds,e.auto_increment_enabled,e.rep_range_lower,e.rep_range_upper,e.increment_amount,e.available_weights,e.uses_added_weight,e.equipment_label,key) returning id into sid;
    insert into public.sets(id,session_exercise_id,set_number,set_type,target_reps,target_weight)
      select gen_random_uuid(),sid,position,set_type,target_reps,target_weight from public.workout_template_sets where workout_template_id=p_template_id and exercise_id=e.exercise_id;
  end loop;
  return p_id;
end; $$;

create function public.log_workout_set(p_id uuid,p_reps integer,p_weight numeric,p_scope text default null)
returns public.sets language plpgsql security definer set search_path = '' as $$
declare s public.sets; e public.session_exercises; owner uuid; session_status text; next numeric; previous numeric; bodyweight boolean;
begin
  select * into s from public.sets where id=p_id;
  select * into e from public.session_exercises where id=s.session_exercise_id;
  select user_id,status into owner,session_status from public.workout_sessions where id=e.session_id for update;
  if owner is distinct from auth.uid() or owner is null then raise exception 'Set unavailable'; end if;
  select * into s from public.sets where id=p_id;
  if s.completed_at is not null then
    if s.reps is distinct from p_reps or s.weight is distinct from p_weight or s.override_scope is distinct from p_scope then raise exception 'Set already saved with different values'; end if;
    return s;
  end if;
  if session_status<>'in_progress' then raise exception 'Workout is not active'; end if;
  select equipment_type='bodyweight' and not e.uses_added_weight into bodyweight from public.exercises where id=e.exercise_id;
  if p_reps is null or (not bodyweight and p_weight is null) then raise exception 'Enter reps and weight'; end if;
  if bodyweight and p_weight is not null then raise exception 'This exercise uses reps only'; end if;
  select current_weight into previous from public.exercise_progression where user_id=owner and exercise_id=e.exercise_id and equipment_key=e.equipment_key;
  next:=p_weight;
  if e.auto_increment_enabled and s.set_type<>'warmup' and not bodyweight then
    if p_scope='once' then next:=previous;
    elsif p_reps>e.rep_range_upper then
      if cardinality(e.available_weights)>0 then select coalesce(min(w),p_weight) into next from unnest(e.available_weights) w where w>p_weight;
      else next:=least(99999.99,p_weight+e.increment_amount); end if;
    elsif p_reps<e.rep_range_lower then
      if cardinality(e.available_weights)>0 then select coalesce(max(w),p_weight) into next from unnest(e.available_weights) w where w<p_weight;
      else next:=greatest(0,p_weight-e.increment_amount); end if;
    end if;
    if cardinality(e.available_weights)>0 and p_scope is distinct from 'once' then
      if not p_weight=any(e.available_weights) then raise exception 'Weight is not in your equipment list'; end if;
    end if;
    if next is not null and p_scope is distinct from 'once' then
      insert into public.exercise_progression(user_id,exercise_id,equipment_key,current_weight) values(owner,e.exercise_id,e.equipment_key,next)
        on conflict(user_id,exercise_id,equipment_key) do update set current_weight=excluded.current_weight,updated_at=now();
    end if;
  end if;
  update public.sets set reps=p_reps,weight=p_weight,completed_at=now(),next_weight=next,override_scope=p_scope where id=p_id returning * into s;
  return s;
end; $$;

create function public.add_workout_set(p_id uuid,p_exercise_id uuid,p_type text) returns public.sets
language plpgsql security definer set search_path = '' as $$
declare owner uuid; status text; result public.sets;
begin
  select s.user_id,s.status into owner,status from public.workout_sessions s join public.session_exercises e on e.session_id=s.id where e.id=p_exercise_id for update of s;
  if owner is distinct from auth.uid() or owner is null or status<>'in_progress' then raise exception 'Workout unavailable'; end if;
  select * into result from public.sets where id=p_id;
  if found then
    if result.session_exercise_id<>p_exercise_id then raise exception 'Set conflict'; end if;
    return result;
  end if;
  insert into public.sets(id,session_exercise_id,set_number,set_type)
    select p_id,p_exercise_id,coalesce(max(set_number),-1)+1,p_type from public.sets where session_exercise_id=p_exercise_id returning * into result;
  return result;
end; $$;

create function public.finish_workout(p_id uuid,p_abandon boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.workout_sessions;
begin
  if p_abandon is null then raise exception 'Completion choice required'; end if;
  select * into s from public.workout_sessions where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'Workout unavailable'; end if;
  if s.status<>'in_progress' then return; end if;
  if not p_abandon and not exists(select 1 from public.sets x join public.session_exercises e on e.id=x.session_exercise_id where e.session_id=p_id and x.completed_at is not null) then raise exception 'Complete at least one set'; end if;
  update public.workout_sessions set status=case when p_abandon then 'abandoned' else 'completed' end,completed_at=now() where id=p_id;
end; $$;

create function public.weekly_attendance(p_start timestamptz,p_end timestamptz,p_timezone text)
returns table(day date) language sql stable security invoker set search_path = '' as $$
  select distinct (completed_at at time zone p_timezone)::date from public.workout_sessions
  where user_id=auth.uid() and status='completed' and completed_at>=p_start and completed_at<p_end;
$$;
create function public.exercise_progress(p_since timestamptz)
returns table(exercise_id uuid,exercise_name text,equipment_key text,equipment_label text,session_id uuid,completed_at timestamptz,value numeric,metric text)
language sql stable security invoker set search_path = '' as $$
  select e.exercise_id,x.name,e.equipment_key,e.equipment_label,s.id,s.completed_at,
    case when x.equipment_type='bodyweight' and not e.uses_added_weight then max(t.reps)::numeric else max(t.weight) end,
    case when x.equipment_type='bodyweight' and not e.uses_added_weight then 'reps' else 'kg' end
  from public.workout_sessions s join public.session_exercises e on e.session_id=s.id join public.exercises x on x.id=e.exercise_id join public.sets t on t.session_exercise_id=e.id
  where s.user_id=auth.uid() and s.status='completed' and s.completed_at>=p_since and t.completed_at is not null
  group by e.exercise_id,x.name,e.equipment_key,e.equipment_label,s.id,s.completed_at,x.equipment_type,e.uses_added_weight order by s.completed_at desc;
$$;

revoke all on function public.save_profile(text,integer,numeric,numeric,uuid), public.save_workout_template(uuid,text,jsonb), public.start_workout(uuid,uuid), public.log_workout_set(uuid,integer,numeric,text), public.add_workout_set(uuid,uuid,text), public.finish_workout(uuid,boolean), public.weekly_attendance(timestamptz,timestamptz,text), public.exercise_progress(timestamptz) from public,anon;
grant execute on function public.save_profile(text,integer,numeric,numeric,uuid), public.save_workout_template(uuid,text,jsonb), public.start_workout(uuid,uuid), public.log_workout_set(uuid,integer,numeric,text), public.add_workout_set(uuid,uuid,text), public.finish_workout(uuid,boolean), public.weekly_attendance(timestamptz,timestamptz,text), public.exercise_progress(timestamptz) to authenticated;
commit;
