/**
 * Smart Auto-Scheduler Edge Function
 * 
 * Hybrid scheduler using:
 *   - Backtracking with depth-limited search
 *   - MRV (Most Restrictive Variable) heuristic ordering
 *   - Global scoring to pick the best schedule across retry attempts
 *
 * POST /functions/v1/auto-scheduler
 * Body: {
 *   dayOfWeek?: number,            // 0=Mon..4=Fri, defaults today (weekend → 422)
 *   sessionDate?: string,          // 'YYYY-MM-DD' anchor week / selected date
 *   scope?: 'whole-week' | 'selected-day',   // default 'selected-day'
 *   studentProgramIds?: number[],  // subset to schedule; omit = all pending
 *   dryRun?: boolean,
 *   config?: Partial<SchedulerConfig>,
 * }
 * Response: { success, dryRun, dayOfWeek, scope, score, scheduled, unscheduled,
 *             alreadyScheduled, perDay, stats, logs }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.0'

// ─── CORS ────────────────────────────────────────────────────────────────────
// Defence in depth only: curl ignores CORS, so every path below still verifies
// the caller (ADR-003). Unknown origins get no Allow-Origin header (fail closed).
function corsHeaders(req: Request) {
  const allowed = (Deno.env.get('APP_ORIGIN') ?? '').split(',').map(o => o.trim()).filter(Boolean)
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

const json = (body: unknown, status: number, req: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })

// ─── Types ───────────────────────────────────────────────────────────────────

interface SchedulerConfig {
  maxBacktrackDepth: number
  timeBudgetMs: number
  retryAttempts: number
  minBreakMinutes: number
  operatingStartHour: number
  operatingEndHour: number
  maxDailyHoursPerStudent: number
  slotIncrementHours: number
}

interface AvailabilityWindow {
  startHour: number
  endHour: number
  dayOfWeek: number
}

interface StudentProgram {
  id: number
  student_id: number
  program_id: number
  sessions_per_week: number
  preferred_duration_hours: number | null
  priority: number
  status: string
  assigned_teacher_id: string | null
}

interface Program {
  id: number
  name: string
  type: string
  default_duration_hours: number
  min_students: number
  max_students: number
}

interface Room {
  id: number
  name: string
  type: string
  max_capacity: number
}

interface Teacher {
  id: string
  name: string
  role: string
  status: string
}

interface ExistingSession {
  id: number
  therapist_id: string
  student_ids: number[]
  room: string
  start_hour: number
  span: number
  session_date?: string | null
  day_of_week: number
  program_id: number | null
  student_program_id: number | null
}

/** A single assignment in the schedule being built */
interface Assignment {
  studentProgramId: number
  studentId: number
  programId: number
  programName: string
  teacherId: string
  room: string
  startHour: number
  duration: number
  type: string
  dayOfWeek?: number
  sessionDate?: string
}

interface ScheduleResult {
  assignments: Assignment[]
  unscheduled: Array<{ studentProgramId: number; studentId: number; reason: string }>
  score: number
  stats: { attempts: number; backtracks: number; elapsed: number }
}

interface LogEntry {
  level: 'info' | 'warn' | 'debug'
  message: string
  data?: Record<string, unknown>
}

type Scope = 'whole-week' | 'selected-day'

type UnscheduledItem = { studentProgramId: number; studentId: number; reason: string }

interface DayResult {
  dayOfWeek: number
  sessionDate: string
  score: number
  scheduled: number[]
  unscheduled: UnscheduledItem[]
}

/** Everything the handler needs to persist and answer. */
interface RunOutput {
  scheduled: Assignment[]
  unscheduled: UnscheduledItem[]
  alreadyScheduled: number[]
  perDay: DayResult[]
  score: number
  stats: { attempts: number; backtracks: number; elapsed: number }
  /** sessions_per_week per requirement */
  quota: Map<number, number>
  /** sessions already linked to the requirement before this run */
  linked: Map<number, number>
  logs: LogEntry[]
}

// ─── Default Config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: SchedulerConfig = {
  maxBacktrackDepth: 500,
  timeBudgetMs: 8000,
  retryAttempts: 3,
  minBreakMinutes: 15,
  operatingStartHour: 8,
  operatingEndHour: 17,
  maxDailyHoursPerStudent: 4,
  slotIncrementHours: 0.5,
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

function timeToHour(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + (m || 0) / 60
}

function getCurrentDayOfWeek(): number {
  const d = new Date().getDay()
  return d === 0 ? 4 : d - 1 // Mon=0 … Fri=4 (Saturday 5 is rejected by validation)
}

