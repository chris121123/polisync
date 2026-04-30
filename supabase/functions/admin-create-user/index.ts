/**
 * Admin Create User — Edge Function
 * 
 * Securely creates new user accounts (admin-only).
 * Uses Supabase Admin API with service_role key.
 * 
 * POST /functions/v1/admin-create-user
 * Body: { email, password, name, role, department? }
 * 
 * Security:
 *   - Validates caller JWT
 *   - Checks caller has admin role in user_roles table
 *   - Uses service_role key for auth.admin.createUser()
 *   - Logs creation to audit_logs
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Types ───────────────────────────────────────────────────────────────────
type AppRole = 'admin' | 'parent' | 'teacher' | 'therapist'

interface CreateUserRequest {
  email: string
  password: string
  name: string
  role: AppRole
  department?: string
  phone?: string
  sendInvite?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function verifyAdmin(
  supabase: ReturnType<typeof createClient>,
  authHeader: string,
): Promise<{ isAdmin: boolean; userId: string | null; error?: string }> {
  // Create a client using the user's JWT to verify their identity
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  
  if (authError || !user) {
    return { isAdmin: false, userId: null, error: 'Invalid or expired token' }
  }

  // Check admin role from user_roles table using service_role client
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleError || roleData?.role !== 'admin') {
    return { isAdmin: false, userId: user.id, error: 'Insufficient permissions: admin role required' }
  }

  return { isAdmin: true, userId: user.id }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Service-role client for admin operations
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Verify the caller is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { isAdmin, userId: adminUserId, error: authError } = await verifyAdmin(supabase, authHeader)
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: authError }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse and validate request body
    const body: CreateUserRequest = await req.json()
    const { email, password, name, role, department, phone } = body

    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: email, password, name, role' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validRoles: AppRole[] = ['admin', 'parent', 'teacher', 'therapist']
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Create user via Supabase Admin API (service_role only)
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm so the user can login immediately
      app_metadata: { role }, // Store role in app_metadata (NOT user_metadata, which is user-editable)
    })

    if (createError) {
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = authData.user.id

    // Map app role to display role text
    const roleDisplayMap: Record<AppRole, string> = {
      admin: 'Administrator',
      teacher: 'Lead Teacher',
      therapist: 'Therapist',
      parent: 'Parent',
    }

    // 4. Create profile row
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: newUserId,
      name,
      role: roleDisplayMap[role] || 'Staff',
      department: department || 'General',
      type: 'Staff',
      status: 'Active',
      email,
      phone: phone || null,
      joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      app_role: role,
      created_by: adminUserId,
      is_active: true,
      must_change_password: true, // Force password change on first login
    }])

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(newUserId)
      return new Response(
        JSON.stringify({ success: false, error: `Profile creation failed: ${profileError.message}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Create user_roles row
    const { error: roleError } = await supabase.from('user_roles').insert([{
      user_id: newUserId,
      role,
    }])

    if (roleError) {
      console.error('Role creation error (non-fatal):', roleError.message)
    }

    // 6. Log the creation event
    await supabase.from('audit_logs').insert([{
      action: 'user_created',
      performed_by: adminUserId,
      target_user_id: newUserId,
      details: { email, name, role, department: department || 'General' },
    }])

    // 7. Return success
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUserId,
          email,
          name,
          role,
          department: department || 'General',
          must_change_password: true,
        },
        message: `User "${name}" created successfully with role "${role}"`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin create user error:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
