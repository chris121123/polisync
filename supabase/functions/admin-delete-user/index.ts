import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    
    if (!supabaseServiceRoleKey || !supabaseUrl) {
      throw new Error('Missing environment variables')
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the user making the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Use regular anon client to verify user's JWT
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Verify user is actually an admin using the user_roles table
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || (roleData?.role !== 'admin' && roleData?.role !== 'superadmin')) {
      throw new Error('Only admins or superadmins can delete users')
    }

    // Get the target user ID from request body
    const bodyText = await req.text()
    if (!bodyText) {
      throw new Error('Request body is empty')
    }
    const { userId } = JSON.parse(bodyText)

    if (!userId) {
      throw new Error('Target user ID is required')
    }

    // Prevent deleting oneself
    if (userId === user.id) {
      throw new Error('You cannot delete your own account')
    }

    // 1. Delete user from auth.users (This will cascade to profiles if constraints are correct)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      throw deleteError
    }

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 so the client can parse the JSON error
      }
    )
  }
})
