/**
 * Shared AI gateway for the 13a+ edges (plan §3, §6).
 *
 * Everything provider-facing lives here: the OpenAI-compatible call, the
 * monthly cap, usage capture, and the per-request alias map (D2). The key is
 * read from `ai_config.api_key` (or the AI_* env escape hatch) and is never
 * returned by any helper meant for a response body.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.0'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.104.0'
import { createAliasMap, estimateTokens } from './aliases.js'

// Edges that enforce the cap read the estimator through this module too.
export { estimateTokens }

export type AppRole = 'superadmin' | 'admin' | 'teacher' | 'therapist' | 'parent'

export type AiFailure = { status: number; code: string; message: string }

/** Throw-style failure: edges catch it and render `{ error: { code, message } }`. */
export const fail = (status: number, code: string, message: string): never => {
  throw { status, code, message } satisfies AiFailure
}

export function asFailure(error: unknown): AiFailure {
  if (error && typeof error === 'object' && 'status' in error && 'code' in error) {
    const value = error as Partial<AiFailure>
    return {
      status: typeof value.status === 'number' ? value.status : 500,
      code: typeof value.code === 'string' ? value.code : 'INTERNAL',
      message: typeof value.message === 'string' ? value.message : 'Internal error',
    }
  }
  return { status: 500, code: 'INTERNAL', message: 'Internal error' }
}

// ─── CORS / JSON ─────────────────────────────────────────────────────────────
// Defence in depth only: curl ignores CORS, so every path still verifies the
// caller. Unknown origins get no Allow-Origin header (fail closed).

export function corsHeaders(req: Request): Record<string, string> {
  const allowed = (Deno.env.get('APP_ORIGIN') ?? '').split(',').map((o) => o.trim()).filter(Boolean)
  const origin = req.headers.get('Origin') ?? ''
  const ok = allowed.includes(origin)
    || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
    || /^https:\/\/[a-z0-9-]+\.(netlify|vercel)\.app$/.test(origin)

  return {
    ...(ok ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export const json = (body: unknown, status: number, req: Request): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })

export const jsonError = (code: string, message: string, status: number, req: Request): Response =>
  json({ error: { code, message } }, status, req)

// ─── Caller identity ─────────────────────────────────────────────────────────

/**
 * Verifies the JWT with the anon client, then reads the role with the service
 * role (user_roles wins, profiles.app_role fallback — same precedence as the
 * client RouteGuards). Inactive profiles are rejected.
 */
export async function verifyCaller(
  req: Request,
  service: SupabaseClient,
  allowedRoles: AppRole[],
): Promise<{ user: { id: string }; role: AppRole }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) fail(401, 'UNAUTHORIZED', 'Missing authorization header')

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) fail(401, 'UNAUTHORIZED', 'Invalid or expired token')

  const { data: roleRow } = await service
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: profile } = await service
    .from('profiles')
    .select('is_active, app_role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.is_active === false) fail(403, 'FORBIDDEN', 'Account is inactive')

  const role = (roleRow?.role ?? profile?.app_role) as AppRole | undefined
  if (!role || !allowedRoles.includes(role)) fail(403, 'FORBIDDEN', 'Insufficient permissions')

  return { user: { id: user.id }, role }
}

// ─── Provider config ─────────────────────────────────────────────────────────

export type AiConfig = {
  enabled: boolean
  assistantOn: boolean
  plannerOn: boolean
  repairOn: boolean
  extractOn: boolean
  reportsOn: boolean
  baseUrl: string | null
  model: string | null
  visionModel: string | null
  /** Internal only. Never project this into a response body. */
  apiKey: string | null
  hasKey: boolean
  monthlyTokenCap: number
  timeoutSeconds: number
  maxOutputTokens: number | null
  lastTestOk: boolean | null
  lastTestAt: string | null
  updatedAt: string | null
  updatedBy: string | null
  envOverride: boolean
}

/**
 * Reads row id = 1 and applies the documented AI_* env escape hatch. The
 * returned `apiKey` exists so callProvider can authenticate; `ai-config:get`
 * builds its projection from the other fields and `hasKey`.
 */
