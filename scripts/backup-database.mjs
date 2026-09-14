import { execFileSync } from 'node:child_process'
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const magic = Buffer.from('LIFTIT1')
const tableNames = [
  'profiles',
  'weight_logs',
  'workout_templates',
  'workout_template_exercises',
  'workout_template_sets',
  'workout_sessions',
  'session_exercises',
  'sets',
  'exercise_progression',
]

const [command, ...args] = process.argv.slice(2)
const passphrase = process.env.LIFTIT_BACKUP_PASSPHRASE

if (!passphrase || passphrase.length < 20) {
  fail('Set LIFTIT_BACKUP_PASSPHRASE to at least 20 characters.')
}

if (command === 'export') exportDatabase()
else if (command === 'verify') verifyBackup()
else fail('Use export --project-ref REF --out FILE or verify --file FILE.')

function exportDatabase() {
  const projectRef = option('--project-ref')
  const outputPath = resolve(option('--out'))
  if (!/^[a-z]{20}$/.test(projectRef)) fail('Invalid Supabase project ref.')
  if (existsSync(outputPath)) fail(`Refusing to overwrite ${outputPath}.`)

  const publicTables = tableNames
    .map(
      (name) =>
        `'${name}', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.${name} t)`,
    )
    .join(', ')
  const sql = `select jsonb_build_object(
    'auth_users', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'email', email,
        'email_confirmed_at', email_confirmed_at,
        'created_at', created_at,
        'updated_at', updated_at,
        'raw_app_meta_data', raw_app_meta_data,
        'raw_user_meta_data', raw_user_meta_data
      ) order by id), '[]'::jsonb) from auth.users
    ),
    ${publicTables}
  ) as backup`
  const output = execFileSync(
    'npx',
    ['supabase', 'db', 'query', '--linked', '--project-ref', projectRef, sql],
    { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 },
  )
  const response = JSON.parse(output)
  const payload = Buffer.from(
    JSON.stringify({
      format: 1,
      project_ref: projectRef,
      exported_at: new Date().toISOString(),
      data: response.rows?.[0]?.backup,
    }),
  )
  if (!response.rows?.[0]?.backup) fail('Supabase returned no backup data.')

  const encrypted = encrypt(payload, passphrase)
  const temporaryPath = `${outputPath}.partial`
  writeFileSync(temporaryPath, encrypted, { mode: 0o600, flag: 'wx' })
  renameSync(temporaryPath, outputPath)
  payload.fill(0)
  process.stdout.write(`Encrypted backup written to ${outputPath}\n`)
}

function verifyBackup() {
  const filePath = resolve(option('--file'))
  const plaintext = decrypt(readFileSync(filePath), passphrase)
  const parsed = JSON.parse(plaintext.toString('utf8'))
  if (parsed.format !== 1 || !parsed.data) fail('Unsupported backup format.')
  const counts = Object.fromEntries(
    ['auth_users', ...tableNames].map((name) => [
      name,
      Array.isArray(parsed.data[name]) ? parsed.data[name].length : -1,
    ]),
  )
  if (Object.values(counts).some((count) => count < 0)) {
    fail('Backup is missing an expected table.')
  }
  plaintext.fill(0)
  process.stdout.write(
    `Verified encrypted LiftIt backup from ${parsed.exported_at}: ${JSON.stringify(counts)}\n`,
  )
}

function encrypt(plaintext, secret) {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = scryptSync(secret, salt, 32)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const result = Buffer.concat([
    magic,
    salt,
    iv,
    cipher.getAuthTag(),
    ciphertext,
  ])
  key.fill(0)
  return result
}

function decrypt(encrypted, secret) {
  if (!encrypted.subarray(0, magic.length).equals(magic)) {
    fail('Not a LiftIt encrypted backup.')
  }
  let offset = magic.length
  const salt = encrypted.subarray(offset, (offset += 16))
  const iv = encrypted.subarray(offset, (offset += 12))
  const tag = encrypted.subarray(offset, (offset += 16))
  const key = scryptSync(secret, salt, 32)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([
    decipher.update(encrypted.subarray(offset)),
    decipher.final(),
  ])
  key.fill(0)
  return plaintext
}

function option(name) {
  const index = args.indexOf(name)
  if (index < 0 || !args[index + 1]) fail(`Missing ${name}.`)
  return args[index + 1]
}

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}
