// Copies the main repo's .env into a fresh worktree; falls back to .env.example.
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const common = execSync('git rev-parse --git-common-dir', { encoding: 'utf8' }).trim()
const main = resolve(process.cwd(), common, '..')
const source = [join(main, '.env'), join(process.cwd(), '.env.example')].find((p) => existsSync(p))

// No .env anywhere: leave it absent, supabase is null by design and the build still works.
if (!source) process.exit(0)

if (resolve(source) !== resolve('.env')) {
  copyFileSync(source, '.env')
  console.log(`.env <- ${source}`)
}
