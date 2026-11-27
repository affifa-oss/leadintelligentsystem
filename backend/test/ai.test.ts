/** AI provider tests: Gemini request/response handling with a mocked network, and the template fallback. */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { aiStatus, draftFollowUp, resetAiCooldown, summarizeInquiry } from '../src/ai.ts'
import { buildSeedData } from './fixtures/demoData.ts'

const lead = buildSeedData().leads[0]
const realFetch = globalThis.fetch
const savedEnv = { ...process.env }

type Captured = { url: string; headers: Record<string, string>; body: any }

/** Replaces fetch with a fake Gemini endpoint that returns `reply` (as JSON text) with the given HTTP status. */
function fakeGemini(reply: unknown, status = 200, extra: Record<string, unknown> = {}) {
  const calls: Captured[] = []
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) })
    const body =
      status === 200
        ? { candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] }, finishReason: 'STOP' }], ...extra }
        : { error: { message: 'API key not valid' } }
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  return calls
}

describe('AI with Google Gemini', () => {
  beforeEach(() => {
    resetAiCooldown()
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_AUTH_TOKEN
    delete process.env.AI_PROVIDER
    delete process.env.AI_ENABLED
    delete process.env.GEMINI_MODEL
    process.env.GEMINI_API_KEY = 'test-gemini-key'
  })
  afterEach(() => {
    globalThis.fetch = realFetch
    process.env = { ...savedEnv }
  })

  it('reports Gemini as the configured provider', () => {
    const s = aiStatus()
    assert.equal(s.configured, true)
    assert.equal(s.provider, 'gemini')
    assert.equal(s.model, 'gemini-3.5-flash-lite')
  })

  it('writes the summary with Gemini and sends a valid request', async () => {
    const calls = fakeGemini({ summary: 'Wants a new online store soon.', keyNeeds: ['Online store'], concerns: [], questionsToAsk: ['What is the launch date?'] })
    const ai = await summarizeInquiry(lead)
    assert.equal(ai.source, 'gemini')
    assert.equal(ai.summary, 'Wants a new online store soon.')

    const [call] = calls
    assert.match(call.url, /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3.5-flash-lite:generateContent$/)
    assert.equal(call.headers['x-goog-api-key'], 'test-gemini-key')
    assert.ok(!call.url.includes('test-gemini-key'), 'key must not be in the URL')
    const cfg = call.body.generationConfig
    assert.equal(cfg.responseMimeType, 'application/json')
    assert.equal(cfg.responseSchema.type, 'OBJECT')
    assert.equal(cfg.responseSchema.properties.keyNeeds.items.type, 'STRING')
    assert.equal('additionalProperties' in cfg.responseSchema, false)
    assert.ok(call.body.contents[0].parts[0].text.includes('<client_inquiry>'))
  })

  it('writes a follow-up draft with Gemini', async () => {
    fakeGemini({ subject: 'Next steps', body: 'Hi, shall we talk this week?' })
    const d = await draftFollowUp(lead, 'email', 'Sara', '')
    assert.equal(d.source, 'gemini')
    assert.equal(d.subject, 'Next steps')
  })

  it('uses GEMINI_MODEL when set', async () => {
    process.env.GEMINI_MODEL = 'gemini-2.5-flash'
    const calls = fakeGemini({ subject: '', body: 'Hi!' })
    await draftFollowUp(lead, 'whatsapp', 'Sara', '')
    assert.match(calls[0].url, /models\/gemini-2\.5-flash:generateContent$/)
  })

  it('falls back to the template when the key is wrong, then pauses AI calls', async () => {
    const calls = fakeGemini(null, 400)
    assert.equal((await summarizeInquiry(lead)).source, 'template')
    assert.equal((await summarizeInquiry(lead)).source, 'template')
    assert.equal(calls.length, 1, 'second request should not call Gemini again during the cool-down')
    assert.equal(aiStatus().coolingDown, true)
  })

  it('tries the backup model when the first one is busy, and ignores thought parts', async () => {
    const calls: string[] = []
    globalThis.fetch = (async (url: string | URL) => {
      calls.push(String(url))
      if (calls.length === 1) return new Response(JSON.stringify({ error: { message: 'high demand' } }), { status: 503 })
      const parts = [{ text: 'thinking...', thought: true }, { text: JSON.stringify({ subject: 'Hi', body: 'Hello from backup' }) }]
      return new Response(JSON.stringify({ candidates: [{ content: { parts }, finishReason: 'STOP' }] }), { status: 200 })
    }) as typeof fetch
    const d = await draftFollowUp(lead, 'email', 'Sara', '')
    assert.equal(d.source, 'gemini')
    assert.equal(d.body, 'Hello from backup')
    assert.match(calls[0], /gemini-3\.5-flash-lite:/)
    assert.match(calls[1], /gemini-flash-lite-latest:/)
    assert.equal(aiStatus().coolingDown, false)
  })

  it('falls back to the template when Gemini blocks the prompt', async () => {
    fakeGemini({}, 200, { promptFeedback: { blockReason: 'SAFETY' } })
    assert.equal((await summarizeInquiry(lead)).source, 'template')
  })

  it('uses templates when no AI key is set', async () => {
    delete process.env.GEMINI_API_KEY
    const calls = fakeGemini({})
    assert.equal(aiStatus().configured, false)
    assert.equal((await summarizeInquiry(lead)).source, 'template')
    assert.equal(calls.length, 0)
  })
})
