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
  console.log('🔍 Checking database for students and programs...');
  
  const { data: students, error: sErr } = await supabase.from('students').select('id, name').limit(1);
  if (sErr || !students || students.length === 0) {
    console.error('❌ No students found in database. Create a student first.');
    return;
  }
  const student = students[0];

  const { data: programs, error: pErr } = await supabase.from('programs').select('id, name').limit(1);
  if (pErr || !programs || programs.length === 0) {
    console.error('❌ No programs found in database. Create a program first.');
    return;
  }
  const program = programs[0];

  console.log(`📌 Seeding pending program for student "${student.name}" (ID ${student.id}) in program "${program.name}" (ID ${program.id})...`);

  const { data, error } = await supabase.from('student_programs').insert({
    student_id: student.id,
    program_id: program.id,
    sessions_per_week: 1,
    preferred_duration_hours: 1.0,
    priority: 5,
    status: 'pending',
    notes: 'Test pending program for auto-scheduler',
  }).select().single();

  if (error) {
    console.error('❌ Failed to insert pending student program:', error.message);
  } else {
    console.log(`✅ Success! Created pending student program #${data.id}.`);
    console.log('👉 Now open Calendar in the UI and click "Auto-Schedule" to schedule this session!');
  }
}

seed();
