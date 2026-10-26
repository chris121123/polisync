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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  try {
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    if (!supabaseServiceRoleKey || !supabaseUrl) {
      throw new Error('Missing environment variables')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ success: false, error: 'Missing authorization header' }, 401, req)
    }

    // Verify the caller's JWT before the service-role client is used for anything
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user) {
      return json({ success: false, error: 'Invalid or expired token' }, 401, req)
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify user is actually an admin using the user_roles table
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .single()

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'superadmin') || callerProfile?.is_active === false) {
      return json({ success: false, error: 'Insufficient permissions' }, 403, req)
    }

    const callerRole = roleData.role as string

    // Get the target user ID from request body
    const bodyText = await req.text()
    if (!bodyText) {
      return json({ success: false, error: 'Missing required fields: userId' }, 422, req)
    }

    let body: { userId?: string }
    try {
      body = JSON.parse(bodyText) ?? {}
    } catch {
      return json({ success: false, error: 'Malformed JSON body' }, 400, req)
    }

    const { userId } = body
    if (!userId) {
      return json({ success: false, error: 'Missing required fields: userId' }, 422, req)
    }

    // Prevent deleting oneself
    if (userId === user.id) {
      return json({ success: false, error: 'You cannot delete your own account' }, 403, req)
    }

    // Target must exist; getUserById also gives us the email for the audit row
    const { data: targetData, error: targetError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (targetError || !targetData?.user) {
      return json({ success: false, error: 'Target user not found' }, 404, req)
    }

    const { data: targetRoleRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    const targetRole = targetRoleRow?.role ?? null

    if (targetRole === 'superadmin' && callerRole !== 'superadmin') {
      return json({ success: false, error: 'Only a superadmin can delete a superadmin' }, 403, req)
    }

    if (targetRole === 'superadmin') {
      const { count } = await supabaseAdmin
        .from('user_roles')
        .select('user_id', { count: 'exact', head: true })
        .eq('role', 'superadmin')

      if ((count ?? 0) <= 1) {
        return json({ success: false, error: 'Cannot delete the last superadmin' }, 409, req)
      }
    }

    // Audit before the destructive call: no unlogged deletion (fail closed)
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert([{
      action: 'user_deleted',
      performed_by: user.id,
      target_user_id: userId,
      details: { email: targetData.user.email, role: targetRole, outcome: 'pending' },
    }])

    if (auditError) {
      console.error('Audit log insert failed, deletion aborted:', auditError.message)
      return json({ success: false, error: 'Audit log write failed; deletion aborted' }, 500, req)
    }

    // Delete user from auth.users (cascades to profiles)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      const { error: failedAuditError } = await supabaseAdmin.from('audit_logs').insert([{
        action: 'user_deleted',
        performed_by: user.id,
        target_user_id: userId,
        details: { email: targetData.user.email, role: targetRole, outcome: 'failed' },
      }])
      if (failedAuditError) console.error('Failure audit insert failed:', failedAuditError.message)
      return json({ success: false, error: deleteError.message }, 500, req)
    }

    return json({ success: true, message: 'User deleted successfully' }, 200, req)

  } catch (error) {
    console.error('Delete user error:', (error as Error).message)
    return json({ success: false, error: 'Internal error' }, 500, req)
  }
})
