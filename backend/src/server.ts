import './env.ts'
import { existsSync } from 'node:fs'
import { app, distDir } from './app.ts'
import { startReminderJob } from './reminders.ts'

const PORT = Number(process.env.PORT) || 4000

startReminderJob()

app.listen(PORT, () => {
  console.log(`LeadIntel API running on http://localhost:${PORT}`)
  if (existsSync(distDir)) console.log(`App (built frontend) served at http://localhost:${PORT}`)
})