// Monday of the anchor week (default: current week) + day, from local date parts (no UTC drift).
function dateForDay(day: number, anchor?: string): string {
  const parts = anchor && /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? anchor.split('-').map(Number) : null
  const now = new Date()
  const dt = parts
    ? new Date(parts[0], parts[1] - 1, parts[2])
    : new Date(now.getFullYear(), now.getMonth(), now.getDate())

  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7) + day)

  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

// Monday=0 … Friday=4 from a local 'YYYY-MM-DD'. Weekend or unparseable dates yield null.
function weekdayOfDate(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const [y, m, d] = date.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay()
  return jsDay === 0 || jsDay === 6 ? null : jsDay - 1
}

// ─── Conflict Detection ─────────────────────────────────────────────────────

function hasTimeOverlap(
  s1Start: number, s1End: number,
  s2Start: number, s2End: number,
): boolean {
  return Math.max(s1Start, s2Start) < Math.min(s1End, s2End)
}

/**
 * Check whether placing `candidate` violates any hard constraint.
 * Returns null if valid, or a string describing the conflict.
 */
function checkConflict(
  candidate: { studentId: number; teacherId: string; room: string; startHour: number; duration: number },
  occupied: ExistingSession[],
  assignments: Assignment[],
  studentAvailWindows: AvailabilityWindow[],
  teacherAvailWindows: AvailabilityWindow[],
  config: SchedulerConfig,
  dayOfWeek: number,
  allAssignmentsForStudent: Assignment[],
): string | null {
  const cEnd = candidate.startHour + candidate.duration

  // 1) Operating-hours bounds
  if (candidate.startHour < config.operatingStartHour || cEnd > config.operatingEndHour) {
    return 'Outside operating hours'
  }

  // 2) Student availability window
  const validWindow = studentAvailWindows.some(w =>
    w.dayOfWeek === dayOfWeek &&
    candidate.startHour >= w.startHour &&
    cEnd <= w.endHour
  )
  if (studentAvailWindows.length > 0 && !validWindow) {
    return 'Outside student availability'
  }

  // 3) Teacher availability window
  if (teacherAvailWindows.length > 0) {
    const teacherOk = teacherAvailWindows.some(w =>
      w.dayOfWeek === dayOfWeek &&
      candidate.startHour >= w.startHour &&
      cEnd <= w.endHour
    )
    if (!teacherOk) return 'Outside teacher availability'
  }

  const breakHours = config.minBreakMinutes / 60

  // 4) Check against already-persisted sessions
  for (const s of occupied) {
    if (s.day_of_week !== dayOfWeek) continue
    const sEnd = s.start_hour + s.span
    const overlap = hasTimeOverlap(candidate.startHour, cEnd, s.start_hour, sEnd)
    if (!overlap) continue

    if (String(s.therapist_id) === String(candidate.teacherId)) return 'Teacher already booked (existing)'
    if (s.room === candidate.room) return 'Room already booked (existing)'
    if (s.student_ids?.includes(candidate.studentId)) return 'Student already booked (existing)'
  }

  // 5) Check against current backtracking assignments
  for (const a of assignments) {
    const aEnd = a.startHour + a.duration
    const overlap = hasTimeOverlap(candidate.startHour, cEnd, a.startHour, aEnd)
    if (!overlap) continue

    if (String(a.teacherId) === String(candidate.teacherId)) return 'Teacher double-booked (new)'
    if (a.room === candidate.room) return 'Room double-booked (new)'
    if (a.studentId === candidate.studentId) return 'Student double-booked (new)'
  }

  // 6) Break-time enforcement for the student
  for (const a of allAssignmentsForStudent) {
    const aEnd = a.startHour + a.duration
    // Check if break is respected (gap must be >= breakHours)
    const gap = Math.max(candidate.startHour - aEnd, a.startHour - cEnd)
    if (gap > 0 && gap < breakHours) return `Insufficient break (${gap * 60}min < ${config.minBreakMinutes}min)`
  }
  // Also check against existing sessions for break
  for (const s of occupied) {
    if (s.day_of_week !== dayOfWeek) continue
    if (!s.student_ids?.includes(candidate.studentId)) continue
    const sEnd = s.start_hour + s.span
    const gap = Math.max(candidate.startHour - sEnd, s.start_hour - cEnd)
    if (gap > 0 && gap < breakHours) return 'Insufficient break (existing session)'
  }

  // 7) Max daily hours for student
  const existingStudentHours = occupied
    .filter(s => s.day_of_week === dayOfWeek && s.student_ids?.includes(candidate.studentId))
    .reduce((sum, s) => sum + s.span, 0)
  const newStudentHours = allAssignmentsForStudent.reduce((sum, a) => sum + a.duration, 0)
  if (existingStudentHours + newStudentHours + candidate.duration > config.maxDailyHoursPerStudent) {
    return 'Exceeds max daily hours'
  }

  return null // No conflict — slot is valid
}

