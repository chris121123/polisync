// Read-only runtime probes shared by the IT Operations Dashboard and System Health.
import { supabase } from '../lib/supabase';

// Canonical count list: the dashboard KPI, the wipe preview and the export panel
// all read the same tables.
export const COUNT_TABLES = [
  { table: 'profiles', label: 'Profiles' },
  { table: 'students', label: 'Students' },
  { table: 'sessions', label: 'Sessions' },
  { table: 'audit_logs', label: 'Audit log' },
];

// A channel exists once the provider has subscribed; its state is the real
// client state, never a guess.
export const getRealtimeState = () => {
  if (!supabase) return 'Unavailable';
  const channels = supabase.getChannels?.() ?? [];
  const channel = channels.find(c => c.topic?.includes('system-changes'));
  return channel ? (channel.state || 'Unknown') : 'Not connected';
};

// Client round-trip: three trivial reads, averaged. Not a server-side metric.
export const pingDatabase = async () => {
  if (!supabase) return { status: 'unverified', latency: null };
  const samples = [];
  try {
    for (let i = 0; i < 3; i++) {
      const started = performance.now();
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) return { status: 'unverified', latency: null };
      samples.push(performance.now() - started);
    }
  } catch {
    return { status: 'unverified', latency: null };
  }
  return { status: 'online', latency: Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) };
};

// Exact row counts in parallel; a table that cannot be counted reads null, never a guess.
export const fetchTableCounts = async (tableList) => {
  if (!supabase) return Object.fromEntries(tableList.map((table) => [table, null]));
  const entries = await Promise.all(tableList.map(async (table) => {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      return [table, error ? null : count];
    } catch {
      return [table, null];
    }
  }));
  return Object.fromEntries(entries);
};
