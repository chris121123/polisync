// The only scheduling module that talks to Supabase.

import { supabase } from '../supabase.js';
import { getCurrentDayOfWeek } from './time.js';

/**
 * Calls the Supabase Edge Function `auto-scheduler` for production-grade
 * scheduling with full backtracking and multi-attempt retry.
 *
 * @param {Object} options
 * @param {number} [options.dayOfWeek] - 0=Mon, 4=Fri
 * @param {boolean} [options.dryRun=false] - Preview without persisting
 * @param {Object} [options.config] - Override scheduler config
 * @param {'whole-week'|'selected-day'} [options.scope='selected-day'] - Mon–Fri spread or one day
 * @param {string} [options.sessionDate] - 'YYYY-MM-DD' anchor week / selected date
 * @param {number[]} [options.studentProgramIds] - Subset to schedule; omit = all pending
 * @returns {Promise<Object>} Schedule result with score, assignments, unscheduled
 */
export async function invokeSmartScheduler(options = {}) {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const scope = options.scope ?? 'selected-day';
    const { data, error } = await supabase.functions.invoke('auto-scheduler', {
      body: {
        // Whole-week ignores dayOfWeek; send 0 so a Saturday default is not rejected by validation.
        dayOfWeek: options.dayOfWeek ?? (scope === 'whole-week' ? 0 : getCurrentDayOfWeek()),
        dryRun: options.dryRun ?? false,
        config: options.config ?? {},
        scope,
        sessionDate: options.sessionDate,
        studentProgramIds: options.studentProgramIds,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Smart scheduler invocation failed:', error);
    return { success: false, error: error.message };
  }
}
