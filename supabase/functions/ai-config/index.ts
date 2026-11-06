/**
 * AI provider configuration — Edge Function (phase 13a, plan §5.0).
 *
 * POST /functions/v1/ai-config
 * Body: { action: 'get' | 'save' | 'test' | 'models', patch?, preset?, baseUrl? }
 *
 * Superadmin only. Backs /admin/ai. `get` never returns `api_key`; `save` audits
 * field names (never values); `test` makes one 5-token probe and stores the
 * provider's verdict. `models` reads a provider's public model list server-side:
 * the page never fetches a provider, and only two constant URLs are ever called.
 * The key exists only inside this process and the Authorization header of the
 * probe.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.0'
import {
  asFailure,
  assertRateLimit,
  callProvider,
  corsHeaders,
  json,
  jsonError,
  loadAiConfig,
  monthUsage,
  recordUsage,
  verifyCaller,
} from '../_shared/ai.ts'
import type { AiConfig } from '../_shared/ai.ts'
import { MODELS_UNAVAILABLE_NOTE, modelsUrl, normalizeModels, providerFor } from '../_shared/providerModels.js'

type Service = ReturnType<typeof createClient>

const PRESETS = ['commandcode', 'opencode', 'custom']

// Cloudflare/providers can hang; a models list is never worth blocking the edge.
const MODELS_TIMEOUT_MS = 15_000

// ─── Safe projection ─────────────────────────────────────────────────────────
// Explicit whitelist: adding a column to ai_config can never leak it by default.

async function buildState(service: Service, config: AiConfig) {
  const tokensThisMonth = await monthUsage(service)

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count } = await service
    .from('ai_usage_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)

  let savedBy = 'IT Manager'
  if (config.updatedBy) {
    const { data } = await service.from('profiles').select('name').eq('id', config.updatedBy).maybeSingle()
    if (data?.name) savedBy = data.name
  }

  return {
    enabled: config.enabled,
    providerPreset: config.providerPreset,
    features: {
      assistant: config.assistantOn,
      planner: config.plannerOn,
      repair: config.repairOn,
      extract: config.extractOn,
      reports: config.reportsOn,
    },
    baseUrl: config.baseUrl,
    model: config.model,
    visionModel: config.visionModel,
    zdr: config.zdr,
    hasKey: config.hasKey,
    keyProvider: config.keyProvider,
    monthlyTokenCap: config.monthlyTokenCap,
    timeoutSeconds: config.timeoutSeconds,
    maxOutputTokens: config.maxOutputTokens,
    savedAt: config.updatedAt,
    savedBy,
    envOverride: config.envOverride,
    lastTest: { ok: config.lastTestOk, at: config.lastTestAt },
    usage: {
      tokensThisMonth,
      capPct: config.monthlyTokenCap > 0
        ? Math.round((tokensThisMonth / config.monthlyTokenCap) * 100)
        : 0,
      last30dCalls: count ?? 0,
    },
  }
}

// ─── Save validation ─────────────────────────────────────────────────────────

const toBool = (value: unknown): boolean =>
  value === true || value === 'true' || value === 1 || value === '1'

// provider remote https only; localhost/127.0.0.1 may be plain http for Ollama/LM Studio
const isAllowedBaseUrl = (value: string): boolean =>
  /^https:\/\/\S+$/i.test(value) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }
  if (req.method !== 'POST') {
    return jsonError('VALIDATION_FAILED', 'Use POST', 405, req)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const service = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const caller = await verifyCaller(req, service, ['superadmin'])

    let body: Record<string, any> = {}
    try {
      body = (await req.json()) ?? {}
    } catch {
      return jsonError('VALIDATION_FAILED', 'Malformed JSON body', 400, req)
    }

    const action = body.action

    if (action === 'get') {
      const config = await loadAiConfig(service)
      return json(await buildState(service, config), 200, req)
    }

    if (action === 'save') {
      const patch = body.patch
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return jsonError('VALIDATION_FAILED', 'patch must be an object', 422, req)
      }

      const has = (key: string) => Object.prototype.hasOwnProperty.call(patch, key)
      const first = (...keys: string[]) => keys.find((key) => has(key))
      const invalid = (message: string) => jsonError('VALIDATION_FAILED', message, 422, req)

      const updates: Record<string, unknown> = {}

      const baseUrlKey = first('baseUrl', 'base_url')
      if (baseUrlKey) {
        const value = typeof patch[baseUrlKey] === 'string' ? patch[baseUrlKey].trim() : ''
        if (!value) {
          updates.base_url = null
        } else {
          const normalized = value.replace(/\/+$/, '')
          if (!isAllowedBaseUrl(normalized)) {
            return invalid('Base URL must start with https:// (http://localhost and http://127.0.0.1 are allowed for local models)')
          }
          updates.base_url = normalized
        }
      }

      const modelKey = first('model')
      if (modelKey) {
        const value = typeof patch[modelKey] === 'string' ? patch[modelKey].trim() : ''
        if (!value) return invalid('Model is required')
        updates.model = value
      }

      const visionModelKey = first('visionModel', 'vision_model')
      if (visionModelKey) {
        const value = typeof patch[visionModelKey] === 'string' ? patch[visionModelKey].trim() : ''
        updates.vision_model = value || null
      }

      const enabledKey = first('enabled')
      if (enabledKey) updates.enabled = toBool(patch[enabledKey])

      const presetKey = first('providerPreset', 'provider_preset')
      let providerPreset: string | null = null
      if (presetKey) {
        const value = typeof patch[presetKey] === 'string' ? patch[presetKey].trim() : ''
        if (!PRESETS.includes(value)) {
          return invalid('Provider preset must be commandcode, opencode or custom')
        }
        providerPreset = value
        updates.provider_preset = value
      }

      const zdrKey = first('zdr')
      if (zdrKey) {
        if (typeof patch[zdrKey] !== 'boolean') return invalid('zdr must be a boolean')
        updates.zdr = patch[zdrKey]
      }

      const featuresKey = first('features')
      if (featuresKey) {
        const features = patch[featuresKey]
        if (!features || typeof features !== 'object' || Array.isArray(features)) {
          return invalid('features must be an object')
        }
        const columns: Record<string, string> = {
          assistant: 'assistant_on',
          planner: 'planner_on',
          repair: 'repair_on',
          extract: 'extract_on',
          reports: 'reports_on',
        }
        for (const [key, column] of Object.entries(columns)) {
          if (Object.prototype.hasOwnProperty.call(features, key)) {
            updates[column] = toBool((features as Record<string, unknown>)[key])
          }
        }
      }

      const capKey = first('monthlyTokenCap', 'monthly_token_cap')
      if (capKey) {
        const cap = Number(patch[capKey])
        if (!Number.isInteger(cap) || cap < 1000) return invalid('Monthly token cap must be an integer of at least 1000')
        updates.monthly_token_cap = cap
      }

      const timeoutKey = first('timeoutSeconds', 'timeout_seconds')
      if (timeoutKey) {
        const timeout = Number(patch[timeoutKey])
        if (!Number.isInteger(timeout) || timeout < 5 || timeout > 120) {
          return invalid('Timeout must be an integer between 5 and 120 seconds')
        }
        updates.timeout_seconds = timeout
      }

      const maxTokensKey = first('maxOutputTokens', 'max_output_tokens')
      if (maxTokensKey) {
        const raw = patch[maxTokensKey]
        if (raw === null) {
          updates.max_output_tokens = null
        } else {
          const maxTokens = Number(raw)
          if (!Number.isInteger(maxTokens) || maxTokens < 256 || maxTokens > 65536) {
            return invalid('Max output tokens must be null or an integer between 256 and 65536')
          }
          updates.max_output_tokens = maxTokens
        }
      }

      // undefined/absent = keep, '' = keep, '__CLEAR__' = remove, else replace.
      // The key is provider-scoped: a replaced key binds to this patch's preset,
      // clearing it drops the binding, keeping it leaves both untouched.
      const keyName = first('apiKey', 'api_key')
      if (keyName) {
        const raw = patch[keyName]
        if (raw !== undefined && raw !== '') {
          if (typeof raw !== 'string') return invalid('API key must be a string')
          const value = raw.trim()
          if (value === '__CLEAR__') {
            updates.api_key = null
            updates.key_provider = null
          } else if (value) {
            updates.api_key = value
            updates.key_provider = providerPreset ?? 'custom'
          }
        }
      }

      const fields = Object.keys(updates)
      if (fields.length === 0) return json({ ok: true, fields }, 200, req)

      const { error } = await service.from('ai_config').upsert([{
        id: 1,
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: caller.user.id,
      }])
      if (error) return jsonError('INTERNAL', 'Could not save the AI configuration', 500, req)

      // Field names only: the key value and the URL never enter the audit trail.
      const { error: auditError } = await service.from('audit_logs').insert([{
        action: 'ai_config_updated',
        performed_by: caller.user.id,
        details: { fields },
      }])
      if (auditError) console.error('AI config audit insert failed:', auditError.message)

      return json({ ok: true, fields }, 200, req)
    }

    if (action === 'models') {
      const provider = providerFor({
        preset: typeof body.preset === 'string' ? body.preset : '',
        baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : '',
      })
      if (!provider) {
        return json({ models: [], visionModels: [], note: MODELS_UNAVAILABLE_NOTE }, 200, req)
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), MODELS_TIMEOUT_MS)
      try {
        const response = await fetch(modelsUrl(provider)!, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json()
        const models = normalizeModels(payload?.data, provider)
        return json({ models, visionModels: models.filter((model: { vision: boolean }) => model.vision) }, 200, req)
      } catch (error) {
        // Never throw: the page shows a hint and the operator types the ID.
        console.error('ai-config models:', error instanceof Error ? error.message : String(error))
        return jsonError('MODELS_UNAVAILABLE', "Couldn't load models — type the ID manually.", 502, req)
      } finally {
        clearTimeout(timer)
      }
    }

    if (action === 'test') {
      const config = await loadAiConfig(service)
      if (!config.baseUrl || !config.model || !config.apiKey) {
        return jsonError('CONFIG_MISSING', 'Save a base URL, model and API key first', 409, req)
      }
      // The probe costs a provider call: it counts toward the same hourly limit.
      await assertRateLimit(service, caller.user.id, config.rateLimitPerHour)

      const testedAt = new Date().toISOString()
      try {
        let result
        try {
          result = await callProvider(config, {
            messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
            maxTokens: 5,
            temperature: 0,
          })
        } catch (error) {
          // A failed probe still costs the caller its hourly slot.
          await recordUsage(service, { kind: 'test', userId: caller.user.id, model: config.model, status: 'error' })
          throw error
        }

        await service.from('ai_config').update({ last_test_ok: true, last_test_at: testedAt }).eq('id', 1)
        await recordUsage(service, {
          kind: 'test',
          userId: caller.user.id,
          model: result.model,
          usage: result.usage,
          ms: result.latencyMs,
          status: 'ok',
        })

        return json({
          ok: true,
          latencyMs: result.latencyMs,
          model: result.model,
          sample: result.text.slice(0, 200),
        }, 200, req)
      } catch (error) {
        await service.from('ai_config').update({ last_test_ok: false, last_test_at: testedAt }).eq('id', 1)
        throw error
      }
    }

    return jsonError('VALIDATION_FAILED', 'Unknown action', 422, req)
  } catch (error) {
    const failure = asFailure(error)
    if (failure.code === 'INTERNAL') {
      console.error('ai-config error:', error instanceof Error ? error.message : String(error))
    }
    return jsonError(failure.code, failure.message, failure.status, req)
  }
})
