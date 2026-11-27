import './env.ts'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { initDatabase } from './db.ts'
import { api } from './routes/api.ts'
import { capture } from './routes/capture.ts'

await initDatabase()

const here = dirname(fileURLToPath(import.meta.url))
export const distDir = resolve(here, '../../frontend/dist')

export const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 'loopback')
app.use(express.json({ limit: '1mb' }))
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'same-origin')
  next()
})

// Public lead capture may be called from any website (protected by API key).
app.use('/api/public', cors(), capture)
// The app API only from the dashboard origin (same origin in production; Vite proxy in development).
app.use('/api', cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN } : { origin: false }), api)

// Serve the built frontend if it exists → one deployable product.
if (existsSync(distDir) && process.env.NODE_ENV !== 'test') {
  app.use(express.static(distDir))
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(resolve(distDir, 'index.html')))
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api]', err)
  res.status(err instanceof SyntaxError ? 400 : 500).json({ error: err instanceof SyntaxError ? 'Invalid JSON.' : 'Something went wrong.' })
})
