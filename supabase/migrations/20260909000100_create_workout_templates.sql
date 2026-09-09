begin;

create table public.workout_templates (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (
    char_length(name) between 1 and 120
    and name = btrim(name)
    and name ~ '[^[:space:]]'
  ),
  created_at timestamptz not null default now()
);

create index workout_templates_owner_created_idx
  on public.workout_templates (user_id, created_at desc, id);

alter table public.workout_templates enable row level security;
revoke all on public.workout_templates from anon, authenticated;
grant select, insert on public.workout_templates to authenticated;
grant update (name, user_id, id) on public.workout_templates to authenticated;

create policy "Users can read their own workout templates"
  on public.workout_templates for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own workout templates"
  on public.workout_templates for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own workout templates"
  on public.workout_templates for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
