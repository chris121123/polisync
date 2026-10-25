import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env (same convention as the other one-off scripts)
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const [key, ...vals] = line.trim().split('=');
        if (key === 'VITE_SUPABASE_URL') supabaseUrl = vals.join('=');
        if (key === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = vals.join('=');
      });
    }
  } catch (_e) {}
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Could not find VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PREFIX = 'Mock Student ';
const COUNT = 50;
// All 1-hour programs: 50 sessions fit the 9h x 6 rooms week in one day.
const PROGRAMS = [
  { name: 'SPED - Individual', department: 'SPED' },
  { name: 'OT Therapy', department: 'Rehab' },
  { name: 'Speech Therapy', department: 'Rehab' },
];

const must = ({ error }) => {
  if (error) throw new Error(error.message);
};

async function seed() {
  // RLS only lets an admin write students; demo account documented in .env.example.
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: process.env.SEED_ADMIN_EMAIL ?? 'demo.admin@polikids.test',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'DemoAdmin1!',
  });
  if (authError) throw new Error(`Admin sign-in failed: ${authError.message}`);

  // Replace the previous batch. Sessions go first: sessions.student_ids has no FK.
  const { data: old } = await supabase.from('students').select('id').like('name', `${PREFIX}%`);
  const oldIds = (old ?? []).map(s => s.id);
  if (oldIds.length > 0) {
    must(await supabase.from('sessions').delete().overlaps('student_ids', oldIds));
    must(await supabase.from('student_programs').delete().in('student_id', oldIds));
    must(await supabase.from('students').delete().in('id', oldIds));
    console.log(`🧹 Removed previous batch (${oldIds.length} students)`);
  }

  const { data: programs, error: programError } = await supabase
    .from('programs').select('id, name').in('name', PROGRAMS.map(p => p.name));
  if (programError) throw new Error(programError.message);
  const programId = new Map((programs ?? []).map(p => [p.name, p.id]));
  for (const p of PROGRAMS) {
    if (!programId.has(p.name)) throw new Error(`Missing program "${p.name}" — run the constraint_scheduling migration first`);
  }

  const students = Array.from({ length: COUNT }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return {
      name: `${PREFIX}${n}`,
      role: 'Student',
      department: PROGRAMS[i % PROGRAMS.length].department,
      type: 'Student',
      status: 'Active',
      email: `mock.student.${n}@polikids.test`,
      phone: '',
      joined: 'Oct 2026',
      diagnosis: 'Auto-scheduler mock data',
    };
  });

  const { data: created, error: studentError } = await supabase.from('students').insert(students).select('id, name');
  if (studentError) throw new Error(studentError.message);

  const idByName = new Map(created.map(s => [s.name, s.id]));
  const requirements = students.map((s, i) => ({
    student_id: idByName.get(s.name),
    program_id: programId.get(PROGRAMS[i % PROGRAMS.length].name),
    sessions_per_week: 1,
    preferred_duration_hours: 1,
    priority: 5 + (i % 4),
    status: 'pending',
    notes: 'Mock data for auto-scheduler testing',
  }));

  const { error: requirementError } = await supabase.from('student_programs').insert(requirements);
  if (requirementError) throw new Error(requirementError.message);

  // 50 parent accounts, one linked to each student.
  const parents = students.map((s, i) => {
    const n = String(i + 1).padStart(2, '0');
    return {
      name: `Mock Parent ${n}`,
      email: `mock.parent.${n}@polikids.test`,
      department: 'General',
      studentId: idByName.get(s.name),
    };
  });
  const parentPassword = 'MockParent1!';

  const { data: existingParents } = await supabase
    .from('profiles').select('id, email').in('email', parents.map(p => p.email));
  const parentIdByEmail = new Map((existingParents ?? []).map(p => [p.email, p.id]));

  for (const parent of parents) {
    if (parentIdByEmail.has(parent.email)) continue;
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { email: parent.email, password: parentPassword, name: parent.name, role: 'parent', department: parent.department },
    });
    if (error) {
      let message = error.message;
      try { message = (await error.context.json()).error ?? message; } catch (_e) {}
      throw new Error(`${parent.email}: ${message}`);
    }
    parentIdByEmail.set(parent.email, data.user.id);
  }

  const parentIds = parents.map(p => parentIdByEmail.get(p.email));
  must(await supabase.from('parent_student_relationships').delete().in('parent_id', parentIds));
  must(await supabase.from('parent_student_relationships').insert(
    parents.map(p => ({ parent_id: parentIdByEmail.get(p.email), student_id: p.studentId }))
  ));
  // Test accounts: skip the first-login password change so the shared password works.
  must(await supabase.from('profiles').update({ must_change_password: false }).in('id', parentIds));

  const [teachers, rooms] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).in('app_role', ['teacher', 'therapist']).eq('is_active', true),
    supabase.from('rooms').select('*', { count: 'exact', head: true }),
  ]);

  console.log(`✅ ${created.length} students + ${requirements.length} pending program requirements`);
  console.log(`✅ ${parentIds.length} parents linked 1:1 (password: ${parentPassword})`);
  console.log(`   Prerequisites: ${teachers.count ?? 0} active teachers/therapists, ${rooms.count ?? 0} rooms`);
  if (!teachers.count || !rooms.count) console.warn('⚠️  Auto-schedule needs at least one teacher and one room');
  console.log('\n👉 Open Calendar (/schedule) and click "Auto-Schedule" (whole week schedules all 50).');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