export async function loadAiConfig(service: SupabaseClient): Promise<AiConfig> {
  const { data, error } = await service.from('ai_config').select('*').eq('id', 1).maybeSingle()
  if (error) fail(500, 'INTERNAL', 'Could not read the AI configuration')
  const row = (data ?? {}) as Record<string, unknown>

  const env = (name: string) => (Deno.env.get(name) ?? '').trim()
  const envBaseUrl = env('AI_BASE_URL')
  const envModel = env('AI_MODEL')
  const envVisionModel = env('AI_VISION_MODEL')
  const envApiKey = env('AI_API_KEY')

  const apiKey = envApiKey || (typeof row.api_key === 'string' ? row.api_key : null)
  const str = (value: unknown) => (typeof value === 'string' && value ? value : null)
  const num = (value: unknown, fallback: number) => (typeof value === 'number' ? value : fallback)

  return {
    enabled: row.enabled === true,
    assistantOn: row.assistant_on !== false,
    plannerOn: row.planner_on === true,
    repairOn: row.repair_on === true,
    extractOn: row.extract_on === true,
    reportsOn: row.reports_on === true,
    baseUrl: envBaseUrl || str(row.base_url),
    model: envModel || str(row.model),
    visionModel: envVisionModel || str(row.vision_model),
    apiKey: apiKey || null,
    hasKey: Boolean(apiKey),
    monthlyTokenCap: num(row.monthly_token_cap, 1_000_000),
    timeoutSeconds: num(row.timeout_seconds, 60),
    maxOutputTokens: typeof row.max_output_tokens === 'number' ? row.max_output_tokens : null,
    lastTestOk: typeof row.last_test_ok === 'boolean' ? row.last_test_ok : null,
    lastTestAt: str(row.last_test_at),
    updatedAt: str(row.updated_at),
    updatedBy: str(row.updated_by),
    envOverride: Boolean(envBaseUrl || envModel || envVisionModel || envApiKey),
  }
}

/** Tokens spent this UTC month, summed across the usage ledger (paged). */
export async function monthUsage(service: SupabaseClient): Promise<number> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  let total = 0

  for (let from = 0; ; from += 1000) {
    const { data, error } = await service
      .from('ai_usage_events')
      .select('tokens_in, tokens_out')
      .gte('created_at', monthStart)
      .order('id', { ascending: true })
      .range(from, from + 999)
    if (error) fail(500, 'INTERNAL', 'Could not read AI usage')

    const rows = (data ?? []) as Array<{ tokens_in: number | null; tokens_out: number | null }>
    for (const row of rows) total += (row.tokens_in ?? 0) + (row.tokens_out ?? 0)
    if (rows.length < 1000) break
  }

  return total
}

export function assertCap(config: AiConfig, used: number, estimated: number): void {
  if (config.monthlyTokenCap > 0 && used + estimated > config.monthlyTokenCap) {
    fail(429, 'CAP_EXCEEDED', `Monthly token cap reached (${used + estimated}/${config.monthlyTokenCap}).`)
  }
}

// ─── Provider call ───────────────────────────────────────────────────────────

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type ProviderUsage = { prompt_tokens: number; completion_tokens: number; total_tokens: number }
export type ProviderResult = { text: string; usage: ProviderUsage; latencyMs: number; model: string }
export type ProviderOptions = {
  messages: ChatMessage[]
  maxTokens?: number | null
  temperature?: number
  timeoutMs?: number
}

/**
 * One OpenAI-compatible chat-completions call. The key travels only in the
 * Authorization header of this request; no log line in this module includes it.
 */
