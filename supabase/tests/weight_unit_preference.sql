begin;

insert into auth.users (id, email) values
  ('70000000-0000-4000-8000-000000000001', 'liftit-units@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);

do $$
declare result public.profiles;
begin
  if to_regprocedure('public.save_profile(text,integer,numeric,numeric,uuid)') is not null then
    raise exception 'Obsolete five-argument save_profile is still available';
  end if;
  if to_regprocedure('public.save_profile(text,integer,numeric,numeric,uuid,text)') is not null then
    raise exception 'Consent-bypassing six-argument save_profile is still available';
  end if;
  begin
    perform public.save_profile('Alex', 4, null, 80,
      '71000000-0000-4000-8000-000000000001', 'lb', false);
    raise exception 'Profile saved without explicit consent';
  exception when raise_exception then
    if sqlerrm = 'Profile saved without explicit consent' then raise; end if;
  end;
  if exists (select 1 from public.weight_logs) then
    raise exception 'Body weight was stored without explicit consent';
  end if;
  select * into result from public.save_profile('Alex', 4, null, null,
    '71000000-0000-4000-8000-000000000001', 'lb', true);
  if result.preferred_weight_unit <> 'lb'
    or result.fitness_data_consent_at is null
    or result.privacy_notice_version <> '2026-09-14' then
    raise exception 'Unit or explicit consent was not saved';
  end if;
  begin
    perform public.save_profile('Alex', 4, null, null,
      '71000000-0000-4000-8000-000000000002', 'stone', false);
    raise exception 'Invalid unit accepted';
  exception when raise_exception then
    if sqlerrm = 'Invalid unit accepted' then raise; end if;
  end;
end $$;

rollback;
