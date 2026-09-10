begin;

alter table public.profiles
  add column preferred_weight_unit text not null default 'kg'
  check (preferred_weight_unit in ('kg', 'lb'));

create function public.save_profile(
  p_name text,
  p_goal integer,
  p_height numeric,
  p_weight numeric,
  p_weight_id uuid,
  p_unit text
)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_name is null or p_goal is null then raise exception 'Name and goal required'; end if;
  if p_unit not in ('kg', 'lb') then raise exception 'Invalid weight unit'; end if;
  update public.profiles set preferred_name = btrim(p_name), weekly_goal = p_goal,
    height_cm = p_height, preferred_weight_unit = p_unit,
    onboarding_completed_at = coalesce(onboarding_completed_at, now())
    where id = auth.uid() returning * into result;
  if not found then raise exception 'Profile unavailable'; end if;
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
end; $$;

revoke all on function public.save_profile(text,integer,numeric,numeric,uuid,text)
  from public, anon;
grant execute on function public.save_profile(text,integer,numeric,numeric,uuid,text)
  to authenticated;

commit;