export async function callProvider(config: AiConfig, options: ProviderOptions): Promise<ProviderResult> {
  const baseUrl = (config.baseUrl ?? '').replace(/\/+$/, '')
  if (!baseUrl || !config.model || !config.apiKey) {
    fail(409, 'CONFIG_MISSING', 'Save a base URL, model and API key first')
  }

  const maxTokens = options.maxTokens ?? config.maxOutputTokens ?? null
  const timeoutMs = options.timeoutMs ?? (config.timeoutSeconds > 0 ? config.timeoutSeconds : 60) * 1000

  const payload: Record<string, unknown> = {
    model: config.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
  }
  if (typeof maxTokens === 'number' && maxTokens > 0) payload.max_tokens = Math.floor(maxTokens)

  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  // fetch resolves on headers; keep the timer running through the body read so a
  // stalled stream still hits PROVIDER_UNREACHABLE.
  const { response, raw } = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
    .then(async (response) => ({ response, raw: await response.text() }))
    .catch(() => fail(
      504,
      'PROVIDER_UNREACHABLE',
      controller.signal.aborted
        ? `Provider timed out after ${Math.round(timeoutMs / 1000)}s`
        : 'Provider unreachable',
    ))
    .finally(() => clearTimeout(timer))

  const latencyMs = Date.now() - started
  let data: Record<string, any> | null = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    const message = String(data?.error?.message ?? data?.message ?? raw ?? `HTTP ${response.status}`).slice(0, 300)
    fail(502, 'PROVIDER_ERROR', message || `HTTP ${response.status}`)
  }
  if (!data) fail(502, 'PROVIDER_ERROR', 'Provider returned a non-JSON response')

  // Content is a string in the plain protocol, an array of parts for vision.
  const content = data?.choices?.[0]?.message?.content
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map((part: any) => typeof part === 'string' ? part : (typeof part?.text === 'string' ? part.text : '')).join('')
      : ''

  // Provider omitted usage: approximate from the text so the cap still moves
  // (callProvider is the only place that has both the prompt and the reply).
  const promptTokens = Number(data?.usage?.prompt_tokens)
  const completionTokens = Number(data?.usage?.completion_tokens)
  const usage: ProviderUsage = {
    prompt_tokens: Number.isFinite(promptTokens)
      ? promptTokens
      : estimateTokens(options.messages.map((message) => message.content).join('\n')),
    completion_tokens: Number.isFinite(completionTokens) ? completionTokens : estimateTokens(text),
    total_tokens: 0,
  }
  const totalTokens = Number(data?.usage?.total_tokens)
  usage.total_tokens = Number.isFinite(totalTokens) ? totalTokens : usage.prompt_tokens + usage.completion_tokens

  return { text, usage, latencyMs, model: String(data?.model ?? config.model) }
}

export async function recordUsage(
  service: SupabaseClient,
  event: { jobId?: string | null; kind: string; model?: string | null; usage?: ProviderUsage; ms?: number; status?: string },
): Promise<void> {
  const { error } = await service.from('ai_usage_events').insert([{
    job_id: event.jobId ?? null,
    kind: event.kind,
    model: event.model ?? null,
    tokens_in: event.usage?.prompt_tokens ?? 0,
    tokens_out: event.usage?.completion_tokens ?? 0,
    ms: event.ms ?? null,
    status: event.status ?? 'ok',
  }])
  // Cost accounting must never break a reply that already reached the user.
  if (error) console.error('ai_usage_events insert failed:', error.message)
}

// ─── Pseudonyms ──────────────────────────────────────────────────────────────

export type AliasEntry = {
  kind: 'student' | 'staff' | 'room' | 'program'
  id: string | number
  name: string | null
  email?: string | null
}
export type AliasMap = {
  forward: (text: string) => string
  reverse: (text: string) => string
  hasReal: (text: string) => boolean
}

/**
 * One read of the four name sources, then the deterministic alias map (D2).
 * `entries` is returned too so callers can render ids as names without a
 * second round of queries.
 */
export async function buildAliasSource(
  service: SupabaseClient,
): Promise<{ map: AliasMap; entries: AliasEntry[] }> {
  const [profiles, students, rooms, programs] = await Promise.all([
    service.from('profiles').select('id, name, email'),
    service.from('students').select('id, name'),
    service.from('rooms').select('id, name'),
    service.from('programs').select('id, name'),
  ])

  if (profiles.error || students.error || rooms.error || programs.error) {
    fail(500, 'ALIAS_MAP_FAILED', 'Could not build the alias map')
  }

  const entries: AliasEntry[] = [
    ...(profiles.data ?? []).map((row: any) => ({ kind: 'staff' as const, id: row.id, name: row.name, email: row.email })),
    ...(students.data ?? []).map((row: any) => ({ kind: 'student' as const, id: row.id, name: row.name })),
    ...(rooms.data ?? []).map((row: any) => ({ kind: 'room' as const, id: row.id, name: row.name })),
    ...(programs.data ?? []).map((row: any) => ({ kind: 'program' as const, id: row.id, name: row.name })),
  ]

  return { map: createAliasMap(entries) as AliasMap, entries }
}

export const pseudonymize = (text: string, map: AliasMap): string => map.forward(text)
export const restore = (text: string, map: AliasMap): string => map.reverse(text)
