/** Loads backend/.env (if present) before any other module reads process.env. Real environment variables win. */
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const file = resolve(dirname(fileURLToPath(import.meta.url)), '../.env')
if (process.env.NODE_ENV !== 'test' && existsSync(file)) {
  process.loadEnvFile(file)
}
