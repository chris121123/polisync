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
type AppRole = 'admin' | 'parent' | 'teacher' | 'therapist' | 'superadmin'

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
  authHeader: string | null,
): Promise<{ userId: string; role: AppRole } | { status: number; error: string }> {
  if (!authHeader) {
    return { status: 401, error: 'Missing authorization header' }
  }

  // Create a client using the user's JWT to verify their identity
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  
  if (authError || !user) {
    return { status: 401, error: 'Invalid or expired token' }
  }

  // Check admin role from user_roles table using service_role client
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .single()

  if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'superadmin') || profileData?.is_active === false) {
    return { status: 403, error: 'Insufficient permissions' }
  }

  return { userId: user.id, role: roleData.role as AppRole }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Service-role client for admin operations
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Verify the caller is an admin
    const caller = await verifyAdmin(supabase, req.headers.get('Authorization'))
    if ('error' in caller) {
      return json({ success: false, error: caller.error }, caller.status, req)
    }
    const { userId: adminUserId, role: callerRole } = caller

    // 2. Parse and validate request body
    let body: CreateUserRequest
    try {
      body = (await req.json()) ?? {}
    } catch {
      return json({ success: false, error: 'Malformed JSON body' }, 400, req)
    }
    const { email, password, name, role, department, phone } = body

    if (!email || !password || !name || !role) {
      return json({ success: false, error: 'Missing required fields: email, password, name, role' }, 422, req)
    }

    const validRoles: AppRole[] = ['admin', 'parent', 'teacher', 'therapist', 'superadmin']
    if (!validRoles.includes(role)) {
      return json({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, 422, req)
    }

    if (role === 'superadmin' && callerRole !== 'superadmin') {
      return json({ success: false, error: 'Only a superadmin can create a superadmin' }, 403, req)
    }

    // Copy of the form rules in src/pages/admin/UserManagement.jsx; the two are kept in sync by hand.
    if (!/^[A-Za-zÀ-ÿÑñ .,'-]+$/.test(name)) {
      return json({ success: false, error: 'Full name must contain letters only' }, 422, req)
    }

    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      return json({ success: false, error: 'Please enter a valid email address' }, 422, req)
    }

    const normalizedPhone = String(phone ?? '').replace(/[\s-]/g, '')
    if (normalizedPhone && !/^09\d{9}$/.test(normalizedPhone)) {
      return json({ success: false, error: 'Enter a valid PH mobile number (11 digits starting with 09)' }, 422, req)
    }

    // Copy of src/lib/passwordPolicy.js (3 rules: length 8, uppercase, number); the two are kept in sync by hand.
    if (password.length < 8) {
      return json({ success: false, error: 'Password must be at least 8 characters' }, 422, req)
    }

    if (!/[A-Z]/.test(password)) {
      return json({ success: false, error: 'Password must contain at least one uppercase letter' }, 422, req)
    }

    if (!/[0-9]/.test(password)) {
      return json({ success: false, error: 'Password must contain at least one number' }, 422, req)
    }

    // 3. Create user via Supabase Admin API (service_role only)
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm so the user can login immediately
      app_metadata: { role }, // Store role in app_metadata (NOT user_metadata, which is user-editable)
    })

    if (createError) {
      const alreadyRegistered = /already registered|already been registered|already exists/i.test(createError.message)
      return json({ success: false, error: createError.message }, alreadyRegistered ? 409 : 400, req)
    }

    const newUserId = authData.user.id

    // Map app role to display role text
    const roleDisplayMap: Record<AppRole, string> = {
      superadmin: 'Super Administrator',
      admin: 'Administrator',
      teacher: 'Teacher',
      therapist: 'Therapist',
      parent: 'Parent',
    }

    // 4. Create profile row
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: newUserId,
      name,
      role: roleDisplayMap[role] || 'Staff',
      department: department || 'General',
      type: role === 'parent' ? 'Parent' : 'Staff',
      status: 'Active',
      email,
      phone: normalizedPhone || null,
      joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      app_role: role,
      created_by: adminUserId,
      is_active: true,
      must_change_password: true, // Force password change on first login
    }])

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(newUserId)
      return json({ success: false, error: `Profile creation failed: ${profileError.message}` }, 500, req)
    }

    // 5. Create user_roles row
    const { error: roleError } = await supabase.from('user_roles').insert([{
      user_id: newUserId,
      role,
    }])

    if (roleError) {
      // A profile without a role row is a ghost account: roll both back.
      console.error('Role creation failed, rolling back:', roleError.message)
      const { error: profileDeleteError } = await supabase.from('profiles').delete().eq('id', newUserId)
      if (profileDeleteError) console.error('Profile rollback failed:', profileDeleteError.message)
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(newUserId)
      if (authDeleteError) console.error('Auth user rollback failed:', authDeleteError.message)
      return json({ success: false, error: 'Role assignment failed; user rolled back' }, 500, req)
    }

    // 6. Log the creation event
    const { error: auditError } = await supabase.from('audit_logs').insert([{
      action: 'user_created',
      performed_by: adminUserId,
      target_user_id: newUserId,
      details: { email, name, role, department: department || 'General' },
    }])
    if (auditError) console.error('Audit log insert failed:', auditError.message)

    // 7. Return success
    return json({
      success: true,
      ...(auditError ? { auditLogged: false } : {}),
      user: {
        id: newUserId,
        email,
        name,
        role,
        department: department || 'General',
        must_change_password: true,
      },
      message: `User "${name}" created successfully with role "${role}"`,
    }, 200, req)

  } catch (error) {
    console.error('Admin create user error:', (error as Error).message)
    return json({ success: false, error: 'Internal error' }, 500, req)
  }
})
