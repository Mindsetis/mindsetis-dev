#!/usr/bin/env node
/**
 * Guarded Supabase migration push.
 *
 * Guarantees migrations are applied ONLY to the intended project:
 *   1. Reads the expected project ref from env / .env.local (SUPABASE_PROJECT_REF).
 *   2. If the CLI is already linked to a DIFFERENT ref, it ABORTS (no accidental
 *      push to the wrong project).
 *   3. (Re)links to the expected ref, then runs `supabase db push --linked`.
 *
 * `db push` only applies *pending* forward migrations — it never resets or drops.
 *
 * Usage:  npm run db:push
 * Env:    SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD, SUPABASE_ACCESS_TOKEN
 *         (read from process.env first, then .env.local)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Minimal .env parser (KEY="value" / KEY=value), no interpolation. */
function loadEnvLocal() {
  const file = join(ROOT, '.env.local');
  if (!existsSync(file)) return {};
  const out = {};
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = loadEnvLocal();
const get = (k) => process.env[k] ?? fileEnv[k] ?? '';

const REF = get('SUPABASE_PROJECT_REF');
const DB_PASSWORD = get('SUPABASE_DB_PASSWORD');
const ACCESS_TOKEN = get('SUPABASE_ACCESS_TOKEN');

function die(msg) {
  console.error(`\n✖ db:push aborted — ${msg}\n`);
  process.exit(1);
}

if (!REF) die('SUPABASE_PROJECT_REF is not set (env or .env.local).');
if (!/^[a-z0-9]{20}$/.test(REF)) die(`SUPABASE_PROJECT_REF "${REF}" is not a valid ref.`);

// Guard: refuse if the CLI is currently linked to a different project.
const linkedRefFile = join(ROOT, 'supabase', '.temp', 'project-ref');
if (existsSync(linkedRefFile)) {
  const linked = readFileSync(linkedRefFile, 'utf8').trim();
  if (linked && linked !== REF) {
    die(
      `CLI is linked to a DIFFERENT project ("${linked}"), but the target is "${REF}". ` +
        `Refusing to push. Run \`npx supabase link --project-ref ${REF}\` deliberately if this is intended.`,
    );
  }
}

const childEnv = { ...process.env };
if (ACCESS_TOKEN) childEnv.SUPABASE_ACCESS_TOKEN = ACCESS_TOKEN;

function run(args, label) {
  console.log(`\n→ ${label}`);
  // On Windows, `npx` resolves to `npx.cmd`. Node's spawnSync cannot exec a
  // .cmd file directly without a shell (fails with ENOENT/EINVAL on current
  // Node releases), so `shell: true` is required on win32. This only ever
  // shells out to a fixed argv (`npx --yes supabase <subcommand>`) plus a
  // regex-validated project ref and a password sourced from local
  // `.env.local` — never untrusted/remote input — so the shell-escaping
  // caveat behind Node's DEP0190 advisory does not apply here.
  const res = spawnSync('npx', ['--yes', 'supabase', ...args], {
    cwd: ROOT,
    env: childEnv,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (res.status !== 0) die(`\`supabase ${args[0]}\` exited with code ${res.status ?? 'null'}.`);
}

const pwArgs = DB_PASSWORD ? ['-p', DB_PASSWORD] : [];

console.log(`\n🎯 Target Supabase project: ${REF}`);
run(['link', '--project-ref', REF, ...pwArgs], `Linking to ${REF}`);
run(['db', 'push', '--linked', ...pwArgs], `Pushing pending migrations to ${REF} (linked only)`);

console.log(`\n✔ Migrations pushed to project ${REF} — no other project was touched.\n`);
