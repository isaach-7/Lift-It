-- The keep-alive function is read-only and callable with the publishable key.
begin;

do $$
begin
  assert has_function_privilege('anon', 'public.keep_alive()', 'EXECUTE'),
    'Anonymous execution must be allowed';
  assert not exists (
    select 1 from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'keep_alive'
      and grantee = 'PUBLIC'
  ), 'Public execution must be denied';
end;
$$;

set local role anon;
select public.keep_alive();

rollback;
