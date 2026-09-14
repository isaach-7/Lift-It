begin;

revoke all on function public.save_profile(text, integer, numeric, numeric, uuid)
  from public, anon, authenticated;
drop function if exists public.save_profile(text, integer, numeric, numeric, uuid);

commit;
