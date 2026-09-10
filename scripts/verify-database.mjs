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
  const migrations = (await readdir('supabase/migrations'))
    .filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/.test(name))
    .sort()
  for (const name of migrations) {
    await db.exec(await readFile(`supabase/migrations/${name}`, 'utf8'))
  }
  const tests = (await readdir('supabase/tests'))
    .filter((name) => /^[a-z0-9_]+\.sql$/.test(name))
    .sort()
  for (const name of tests) {
    await db.exec(await readFile(`supabase/tests/${name}`, 'utf8'))
    console.log(`PASS ${name}`)
  }
} catch (error) {
  console.error(error.message, error.where ?? '')
  process.exitCode = 1
} finally {
  await db.close()
}