// ─── Scoring Engine ──────────────────────────────────────────────────────────

function scoreSchedule(
  assignments: Assignment[],
  unscheduledCount: number,
  existingSessions: ExistingSession[],
  dayOfWeek: number,
): number {
  let score = 0

  // +10 for every scheduled session
  score += assignments.length * 10

  // -5 for every unscheduled program
  score -= unscheduledCount * 5

  // -2 for large idle gaps per student
  const studentGroups = new Map<number, Assignment[]>()
  for (const a of assignments) {
    if (!studentGroups.has(a.studentId)) studentGroups.set(a.studentId, [])
    studentGroups.get(a.studentId)!.push(a)
  }
  for (const [_sid, group] of studentGroups) {
    const sorted = [...group].sort((a, b) => a.startHour - b.startHour)
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].startHour - (sorted[i - 1].startHour + sorted[i - 1].duration)
      if (gap > 1.5) score -= 2
    }
  }

  // +3 for preferred morning slots (before noon)
  for (const a of assignments) {
    if (a.startHour < 12) score += 3
  }

  // +2 for teacher continuity (same teacher assigned to same student across sessions)
  for (const [_sid, group] of studentGroups) {
    if (group.length > 1) {
      const sameTeacher = group.every(a => a.teacherId === group[0].teacherId)
      if (sameTeacher) score += 2
    }
  }

  // +1 for compact schedules (small span from first to last session per student)
  for (const [_sid, group] of studentGroups) {
    if (group.length > 1) {
      const sorted = [...group].sort((a, b) => a.startHour - b.startHour)
      const totalSpan = (sorted[sorted.length - 1].startHour + sorted[sorted.length - 1].duration) - sorted[0].startHour
      const totalDuration = group.reduce((s, a) => s + a.duration, 0)
      const wastedTime = totalSpan - totalDuration
      score += Math.max(0, 3 - Math.floor(wastedTime / 0.5))
    }
  }

  return score
}

// ─── Heuristic Ordering ─────────────────────────────────────────────────────

