import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'

// Real Postgres semantics with a minimal auth schema, not a hosted Auth emulator.
const db = new PGlite()
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email text, created_at timestamptz not null default now());
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to authenticated,anon;
    grant execute on function auth.uid() to authenticated,anon;
    alter default privileges in schema public grant all on tables to anon,authenticated;
  `)
  for (const name of (await readdir('supabase/migrations')).sort()) {
    await db.exec(await readFile(`supabase/migrations/${name}`, 'utf8'))
  }
  for (const name of (await readdir('supabase/tests')).sort()) {
    await db.exec(await readFile(`supabase/tests/${name}`, 'utf8'))
    console.log(`PASS ${name}`)
  }
} catch (error) {
  console.error(error.message, error.where ?? '')
  process.exitCode = 1
} finally {
  await db.close()
}
