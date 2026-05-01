import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jrxydghwkyjnflbqiffs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyeHlkZ2h3a3lqbmZsYnFpZmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjM4MjcsImV4cCI6MjA5MjMzOTgyN30.Ky7jSSiyhe_ZA37gpS5GEcsq9cbUKVDcPJDYTDwdCGQ'
);

async function promote() {
  // Find all current admins
  const { data: admins, error: fetchError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('role', 'admin');

  if (fetchError) {
    console.error('Error fetching admins:', fetchError.message);
    return;
  }

  if (!admins || admins.length === 0) {
    console.log('No admin accounts found. Checking profiles...');
    
    // Fallback: check profiles table
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, app_role')
      .eq('app_role', 'admin');
    
    if (profiles && profiles.length > 0) {
      console.log('Found admin profiles:', profiles.map(p => `${p.name} (${p.id})`));
      
      for (const profile of profiles) {
        // Update user_roles
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({ user_id: profile.id, role: 'superadmin' }, { onConflict: 'user_id' });
        
        if (roleError) console.error(`Role update failed for ${profile.name}:`, roleError.message);
        
        // Update profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ app_role: 'superadmin', role: 'Super Administrator' })
          .eq('id', profile.id);
        
        if (profileError) console.error(`Profile update failed for ${profile.name}:`, profileError.message);
        
        console.log(`✅ Promoted ${profile.name} to Super Admin`);
      }
    } else {
      console.log('No admin profiles found either.');
    }
    return;
  }

  console.log(`Found ${admins.length} admin account(s). Promoting to superadmin...`);

  for (const admin of admins) {
    // Update user_roles table
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ role: 'superadmin' })
      .eq('user_id', admin.user_id);
    
    if (roleError) {
      console.error(`Failed to update user_roles for ${admin.user_id}:`, roleError.message);
      continue;
    }

    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ app_role: 'superadmin', role: 'Super Administrator' })
      .eq('id', admin.user_id);
    
    if (profileError) {
      console.error(`Failed to update profile for ${admin.user_id}:`, profileError.message);
      continue;
    }

    console.log(`✅ Promoted user ${admin.user_id} to Super Admin`);
  }

  console.log('\nDone! Please refresh your browser and log in again.');
}

promote();
