/**
 * Auto-Scheduler Edge Function
 * 
 * Triggered to automatically generate schedules for pending student programs.
 * Endpoint: POST /functions/v1/auto-scheduler
 * 
 * Body: { dayOfWeek?: number, dryRun?: boolean }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SchedulingSettings {
  min_break_minutes: number
  travel_time_minutes: number
  operating_start_time: string
  operating_end_time: string
  allow_overbook: boolean
  max_daily_hours_per_student: number
}

interface StudentProgram {
  id: string
  student_id: string
  program_id: string
  sessions_per_week: number
  preferred_duration_hours: number | null
  priority: number
  status: string
}

interface Session {
  id: string
  therapist_id: string
  student_ids: string[]
  room: string
  start_hour: number
  span: number
  day_of_week: number
}

const OPERATING_HOURS = { start: 8, end: 17 }

function getCurrentDayOfWeek(): number {
  const day = new Date().getDay()
  return day === 0 ? 0 : day - 1
}

function hourFromTime(time: string): number {
  const [h] = time.split(':').map(Number)
  return h
}

function calculatePriorityScore(sp: StudentProgram, existingSessions: Session[]): number {
  const scheduledCount = existingSessions.filter(s => 
    s.student_ids?.includes(sp.student_id)
  ).length
  const requiredCount = sp.sessions_per_week || 1
  const urgencyScore = requiredCount > scheduledCount
    ? ((requiredCount - scheduledCount) / requiredCount) * 10
    : 0
  const daysRemaining = 5 - getCurrentDayOfWeek()
  const deadlineScore = daysRemaining > 0 ? (1 / daysRemaining) * 5 : 5
  return urgencyScore + deadlineScore
}

function hasConflict(
  slotStart: number,
  slotEnd: number,
  existingSessions: Session[],
  teacherId?: string,
  room?: string
): boolean {
  for (const session of existingSessions) {
    const sessStart = session.start_hour
    const sessEnd = session.start_hour + session.span
    const overlaps = Math.max(slotStart, sessStart) < Math.min(slotEnd, sessEnd)
    
    if (overlaps) {
      if (teacherId && String(session.therapist_id) === String(teacherId)) {
        return true
      }
      if (room && session.room === room) {
        return true
      }
    }
  }
  return false
}

function scoreSlot(slotStart: number): number {
  let score = 10
  score += (12 - slotStart) * 0.5
  return score
}

async function findBestSlotForProgram(
  supabase: ReturnType<typeof createClient>,
  sp: StudentProgram,
  dayOfWeek: number,
  existingSessions: Session[],
  settings: SchedulingSettings | null
): Promise<{ startHour: number; endHour: number; teacherId: string; room: string } | null> {
  const { data: programs } = await supabase
    .from('programs')
    .select('*')
    .eq('id', sp.program_id)
    .single()
  
  if (!programs) return null

  const duration = sp.preferred_duration_hours || programs.default_duration_hours
  const { data: studentAvail } = await supabase
    .from('student_availability')
    .select('*')
    .eq('student_id', sp.student_id)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)

  const { data: rooms } = await supabase.from('rooms').select('*').limit(10)
  const { data: teachers } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['Staff', 'Teacher'])
    .eq('status', 'Active')

  const opStart = settings ? hourFromTime(settings.operating_start_time) : OPERATING_HOURS.start
  const opEnd = settings ? hourFromTime(settings.operating_end_time) : OPERATING_HOURS.end

  const validSlots: Array<{ startHour: number; endHour: number; teacherId: string; room: string; score: number }> = []

  for (const avail of studentAvail || []) {
    const dayStart = Math.max(hourFromTime(String(avail.start_time)), opStart)
    const dayEnd = Math.min(hourFromTime(String(avail.end_time)), opEnd)

    for (let hour = dayStart; hour + duration <= dayEnd; hour += 0.5) {
      for (const teacher of teachers || []) {
        for (const room of rooms || []) {
          if (!hasConflict(hour, hour + duration, existingSessions, teacher.id, room.name)) {
            validSlots.push({
              startHour: hour,
              endHour: hour + duration,
              teacherId: teacher.id,
              room: room.name,
              score: scoreSlot(hour)
            })
          }
        }
      }
    }
  }

  if (validSlots.length === 0) return null

  validSlots.sort((a, b) => b.score - a.score)
  return validSlots[0]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { dayOfWeek = getCurrentDayOfWeek(), dryRun = false } = await req.json()

    const { data: settings } = await supabase
      .from('scheduling_settings')
      .select('*')
      .single()

    const { data: pendingPrograms } = await supabase
      .from('student_programs')
      .select('*')
      .eq('status', 'pending')

    const { data: existingSessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('day_of_week', dayOfWeek)

    const prioritized = (pendingPrograms || []).map(sp => ({
      ...sp,
      priorityScore: calculatePriorityScore(sp, existingSessions || [])
    })).sort((a, b) => b.priorityScore - a.priorityScore)

    const results = {
      scheduled: [] as any[],
      failed: [] as any[],
      totalAttempts: 0
    }

    for (const sp of prioritized) {
      const slot = await findBestSlotForProgram(supabase, sp, dayOfWeek, existingSessions || [], settings)

      if (slot) {
        if (dryRun) {
          results.scheduled.push({ studentProgramId: sp.id, proposedSlot: slot })
        } else {
          const { data, error } = await supabase.from('sessions').insert({
            title: `Auto-scheduled`,
            therapist_id: slot.teacherId,
            student_ids: [sp.student_id],
            room: slot.room,
            start_hour: slot.startHour,
            span: slot.endHour - slot.startHour,
            type: 'sped',
            program_id: sp.program_id,
            day_of_week: dayOfWeek,
            is_confirmed: false
          }).select().single()

          if (!error && data) {
            await supabase.from('student_programs').update({ status: 'scheduled' }).eq('id', sp.id)
            results.scheduled.push({ studentProgramId: sp.id, session: data })
            existingSessions.push(data)
          } else {
            results.failed.push({ studentProgramId: sp.id, reason: error?.message })
          }
        }
      } else {
        results.failed.push({ studentProgramId: sp.id, reason: 'No available slots' })
      }
      results.totalAttempts++
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})