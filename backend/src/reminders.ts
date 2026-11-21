/**
 * Follow-up email reminders. Every few minutes, each pending follow-up that is due within the next hour
 * (or already overdue) gets one reminder email to the lead owner. Each follow-up is reminded only once.
 */
import { followUps, leads, users } from './db.ts'
import { appUrl, sendEmail } from './mailer.ts'

const INTERVAL_MS = Number(process.env.REMINDER_INTERVAL_MS) || 5 * 60_000
const LOOKAHEAD_MS = 60 * 60_000

export async function sendDueReminders() {
  const horizon = Date.now() + LOOKAHEAD_MS
  let sent = 0
  for (const f of followUps.all()) {
    if (f.status !== 'pending' || f.reminderSentAt || new Date(f.dueAt).getTime() > horizon) continue
    const lead = leads.byId(f.leadId)
    if (!lead || ['won', 'lost'].includes(lead.status)) continue
    const owner = users.byId(lead.assignedTo ?? f.createdBy) ?? users.byId(f.createdBy)
    if (!owner?.active) continue
    const due = new Date(f.dueAt)
    const overdue = due.getTime() < Date.now()
    await sendEmail(
      owner.email,
      `${overdue ? 'Overdue' : 'Reminder'}: ${f.type} with ${lead.companyName}`,
      `Hi ${owner.name.split(' ')[0]},\n\n${overdue ? 'This follow-up is overdue' : 'You have a follow-up coming up'}:\n\n` +
        `  ${f.type.toUpperCase()} · ${lead.companyName} (${lead.contactName})\n  Due: ${due.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}\n` +
        `${f.note ? `  Note: ${f.note}\n` : ''}\n  Lead priority: ${lead.intelligence.priority} (score ${lead.intelligence.score}/100)\n  Next action: ${lead.intelligence.nextAction}\n\n` +
        `Open the lead: ${appUrl()}/leads/${lead.id}\n\n— LeadIntel`,
    )
    followUps.save({ ...f, reminderSentAt: new Date().toISOString() })
    sent++
  }
  if (sent) console.log(`[reminders] sent ${sent} reminder email(s)`)
  return sent
}

export function startReminderJob() {
  const run = () => sendDueReminders().catch((e) => console.error('[reminders]', e))
  setTimeout(run, 10_000)
  return setInterval(run, INTERVAL_MS)
}
