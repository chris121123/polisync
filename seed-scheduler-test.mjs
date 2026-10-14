import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
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

async function seed() {
  console.log('🔍 Checking existing students and programs...');

  // 1. Ensure students exist
  const sampleStudents = [
    { name: 'Lucas Santos', role: 'SPED Student', department: 'SPED', type: 'Student', status: 'Active' },
    { name: 'Mia Garcia', role: 'OT Student', department: 'Rehab', type: 'Student', status: 'Active' },
    { name: 'Noah Reyes', role: 'Speech Student', department: 'Rehab', type: 'Student', status: 'Active' },
  ];

  for (const st of sampleStudents) {
    const { data: existing } = await supabase.from('students').select('id').eq('name', st.name).maybeSingle();
    if (!existing) {
      await supabase.from('students').insert(st);
      console.log(`➕ Created test student: ${st.name}`);
    }
  }

  const { data: allStudents } = await supabase.from('students').select('id, name');
  const { data: allPrograms } = await supabase.from('programs').select('id, name, default_duration_hours');

  if (!allStudents || allStudents.length === 0 || !allPrograms || allPrograms.length === 0) {
    console.error('❌ Missing students or programs in DB.');
    return;
  }

  // 2. Clear old pending or scheduled test rows from student_programs to start clean
  await supabase.from('student_programs').delete().neq('id', 0);
  console.log('🧹 Cleaned existing student_programs for fresh test batch.');

  // 3. Create 4 diverse pending program requirements
  const testRequirements = [
    {
      student_id: allStudents[0].id,
      program_id: allPrograms[0]?.id || 1,
      sessions_per_week: 1,
      preferred_duration_hours: 1.0,
      priority: 8,
      status: 'pending',
      notes: 'Morning individual SPED',
    },
    {
      student_id: allStudents[1 % allStudents.length].id,
      program_id: allPrograms.find(p => p.name.includes('OT'))?.id || allPrograms[1]?.id || 2,
      sessions_per_week: 1,
      preferred_duration_hours: 1.0,
      priority: 6,
      status: 'pending',
      notes: 'Occupational therapy session',
    },
    {
      student_id: allStudents[2 % allStudents.length].id,
      program_id: allPrograms.find(p => p.name.includes('Speech'))?.id || allPrograms[2]?.id || 3,
      sessions_per_week: 1,
      preferred_duration_hours: 1.0,
      priority: 7,
      status: 'pending',
      notes: 'Speech pathology session',
    },
    {
      student_id: allStudents[3 % allStudents.length]?.id || allStudents[0].id,
      program_id: allPrograms.find(p => p.name.includes('Playgroup'))?.id || allPrograms[0]?.id || 1,
      sessions_per_week: 1,
      preferred_duration_hours: 1.5,
      priority: 5,
      status: 'pending',
      notes: 'Group development activity',
    },
  ];

  const { data: inserted, error: insertErr } = await supabase.from('student_programs').insert(testRequirements).select();

  if (insertErr) {
    console.error('❌ Failed to insert test student programs:', insertErr.message);
  } else {
    console.log(`✅ Successfully seeded ${inserted.length} pending student programs!`);
    inserted.forEach((item, idx) => {
      const student = allStudents.find(s => s.id === item.student_id);
      const program = allPrograms.find(p => p.id === item.program_id);
      console.log(`   ${idx + 1}. [${item.status.toUpperCase()}] ${student?.name || 'Student'} -> ${program?.name || 'Program'} (${item.preferred_duration_hours}h, Priority ${item.priority})`);
    });
    console.log('\n👉 Open Calendar (/schedule), select today or any weekday, and click "Auto-Schedule"!');
  }
}

seed();
