begin;

insert into auth.users (id, email) values
  ('70000000-0000-4000-8000-000000000001', 'liftit-units@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);

do $$
declare result public.profiles;
begin
  select * into result from public.save_profile('Alex', 4, null, null,
    '71000000-0000-4000-8000-000000000001', 'lb');
  if result.preferred_weight_unit <> 'lb' then
    raise exception 'Weight unit was not saved';
  end if;
  begin
    perform public.save_profile('Alex', 4, null, null,
      '71000000-0000-4000-8000-000000000002', 'stone');
    raise exception 'Invalid unit accepted';
  exception when raise_exception then
    if sqlerrm = 'Invalid unit accepted' then raise; end if;
  end;
end $$;

rollback;
