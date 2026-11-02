/**
 * AI Assistant — Edge Function (phase 13a, plan §5.1).
 *
 * POST /functions/v1/ai-assistant
 * Body: { action: 'threads' | 'messages' | 'send', threadId?, message?, context? }
 *
 * Read-only assistant: it answers from a dated snapshot that is pseudonymised
 * before it leaves the project (D2) and writes only to assistant_threads /
 * assistant_messages / ai_usage_events. No app table is ever written here.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.0'
import {
  asFailure,
  assertCap,
  buildAliasSource,
  callProvider,
  corsHeaders,
  estimateTokens,
  fail,
  json,
  jsonError,
  loadAiConfig,
  monthUsage,
  recordUsage,
  restore,
  verifyCaller,
} from '../_shared/ai.ts'
import type { AliasEntry, AliasMap } from '../_shared/ai.ts'

type Service = ReturnType<typeof createClient>

const ROLES = ['admin', 'superadmin'] as const
const MAX_MESSAGE_CHARS = 4000
const MAX_REPLY_TOKENS = 600

// ─── Snapshot (aliased; the only data the model may answer from) ─────────────

async function buildSnapshot(service: Service, entries: AliasEntry[], map: AliasMap) {
  const today = new Date()
  const startISO = today.toISOString().slice(0, 10)
  const endISO = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  // Mon = 0 … Fri = 4, the same rule the calendar uses (id % 5 for undated rows).
  const weekday = (today.getDay() + 6) % 7

  const headCount = async (table: string) => {
    const { count, error } = await service.from(table).select('id', { count: 'exact', head: true })
    // A failed count must not read as "zero" to the model.
    if (error) fail(500, 'INTERNAL', 'Could not read the schedule snapshot')
    return count ?? 0
  }

  const sessionColumns = 'title, therapist_id, student_ids, room, program_id, start_hour, span, session_date, is_confirmed'

  const [profiles, students, sessions, rooms, programs, upcoming, undated] = await Promise.all([
    headCount('profiles'),
    headCount('students'),
    headCount('sessions'),
    headCount('rooms'),
    headCount('programs'),
    service
      .from('sessions')
      .select(sessionColumns)
      .gte('session_date', startISO)
      .lte('session_date', endISO)
      .order('session_date', { ascending: true })
      .order('start_hour', { ascending: true })
      .limit(500),
    // Undated weekly rows carry no session_date; the day view places them by id % 5.
    service
      .from('sessions')
      .select(`id, ${sessionColumns}`)
      .is('session_date', null)
      .limit(100),
  ])

  if (upcoming.error || undated.error) fail(500, 'INTERNAL', 'Could not read the schedule snapshot')

  const byId = (kind: AliasEntry['kind']) =>
    new Map(entries.filter((entry) => entry.kind === kind).map((entry) => [String(entry.id), entry.name]))

  const staffById = byId('staff')
  const studentById = byId('student')
  const programById = byId('program')

  const alias = (value: unknown) => (typeof value === 'string' && value ? map.forward(value) : null)

  const toSnapshot = (row: any) => ({
    title: alias(row.title),
    staff: alias(staffById.get(String(row.therapist_id))),
    students: (Array.isArray(row.student_ids) ? row.student_ids : [])
      .map((id: number | string) => alias(studentById.get(String(id))))
      .filter(Boolean),
    room: alias(row.room),
    program: alias(programById.get(String(row.program_id))),
    start_hour: row.start_hour,
    span: row.span,
    session_date: row.session_date ?? null,
    is_confirmed: row.is_confirmed === true,
  })

  const upcomingSessions = ((upcoming.data ?? []) as any[]).map(toSnapshot)
  const recurringToday = weekday <= 4
    ? ((undated.data ?? []) as any[])
      .filter((row) => Number(row.id) % 5 === weekday)
      .map((row) => ({ ...toSnapshot(row), recurring: true }))
    : []

  return {
    today: startISO,
    windowEnd: endISO,
    counts: { profiles, students, sessions, rooms, programs },
    upcomingSessions,
    recurringToday,
  }
}

// ─── Threads ─────────────────────────────────────────────────────────────────

async function ownedThread(service: Service, threadId: string, userId: string) {
  const { data } = await service
    .from('assistant_threads')
    .select('id')
    .eq('id', threadId)
    .eq('user_id', userId)
    .maybeSingle()

  // 404 rather than 403: a thread the caller does not own must not be probeable.
  if (!data) fail(404, 'NOT_FOUND', 'Thread not found')
  return data
}

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

    const { user, role } = await verifyCaller(req, service, [...ROLES])

    let body: Record<string, any> = {}
    try {
      body = (await req.json()) ?? {}
    } catch {
      return jsonError('VALIDATION_FAILED', 'Malformed JSON body', 400, req)
    }

    const action = body.action

    if (action === 'threads') {
      const { data } = await service
        .from('assistant_threads')
        .select('id, title, last_message_at')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false })
        .limit(50)

      return json({ threads: data ?? [] }, 200, req)
    }

    if (action === 'messages') {
      const threadId = body.threadId
      if (typeof threadId !== 'string' || !threadId) {
        return jsonError('VALIDATION_FAILED', 'threadId is required', 422, req)
      }

      await ownedThread(service, threadId, user.id)

      const { data } = await service
        .from('assistant_messages')
        .select('id, role, content, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })

      return json({ messages: data ?? [] }, 200, req)
    }

    if (action === 'send') {
      const message = typeof body.message === 'string' ? body.message.trim() : ''
      if (message.length < 1 || message.length > MAX_MESSAGE_CHARS) {
        return jsonError('VALIDATION_FAILED', `Message must be 1-${MAX_MESSAGE_CHARS} characters`, 422, req)
      }

      const config = await loadAiConfig(service)
      if (!config.enabled) return jsonError('CONFIG_MISSING', 'AI is disabled', 409, req)
      if (!config.assistantOn) return jsonError('CONFIG_MISSING', 'The assistant is disabled', 409, req)
      if (!config.baseUrl || !config.model || !config.apiKey) {
        return jsonError('CONFIG_MISSING', 'Save a base URL, model and API key first', 409, req)
      }

      const used = await monthUsage(service)
      assertCap(config, used, estimateTokens(message) + MAX_REPLY_TOKENS)

      const context = body.context && typeof body.context === 'object' ? body.context : {}
      const route = typeof context.route === 'string' ? context.route.slice(0, 120) : ''
      const dateISO = typeof context.dateISO === 'string' ? context.dateISO.slice(0, 40) : ''

      let threadId = typeof body.threadId === 'string' && body.threadId ? body.threadId : null
      if (threadId) {
        await ownedThread(service, threadId, user.id)
      } else {
        const { data, error } = await service
          .from('assistant_threads')
          .insert([{ user_id: user.id, title: message.slice(0, 60) }])
          .select('id')
          .single()
        if (error || !data) return jsonError('INTERNAL', 'Could not create the thread', 500, req)
        threadId = data.id as string
      }

      // Internal transcript keeps the display text (D2); only provider-bound
      // payloads carry aliases.
      const { error: userMessageError } = await service
        .from('assistant_messages')
        .insert([{ thread_id: threadId, role: 'user', content: message }])
      if (userMessageError) return jsonError('INTERNAL', 'Could not save the message', 500, req)

      const { map, entries } = await buildAliasSource(service)
      const snapshot = await buildSnapshot(service, entries, map)

      const systemPrompt = [
        'You are the PoliSync assistant for a special-education center.',
        'Answer only from the SNAPSHOT below. Never invent counts, names, or times that are not in it.',
        'Names are aliased (S-student, T-staff, R-room, P-program): reuse the aliases exactly as given.',
        "Undated recurring sessions appear on the calendar's weekday rule; do not claim any other weekday for them.",
        'You are read-only: you cannot change data. If asked to change something, point the user to the relevant page (Schedule, Planner, Students, Rooms, Programs).',
        'Keep every reply under 180 words and use plain markdown.',
        `Caller role: ${role}. Page context: ${route || 'unknown'}${dateISO ? ` on ${dateISO}` : ''}.`,
      ].join('\n')

      const result = await callProvider(config, {
        messages: [
          { role: 'system', content: `${systemPrompt}\n\nSNAPSHOT (JSON):\n${JSON.stringify(snapshot)}` },
          { role: 'user', content: map.forward(message) },
        ],
        maxTokens: Math.min(config.maxOutputTokens ?? MAX_REPLY_TOKENS, MAX_REPLY_TOKENS),
        temperature: 0.2,
      })

      const reply = restore(result.text, map).trim()

      const { error: replyError } = await service
        .from('assistant_messages')
        .insert([{ thread_id: threadId, role: 'assistant', content: reply }])
      if (replyError) console.error('Assistant message insert failed:', replyError.message)

      await service
        .from('assistant_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', threadId)

      await recordUsage(service, {
        kind: 'assistant',
        model: result.model,
        usage: result.usage,
        ms: result.latencyMs,
        status: 'ok',
      })

      return json({ threadId, reply }, 200, req)
    }

    return jsonError('VALIDATION_FAILED', 'Unknown action', 422, req)
  } catch (error) {
    const failure = asFailure(error)
    if (failure.code === 'INTERNAL') {
      console.error('ai-assistant error:', error instanceof Error ? error.message : String(error))
    }
    return jsonError(failure.code, failure.message, failure.status, req)
  }
})
