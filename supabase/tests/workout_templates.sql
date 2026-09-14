-- Disposable test accounts and templates are rolled back together.
begin;
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000011', 'templates-a@example.invalid'),
  ('00000000-0000-4000-8000-000000000012', 'templates-b@example.invalid');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000011';
select public.save_profile('Template tester A', 3, null, null, null, 'kg', true);
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000012';
select public.save_profile('Template tester B', 3, null, null, null, 'kg', true);
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000011';
insert into public.workout_templates (id, user_id, name) values
  ('00000000-0000-4000-8000-000000000021', auth.uid(), 'Push day');
insert into public.workout_templates (id, user_id, name) values
  ('00000000-0000-4000-8000-000000000021', auth.uid(), 'Push day')
  on conflict (id) do update set id = excluded.id, user_id = excluded.user_id, name = excluded.name;
update public.workout_templates set name = 'Upper body'
  where id = '00000000-0000-4000-8000-000000000021';
do $$ begin
  assert (select count(*) from public.workout_templates) = 1, 'Retry must not duplicate';
  assert (select name from public.workout_templates) = 'Upper body', 'Rename must persist';
  begin
    update public.workout_templates set user_id = '00000000-0000-4000-8000-000000000012';
    raise exception 'Ownership transfer was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.workout_templates set name = '   ';
    raise exception 'Blank name was allowed';
  exception when check_violation then null;
  end;
  begin
    update public.workout_templates set name = repeat('a',121);
    raise exception 'Oversized name was allowed';
  exception when check_violation then null;
  end;
end $$;

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000012';
do $$ begin
  assert (select count(*) from public.workout_templates) = 0, 'User B can see User A data';
  update public.workout_templates set name = 'Unauthorized rename'
    where id = '00000000-0000-4000-8000-000000000021';
  assert not found, 'Cross-user update was allowed';
  begin
    insert into public.workout_templates (id,user_id,name) values
      ('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000011','Unauthorized');
    raise exception 'Cross-user insert was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.workout_templates (id,user_id,name) values
      ('00000000-0000-4000-8000-000000000021',auth.uid(),'Unauthorized retry')
      on conflict (id) do update set id=excluded.id,user_id=excluded.user_id,name=excluded.name;
    raise exception 'Cross-user upsert was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into public.workout_templates (id,user_id,name) values
  ('00000000-0000-4000-8000-000000000022',auth.uid(),'Lower body');
do $$ begin
  assert (select count(*) from public.workout_templates) = 1, 'User B must see own workout';
  assert not has_table_privilege('anon','public.workout_templates','SELECT'), 'Anonymous read allowed';
  assert not has_table_privilege('authenticated','public.workout_templates','DELETE'), 'Client delete allowed';
end $$;
reset role;
rollback;