function orderByHeuristic(
  pending: StudentProgram[],
  programs: Program[],
  studentAvail: Map<number, AvailabilityWindow[]>,
  teachers: Teacher[],
  mode: 'mrv' | 'reverse' | 'random',
): StudentProgram[] {
  if (mode === 'random') {
    const shuffled = [...pending]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const scored = pending.map(sp => {
    const program = programs.find(p => p.id === sp.program_id)
    const duration = sp.preferred_duration_hours || program?.default_duration_hours || 1
    const windows = studentAvail.get(sp.student_id) || []
    const totalAvailHours = windows.reduce((s, w) => s + (w.endHour - w.startHour), 0)
    // Fewer slots = more constrained = higher priority
    const slotScarcity = totalAvailHours > 0 ? 1 / totalAvailHours : 100
    const durationWeight = duration * 2
    const priorityWeight = (11 - sp.priority) // priority 1-10, higher is more important internally

    return {
      sp,
      heuristicScore: slotScarcity * 40 + durationWeight * 10 + priorityWeight * 5,
    }
  })

  scored.sort((a, b) => mode === 'reverse'
    ? a.heuristicScore - b.heuristicScore
    : b.heuristicScore - a.heuristicScore
  )

  return scored.map(s => s.sp)
}

// ─── Valid Slot Generator ────────────────────────────────────────────────────

function getValidSlots(
  sp: StudentProgram,
  program: Program,
  teachers: Teacher[],
  rooms: Room[],
  existingSessions: ExistingSession[],
  currentAssignments: Assignment[],
  studentAvail: AvailabilityWindow[],
  teacherAvailMap: Map<string, AvailabilityWindow[]>,
  config: SchedulerConfig,
  dayOfWeek: number,
): Array<{ teacherId: string; room: string; startHour: number; duration: number }> {
  const duration = sp.preferred_duration_hours || program.default_duration_hours
  const slots: Array<{ teacherId: string; room: string; startHour: number; duration: number }> = []

  const studentAssignments = currentAssignments.filter(a => a.studentId === sp.student_id)

  // Use student availability windows, or fall back to full operating hours
  const windows = studentAvail.length > 0
    ? studentAvail.filter(w => w.dayOfWeek === dayOfWeek)
    : [{ startHour: config.operatingStartHour, endHour: config.operatingEndHour, dayOfWeek }]

  for (const window of windows) {
    const dayStart = Math.max(window.startHour, config.operatingStartHour)
    const dayEnd = Math.min(window.endHour, config.operatingEndHour)

    for (let hour = dayStart; hour + duration <= dayEnd; hour += config.slotIncrementHours) {
      for (const teacher of teachers) {
        // Quick filter: prefer assigned teacher if set
        if (sp.assigned_teacher_id && sp.assigned_teacher_id !== teacher.id) continue

        const teacherWindows = teacherAvailMap.get(teacher.id) || []

        for (const room of rooms) {
          const conflict = checkConflict(
            { studentId: sp.student_id, teacherId: teacher.id, room: room.name, startHour: hour, duration },
            existingSessions,
            currentAssignments,
            studentAvail,
            teacherWindows,
            config,
            dayOfWeek,
            studentAssignments,
          )
          if (!conflict) {
            slots.push({ teacherId: teacher.id, room: room.name, startHour: hour, duration })
          }
        }
      }
    }
  }

  return slots
}

// ─── Backtracking Solver ─────────────────────────────────────────────────────

function solve(
  ordered: StudentProgram[],
  index: number,
  currentAssignments: Assignment[],
  programs: Program[],
  teachers: Teacher[],
  rooms: Room[],
  existingSessions: ExistingSession[],
  studentAvailMap: Map<number, AvailabilityWindow[]>,
  teacherAvailMap: Map<string, AvailabilityWindow[]>,
  config: SchedulerConfig,
  dayOfWeek: number,
  best: { result: ScheduleResult | null },
  counters: { depth: number; backtracks: number; startTime: number },
  logs: LogEntry[],
): void {
  // Time/depth budget check
  if (counters.depth > config.maxBacktrackDepth) return
  if (Date.now() - counters.startTime > config.timeBudgetMs) return

  // Base case: all student-programs processed
  if (index >= ordered.length) {
    const unscheduled = ordered
      .filter(sp => !currentAssignments.some(a => a.studentProgramId === sp.id))
      .map(sp => ({ studentProgramId: sp.id, studentId: sp.student_id, reason: 'No valid slot found' }))

    const score = scoreSchedule(currentAssignments, unscheduled.length, existingSessions, dayOfWeek)

    if (!best.result || score > best.result.score) {
      best.result = {
        assignments: [...currentAssignments],
        unscheduled,
        score,
        stats: {
          attempts: 0,
          backtracks: counters.backtracks,
          elapsed: Date.now() - counters.startTime,
        },
      }
      logs.push({ level: 'info', message: `New best score: ${score}`, data: { scheduled: currentAssignments.length, unscheduled: unscheduled.length } })
    }
    return
  }

  const sp = ordered[index]
  const program = programs.find(p => p.id === sp.program_id)
  if (!program) {
    // Skip invalid program, continue
    solve(ordered, index + 1, currentAssignments, programs, teachers, rooms, existingSessions, studentAvailMap, teacherAvailMap, config, dayOfWeek, best, counters, logs)
    return
  }

  const studentAvail = studentAvailMap.get(sp.student_id) || []
  const validSlots = getValidSlots(sp, program, teachers, rooms, existingSessions, currentAssignments, studentAvail, teacherAvailMap, config, dayOfWeek)

  // Try each valid slot
  for (const slot of validSlots) {
    if (Date.now() - counters.startTime > config.timeBudgetMs) return
    counters.depth++

    const assignment: Assignment = {
      studentProgramId: sp.id,
      studentId: sp.student_id,
      programId: program.id,
      programName: program.name,
      teacherId: slot.teacherId,
      room: slot.room,
      startHour: slot.startHour,
      duration: slot.duration,
      type: program.type,
    }

    // Assign
    currentAssignments.push(assignment)

    // Recurse
    solve(ordered, index + 1, currentAssignments, programs, teachers, rooms, existingSessions, studentAvailMap, teacherAvailMap, config, dayOfWeek, best, counters, logs)

    // Unassign (backtrack)
    counters.depth--
    currentAssignments.pop()
    counters.backtracks++

    // If we already have a perfect score (all scheduled), no need to try more
    if (best.result && best.result.unscheduled.length === 0) return
  }

  // Also try skipping this student-program (it may unlock better assignments later)
  counters.depth++
  solve(ordered, index + 1, currentAssignments, programs, teachers, rooms, existingSessions, studentAvailMap, teacherAvailMap, config, dayOfWeek, best, counters, logs)
  counters.depth--
}

// ─── Main Orchestrator ───────────────────────────────────────────────────────

/** One day: the existing 3-attempt (mrv/reverse/random) strategy, best result wins. */
function solveDay(
  pending: StudentProgram[],
  programs: Program[],
  teachers: Teacher[],
  rooms: Room[],
  existing: ExistingSession[],
  studentAvailMap: Map<number, AvailabilityWindow[]>,
  teacherAvailMap: Map<string, AvailabilityWindow[]>,
  config: SchedulerConfig,
  dayOfWeek: number,
  startedAt: number,
  logs: LogEntry[],
): ScheduleResult {
  const modes: Array<'mrv' | 'reverse' | 'random'> = ['mrv', 'reverse', 'random']
  let globalBest: ScheduleResult | null = null

  for (let attempt = 0; attempt < Math.min(config.retryAttempts, modes.length); attempt++) {
    const mode = modes[attempt]
    logs.push({ level: 'info', message: `Day ${dayOfWeek} attempt ${attempt + 1}/${config.retryAttempts}: ordering=${mode}` })

    const ordered = orderByHeuristic(pending, programs, studentAvailMap, teachers, mode)
    const best: { result: ScheduleResult | null } = { result: null }
    const counters = { depth: 0, backtracks: 0, startTime: startedAt }

    solve(ordered, 0, [], programs, teachers, rooms, existing, studentAvailMap, teacherAvailMap, config, dayOfWeek, best, counters, logs)

    if (best.result) {
      best.result.stats.attempts = attempt + 1
      logs.push({
        level: 'info',
        message: `Day ${dayOfWeek} attempt ${attempt + 1}: score=${best.result.score}, scheduled=${best.result.assignments.length}, unscheduled=${best.result.unscheduled.length}, backtracks=${best.result.stats.backtracks}`,
      })

      if (!globalBest || best.result.score > globalBest.score) {
        globalBest = best.result
      }

      // Perfect schedule found — stop early
      if (best.result.unscheduled.length === 0) {
        logs.push({ level: 'info', message: `Day ${dayOfWeek}: perfect schedule found, stopping early` })
        break
      }
    }
  }

  return globalBest || {
    assignments: [],
    unscheduled: pending.map(sp => ({ studentProgramId: sp.id, studentId: sp.student_id, reason: 'Solver found no solution' })),
    score: -pending.length * 5,
    stats: { attempts: config.retryAttempts, backtracks: 0, elapsed: Date.now() - startedAt },
  }
}

interface RunOptions {
  dayOfWeek: number
  scope: Scope
  sessionDate?: string
  studentProgramIds?: number[]
}

async function runSmartScheduler(
  supabase: ReturnType<typeof createClient>,
  options: RunOptions,
  userConfig: Partial<SchedulerConfig>,
): Promise<RunOutput> {
  const startedAt = Date.now()
  const config: SchedulerConfig = { ...DEFAULT_CONFIG, ...userConfig }
  const logs: LogEntry[] = []
  const { dayOfWeek, scope, sessionDate, studentProgramIds } = options

  logs.push({ level: 'info', message: 'Fetching scheduling data...' })

  const pendingQuery = studentProgramIds
    ? supabase.from('student_programs').select('*').eq('status', 'pending').in('id', studentProgramIds)
    : supabase.from('student_programs').select('*').eq('status', 'pending')

  // ── Fetch all data in parallel ──
  const [
    { data: settings },
    { data: pendingPrograms },
    { data: existingSessions },
    { data: programsData },
    { data: roomsData },
    { data: teachersData },
    { data: studentAvailData },
    { data: teacherAvailData },
  ] = await Promise.all([
    supabase.from('scheduling_settings').select('*').single(),
    pendingQuery,
    // Whole week: quota counts must see every weekday, even for a single-day run.
    // Legacy manual sessions have day_of_week = null, so they are fetched and dated below.
    supabase.from('sessions').select('*').or('day_of_week.in.(0,1,2,3,4),day_of_week.is.null'),
    supabase.from('programs').select('*').eq('is_active', true),
    supabase.from('rooms').select('*'),
    supabase.from('profiles').select('*').in('app_role', ['teacher', 'therapist']).eq('is_active', true),
    supabase.from('student_availability').select('*').eq('is_active', true),
    supabase.from('teacher_availability').select('*').eq('is_active', true),
  ])

  // Apply settings overrides
  if (settings) {
    config.minBreakMinutes = settings.min_break_minutes ?? config.minBreakMinutes
    config.maxDailyHoursPerStudent = settings.max_daily_hours_per_student ?? config.maxDailyHoursPerStudent
    if (settings.operating_start_time) config.operatingStartHour = timeToHour(settings.operating_start_time)
    if (settings.operating_end_time) config.operatingEndHour = timeToHour(settings.operating_end_time)
  }

  const pending: StudentProgram[] = pendingPrograms || []
  const programs: Program[] = (programsData || []).map((p: any) => ({ ...p, id: Number(p.id) }))
  const rooms: Room[] = roomsData || []
  const teachers: Teacher[] = teachersData || []
  const existing: ExistingSession[] = existingSessions || []

  // Legacy rows carry no weekday; derive it from the date so they still block conflicts.
  // Rows with no derivable weekday, or dated outside the target week, cannot conflict at all.
  const weekDates = new Set([0, 1, 2, 3, 4].map(d => dateForDay(d, sessionDate)))
  const occupied: ExistingSession[] = []
  for (const s of existing) {
    if (s.day_of_week != null) {
      occupied.push(s)
    } else if (s.session_date && weekDates.has(s.session_date)) {
      const weekday = weekdayOfDate(s.session_date)
      if (weekday !== null) occupied.push({ ...s, day_of_week: weekday })
    }
  }

  // Build availability maps
  const studentAvailMap = new Map<number, AvailabilityWindow[]>()
  for (const sa of (studentAvailData || [])) {
    const sid = Number(sa.student_id)
    if (!studentAvailMap.has(sid)) studentAvailMap.set(sid, [])
    studentAvailMap.get(sid)!.push({
      startHour: timeToHour(String(sa.start_time)),
      endHour: timeToHour(String(sa.end_time)),
      dayOfWeek: sa.day_of_week,
    })
  }

  const teacherAvailMap = new Map<string, AvailabilityWindow[]>()
  for (const ta of (teacherAvailData || [])) {
    const tid = String(ta.teacher_id)
    if (!teacherAvailMap.has(tid)) teacherAvailMap.set(tid, [])
    teacherAvailMap.get(tid)!.push({
      startHour: timeToHour(String(ta.start_time)),
      endHour: timeToHour(String(ta.end_time)),
      dayOfWeek: ta.day_of_week,
    })
  }

  logs.push({
    level: 'info',
    message: `Data loaded: ${pending.length} pending programs, ${existing.length} existing sessions, ${teachers.length} teachers, ${rooms.length} rooms`,
  })

  if (pending.length === 0) {
    return {
      scheduled: [], unscheduled: [], alreadyScheduled: [], perDay: [],
      score: 0, stats: { attempts: 0, backtracks: 0, elapsed: 0 },
      quota: new Map(), linked: new Map(), logs,
    }
  }

  // Weekly quota per requirement: sessions_per_week minus sessions already linked (SCHED-004).
  const quota = new Map<number, number>()
  const linked = new Map<number, number>()
  const remaining = new Map<number, number>()
  const alreadyScheduled: number[] = []
  for (const sp of pending) {
    const perWeek = sp.sessions_per_week ?? 1
    const have = existing.filter(s => s.student_program_id === sp.id).length
    quota.set(sp.id, perWeek)
    linked.set(sp.id, have)
    remaining.set(sp.id, perWeek - have)
    if (perWeek - have <= 0) alreadyScheduled.push(sp.id)
  }

  if (scope === 'selected-day') {
    const date = sessionDate ?? dateForDay(dayOfWeek)
    const eligible = pending.filter(sp =>
      remaining.get(sp.id)! > 0 &&
      !occupied.some(s => s.student_program_id === sp.id && s.day_of_week === dayOfWeek)
    )
    const result: ScheduleResult = eligible.length > 0
      ? solveDay(eligible, programs, teachers, rooms, occupied, studentAvailMap, teacherAvailMap, config, dayOfWeek, startedAt, logs)
      : { assignments: [], unscheduled: [], score: 0, stats: { attempts: 0, backtracks: 0, elapsed: 0 } }
    const scheduled = result.assignments.map(a => ({ ...a, dayOfWeek, sessionDate: date }))

    return {
      scheduled,
      unscheduled: result.unscheduled,
      alreadyScheduled,
      perDay: [{ dayOfWeek, sessionDate: date, score: result.score, scheduled: scheduled.map(a => a.studentProgramId), unscheduled: result.unscheduled }],
      score: result.score,
      stats: result.stats,
      quota, linked, logs,
    }
  }

  // ── Whole week: Mon→Fri, one shared budget, decrement the quota per assignment ──
  const scheduled: Assignment[] = []
  const perDay: DayResult[] = []
  const reasons = new Map<number, UnscheduledItem>()
  let score = 0
  let backtracks = 0
  let attempts = 0

  for (let d = 0; d < 5; d++) {
    const date = dateForDay(d, sessionDate)
    const eligible = pending.filter(sp =>
      remaining.get(sp.id)! > 0 &&
      !occupied.some(s => s.student_program_id === sp.id && s.day_of_week === d)
    )
    const dayScheduled: number[] = []
    let dayUnscheduled: UnscheduledItem[] = []
    let dayScore = 0

    if (eligible.length > 0) {
      const result = solveDay(eligible, programs, teachers, rooms, occupied, studentAvailMap, teacherAvailMap, config, d, startedAt, logs)
      dayScore = result.score
      backtracks += result.stats.backtracks
      attempts = Math.max(attempts, result.stats.attempts)
      for (const a of result.assignments) {
        scheduled.push({ ...a, dayOfWeek: d, sessionDate: date })
        dayScheduled.push(a.studentProgramId)
        remaining.set(a.studentProgramId, remaining.get(a.studentProgramId)! - 1)
      }
      dayUnscheduled = result.unscheduled
      for (const u of result.unscheduled) reasons.set(u.studentProgramId, u)
    }

    score += dayScore
    perDay.push({ dayOfWeek: d, sessionDate: date, score: dayScore, scheduled: dayScheduled, unscheduled: dayUnscheduled })
  }

  const unscheduled: UnscheduledItem[] = pending
    .filter(sp => remaining.get(sp.id)! > 0)
    .map(sp => {
      const done = quota.get(sp.id)! - remaining.get(sp.id)!
      const base = reasons.get(sp.id) || { studentProgramId: sp.id, studentId: sp.student_id, reason: 'No valid slot found' }
      return done > 0
        ? { studentProgramId: sp.id, studentId: sp.student_id, reason: `Weekly quota not fully met (${done}/${quota.get(sp.id)})` }
        : base
    })

  return {
    scheduled, unscheduled, alreadyScheduled, perDay, score,
    stats: { attempts, backtracks, elapsed: Date.now() - startedAt },
    quota, linked, logs,
  }
}

// ─── Deno Serve Handler ──────────────────────────────────────────────────────

// Out-of-range values are capped or dropped, never rejected: existing callers keep working.
function clampConfig(config: Partial<SchedulerConfig>): Partial<SchedulerConfig> {
  const out = { ...config }
  if (typeof out.maxBacktrackDepth === 'number' && out.maxBacktrackDepth > 5000) out.maxBacktrackDepth = 5000
  if (typeof out.timeBudgetMs === 'number' && out.timeBudgetMs > 15000) out.timeBudgetMs = 15000
  if (typeof out.retryAttempts === 'number' && out.retryAttempts > 3) out.retryAttempts = 3
  const slot = out.slotIncrementHours
  if (slot !== undefined && ![0.25, 0.5, 1].includes(slot)) {
    delete out.slotIncrementHours
  }
  return out
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ success: false, error: 'Missing authorization header' }, 401, req)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify the caller before the service-role client is built or any row is read
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return json({ success: false, error: 'Invalid or expired token' }, 401, req)
    }

    const { data: roleData } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const { data: profileData } = await userClient
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .single()

    const allowedRoles = ['admin', 'superadmin', 'teacher', 'therapist']
    if (!roleData || !allowedRoles.includes(roleData.role) || profileData?.is_active === false) {
      return json({ success: false, error: 'Insufficient permissions' }, 403, req)
    }

    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    let body: {
      dayOfWeek?: number
      dryRun?: boolean
      config?: Partial<SchedulerConfig>
      scope?: string
      sessionDate?: string
      studentProgramIds?: unknown
    }
    try {
      body = (await req.json()) ?? {}
    } catch {
      return json({ success: false, error: 'Malformed JSON body' }, 400, req)
    }

    const dayOfWeek: number = body.dayOfWeek ?? getCurrentDayOfWeek()
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 4) {
      return json({ success: false, error: 'Scheduling is Monday–Friday only' }, 422, req)
    }

    const rawIds = body.studentProgramIds
    if (rawIds !== undefined && (!Array.isArray(rawIds) || rawIds.length > 500 || !rawIds.every(id => Number.isInteger(id) && id > 0))) {
      return json({ success: false, error: 'studentProgramIds must be an array of positive integers' }, 422, req)
    }

    const scope: Scope = body.scope === 'whole-week' ? 'whole-week' : 'selected-day'
    const dryRun: boolean = body.dryRun ?? false
    const userConfig: Partial<SchedulerConfig> =
      body.config && typeof body.config === 'object' ? clampConfig(body.config) : {}
    const sessionDate = typeof body.sessionDate === 'string' ? body.sessionDate : undefined

    const output = await runSmartScheduler(
      supabase,
      { dayOfWeek, scope, sessionDate, studentProgramIds: rawIds as number[] | undefined },
      userConfig,
    )

    // ── Persist if not dry run ── (B2: no success without written rows)
    let created: Array<{ id: number; student_program_id: number | null; day_of_week: number }> = []

    if (!dryRun && output.scheduled.length > 0) {
      const { data, error: insertError } = await supabase
        .from('sessions')
        .insert(output.scheduled.map(a => ({
          title: `Auto: ${a.programName}`,
          therapist_id: a.teacherId,
          student_ids: [a.studentId],
          room: a.room,
          start_hour: a.startHour,
          span: a.duration,
          type: a.type,
          program_id: a.programId,
          student_program_id: a.studentProgramId,
          day_of_week: a.dayOfWeek,
          session_date: a.sessionDate,
          is_confirmed: false,
        })), { ignoreDuplicates: true })
        .select('id, student_program_id, day_of_week')

      if (insertError) {
        console.error('Auto scheduler insert failed:', insertError.message)
        return json({ success: false, error: 'Failed to save schedule' }, 500, req)
      }

      created = data ?? []
      const keyOf = (studentProgramId: number | null, dayOfWeek: number) => `${studentProgramId}:${dayOfWeek}`

      // Only a fully met weekly quota leaves the Pending tab (B8).
      const createdPerProgram = new Map<number, number>()
      for (const r of created) {
        if (r.student_program_id == null) continue
        createdPerProgram.set(r.student_program_id, (createdPerProgram.get(r.student_program_id) ?? 0) + 1)
      }
      const completeIds = [...createdPerProgram.keys()].filter(id =>
        (output.linked.get(id) ?? 0) + createdPerProgram.get(id)! >= (output.quota.get(id) ?? 1)
      )
      if (completeIds.length > 0) {
        await supabase.from('student_programs').update({ status: 'scheduled' }).in('id', completeIds)
      }

      const assignmentByKey = new Map(output.scheduled.map(a => [keyOf(a.studentProgramId, a.dayOfWeek!), a] as [string, Assignment]))
      if (created.length > 0) {
        await supabase.from('session_scheduling_log').insert(created.map(r => {
          const a = assignmentByKey.get(keyOf(r.student_program_id, r.day_of_week))
          return {
            student_program_id: r.student_program_id,
            status: 'success',
            attempt_number: output.stats.attempts,
            metadata: { score: output.score, room: a?.room, teacher: a?.teacherId, startHour: a?.startHour },
          }
        }))
      }
      if (output.unscheduled.length > 0) {
        await supabase.from('session_scheduling_log').insert(output.unscheduled.map(u => ({
          student_program_id: u.studentProgramId,
          status: 'failed',
          failure_reason: u.reason,
          attempt_number: output.stats.attempts,
        })))
      }
      output.logs.push({ level: 'info', message: `Inserted ${created.length} of ${output.scheduled.length} sessions` })
    }

    const createdIds = new Map(created.map(r => [`${r.student_program_id}:${r.day_of_week}`, r.id] as [string, number]))
    const scheduled = output.scheduled
      .map(a => ({ ...a, sessionId: dryRun ? null : createdIds.get(`${a.studentProgramId}:${a.dayOfWeek}`) ?? null }))
      .filter(a => dryRun || a.sessionId !== null)

    return json({
      success: true,
      dryRun,
      dayOfWeek,
      scope,
      score: output.score,
      scheduled,
      unscheduled: output.unscheduled,
      alreadyScheduled: output.alreadyScheduled,
      perDay: output.perDay,
      stats: output.stats,
      logs: output.logs.filter(l => l.level !== 'debug'),
    }, 200, req)
  } catch (error) {
    console.error('Auto scheduler error:', (error as Error).message)
    return json({ success: false, error: 'Internal error' }, 500, req)
  }
})