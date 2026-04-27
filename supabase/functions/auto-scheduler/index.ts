/**
 * Smart Auto-Scheduler Edge Function
 * 
 * Hybrid scheduler using:
 *   - Backtracking with depth-limited search
 *   - MRV (Most Restrictive Variable) heuristic ordering
 *   - Global scoring to pick the best schedule across retry attempts
 *
 * POST /functions/v1/auto-scheduler
 * Body: { dayOfWeek?: number, dryRun?: boolean, config?: Partial<SchedulerConfig> }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  day_of_week: number
  program_id: number | null
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
  return d === 0 ? 4 : d - 1 // Mon=0 … Fri=4
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
    currentAssignments.pop()
    counters.backtracks++

    // If we already have a perfect score (all scheduled), no need to try more
    if (best.result && best.result.unscheduled.length === 0) return
  }

  // Also try skipping this student-program (it may unlock better assignments later)
  counters.depth++
  solve(ordered, index + 1, currentAssignments, programs, teachers, rooms, existingSessions, studentAvailMap, teacherAvailMap, config, dayOfWeek, best, counters, logs)
}

// ─── Main Orchestrator ───────────────────────────────────────────────────────

async function runSmartScheduler(
  supabase: ReturnType<typeof createClient>,
  dayOfWeek: number,
  userConfig: Partial<SchedulerConfig>,
): Promise<{ result: ScheduleResult; logs: LogEntry[] }> {
  const config: SchedulerConfig = { ...DEFAULT_CONFIG, ...userConfig }
  const logs: LogEntry[] = []

  logs.push({ level: 'info', message: 'Fetching scheduling data...' })

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
    supabase.from('student_programs').select('*').eq('status', 'pending'),
    supabase.from('sessions').select('*').eq('day_of_week', dayOfWeek),
    supabase.from('programs').select('*').eq('is_active', true),
    supabase.from('rooms').select('*'),
    supabase.from('profiles').select('*').in('role', ['Staff', 'Teacher']).eq('status', 'Active'),
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
  const programs: Program[] = (programsData || []).map(p => ({ ...p, id: Number(p.id) }))
  const rooms: Room[] = roomsData || []
  const teachers: Teacher[] = teachersData || []
  const existing: ExistingSession[] = existingSessions || []

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
      result: { assignments: [], unscheduled: [], score: 0, stats: { attempts: 0, backtracks: 0, elapsed: 0 } },
      logs,
    }
  }

  // ── Multi-attempt strategy ──
  const modes: Array<'mrv' | 'reverse' | 'random'> = ['mrv', 'reverse', 'random']
  let globalBest: ScheduleResult | null = null

  for (let attempt = 0; attempt < Math.min(config.retryAttempts, modes.length); attempt++) {
    const mode = modes[attempt]
    logs.push({ level: 'info', message: `Attempt ${attempt + 1}/${config.retryAttempts}: ordering=${mode}` })

    const ordered = orderByHeuristic(pending, programs, studentAvailMap, teachers, mode)
    const best: { result: ScheduleResult | null } = { result: null }
    const counters = { depth: 0, backtracks: 0, startTime: Date.now() }

    solve(ordered, 0, [], programs, teachers, rooms, existing, studentAvailMap, teacherAvailMap, config, dayOfWeek, best, counters, logs)

    if (best.result) {
      best.result.stats.attempts = attempt + 1
      logs.push({
        level: 'info',
        message: `Attempt ${attempt + 1} result: score=${best.result.score}, scheduled=${best.result.assignments.length}, unscheduled=${best.result.unscheduled.length}, backtracks=${best.result.stats.backtracks}`,
      })

      if (!globalBest || best.result.score > globalBest.score) {
        globalBest = best.result
      }

      // Perfect schedule found — stop early
      if (best.result.unscheduled.length === 0) {
        logs.push({ level: 'info', message: 'Perfect schedule found, stopping early' })
        break
      }
    }
  }

  const finalResult = globalBest || {
    assignments: [],
    unscheduled: pending.map(sp => ({ studentProgramId: sp.id, studentId: sp.student_id, reason: 'Solver found no solution' })),
    score: -pending.length * 5,
    stats: { attempts: config.retryAttempts, backtracks: 0, elapsed: 0 },
  }

  return { result: finalResult, logs }
}

// ─── Deno Serve Handler ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json().catch(() => ({}))
    const dayOfWeek: number = body.dayOfWeek ?? getCurrentDayOfWeek()
    const dryRun: boolean = body.dryRun ?? false
    const userConfig: Partial<SchedulerConfig> = body.config ?? {}

    const { result, logs } = await runSmartScheduler(supabase, dayOfWeek, userConfig)

    // ── Persist if not dry run ──
    if (!dryRun && result.assignments.length > 0) {
      const inserts = result.assignments.map(a => ({
        title: `Auto: ${a.programName}`,
        therapist_id: a.teacherId,
        student_ids: [a.studentId],
        room: a.room,
        start_hour: a.startHour,
        span: a.duration,
        type: a.type,
        program_id: a.programId,
        day_of_week: dayOfWeek,
        is_confirmed: false,
      }))

      const { data: created, error: insertError } = await supabase
        .from('sessions')
        .insert(inserts)
        .select()

      if (insertError) {
        logs.push({ level: 'warn', message: `Insert error: ${insertError.message}` })
      } else if (created) {
        // Update student_programs status
        const spIds = result.assignments.map(a => a.studentProgramId)
        await supabase.from('student_programs').update({ status: 'scheduled' }).in('id', spIds)

        // Log each scheduling action
        for (const a of result.assignments) {
          await supabase.from('session_scheduling_log').insert({
            student_program_id: a.studentProgramId,
            status: 'success',
            attempt_number: result.stats.attempts,
            metadata: { score: result.score, room: a.room, teacher: a.teacherId, startHour: a.startHour },
          })
        }
      }

      // Log failures
      for (const u of result.unscheduled) {
        await supabase.from('session_scheduling_log').insert({
          student_program_id: u.studentProgramId,
          status: 'failed',
          failure_reason: u.reason,
          attempt_number: result.stats.attempts,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        dayOfWeek,
        score: result.score,
        scheduled: result.assignments,
        unscheduled: result.unscheduled,
        stats: result.stats,
        logs: logs.filter(l => l.level !== 'debug'),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})