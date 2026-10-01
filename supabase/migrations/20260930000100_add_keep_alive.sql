begin;

create or replace function public.keep_alive()
returns timestamptz
language sql
security invoker
set search_path = ''
as $$
  select now();
$$;

revoke execute on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated, service_role;

commit;
