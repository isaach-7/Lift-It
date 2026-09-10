-- Run as postgres in the Supabase SQL editor after the migration.
-- Everything, including synthetic accounts, is rolled back.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'liftit-rls-a@example.invalid'),
  ('00000000-0000-4000-8000-000000000002', 'liftit-rls-b@example.invalid');

do $$
begin
  assert (select count(*) from public.profiles where id in (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002'
  )) = 2, 'The account trigger must create both profiles';
  assert not has_table_privilege('anon', 'public.profiles', 'SELECT'),
    'Anonymous access must be denied';
  assert not has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
    'Client inserts must be denied';
  assert not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
    'Client updates must be denied';
  assert not has_table_privilege('authenticated', 'public.profiles', 'DELETE'),
    'Client deletes must be denied';
end;
$$;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';

do $$
begin
  assert (select count(*) from public.profiles) = 1,
    'User A must see exactly one profile';
  assert (select id from public.profiles) = '00000000-0000-4000-8000-000000000001'::uuid,
    'User A must see only their own profile';
end;
$$;

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';

do $$
begin
  assert (select count(*) from public.profiles) = 1,
    'User B must see exactly one profile';
  assert (select id from public.profiles) = '00000000-0000-4000-8000-000000000002'::uuid,
    'User B must see only their own profile';
end;
$$;

reset role;
delete from auth.users where id = '00000000-0000-4000-8000-000000000001';
do $$
begin
  assert not exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000001'),
    'Deleting an account must remove its profile';
end;
$$;

rollback;
