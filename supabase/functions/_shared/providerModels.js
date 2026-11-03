/**
 * Model-list normalisation for the two allowlisted providers (phase 13a, D10).
 *
 * Plain JS with no Deno imports so the same rules can be exercised from Node.
 * The page never fetches a provider: ai-config resolves `preset`/`baseUrl` to
 * one of the two constants below, so an arbitrary URL is never requested.
 */

export const MODELS_UNAVAILABLE_NOTE = 'Model list unavailable for this provider — type the ID.'

const ENDPOINTS = {
  commandcode: 'https://api.commandcode.ai/provider/v1/models',
  opencode: 'https://opencode.ai/inference/v1/models',
}

/** 'commandcode' | 'opencode' | null — baseUrl is matched, never fetched. */
export function providerFor({ preset, baseUrl } = {}) {
  if (preset === 'commandcode' || /^https:\/\/api\.commandcode\.ai\//i.test(baseUrl ?? '')) return 'commandcode'
  if (preset === 'opencode' || /^https:\/\/opencode\.ai\//i.test(baseUrl ?? '')) return 'opencode'
  return null
}

export const modelsUrl = (provider) => ENDPOINTS[provider] ?? null

const text = (value) => (typeof value === 'string' ? value : '')

const canChat = (row, provider) => (
  provider === 'commandcode'
    ? Array.isArray(row.supported_endpoints) && row.supported_endpoints.includes('/chat/completions')
    : Boolean(row.api && typeof row.api === 'object' && row.api['chat-completions'])
)

const isFree = (row, provider) => {
  const id = text(row.id).toLowerCase()
  if (provider === 'commandcode') return id.includes(':free') || id.includes('-free')
  // OpenCode: only paid models work from external clients, so a free id (and a
  // zero price) both mean "console only".
  const input = Number(row?.cost?.text?.input?.price)
  const output = Number(row?.cost?.text?.output?.price)
  return id.endsWith('-free')
    || (Number.isFinite(input) && Number.isFinite(output) && input === 0 && output === 0)
}

const isVision = (row, provider) => (
  provider === 'commandcode'
    ? /(vision|omni|gemini|vl)/i.test(`${text(row.id)} ${text(row.name)}`)
    : Array.isArray(row?.modalities?.input)
      && row.modalities.input.some((kind) => typeof kind === 'string' && /^image/i.test(kind))
)

/** `{ id, name, free, vision }[]`, chat-completions models only, paid first. */
export function normalizeModels(rows, provider) {
  const seen = new Set()
  const models = []
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== 'object') continue
    const id = text(row.id)
    if (!id || seen.has(id) || !canChat(row, provider)) continue
    seen.add(id)
    models.push({ id, name: text(row.name) || id, free: isFree(row, provider), vision: isVision(row, provider) })
  }
  return models.sort((a, b) => Number(a.free) - Number(b.free) || a.name.localeCompare(b.name))
}
