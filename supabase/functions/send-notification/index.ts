import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.0'

// ─── CORS ────────────────────────────────────────────────────────────────────
// Defence in depth only: curl ignores CORS, so every path below still verifies
// the caller (ADR-003). Unknown origins get no Allow-Origin header (fail closed).
function corsHeaders(req: Request) {
  const allowed = (Deno.env.get('APP_ORIGIN') ?? '').split(',').map(o => o.trim()).filter(Boolean)
  const origin = req.headers.get('Origin') ?? ''
  const ok = allowed.includes(origin)
    || /^http:\/\/localhost:\d+$/.test(origin)
    || /^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(origin)

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

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!)

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ success: false, error: 'Missing authorization header' }, 401, req)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!

    // Service-role client for caller lookup and the recipient allowlist
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return json({ success: false, error: 'Invalid or expired token' }, 401, req)
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .single()

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'superadmin') || callerProfile?.is_active === false) {
      return json({ success: false, error: 'Insufficient permissions' }, 403, req)
    }

    let body
    try {
      body = await req.json()
    } catch {
      return json({ success: false, error: 'Malformed JSON body' }, 400, req)
    }
    const { type, recipient, message, subject } = body ?? {}

    // Recipient allowlist: only an exact match on an existing profile may be messaged
    if (recipient?.email) {
      const { data } = await supabase.from('profiles').select('id').eq('email', recipient.email).limit(1)
      if (!data?.length) {
        return json({ success: false, error: 'Recipient email is not a registered user' }, 422, req)
      }
    }
    if (recipient?.phone) {
      const { data } = await supabase.from('profiles').select('id').eq('phone', recipient.phone).limit(1)
      if (!data?.length) {
        return json({ success: false, error: 'Recipient phone is not a registered user' }, 422, req)
      }
    }

    // type: 'sms' | 'email' | 'both'

    let smsSuccess = false;
    let emailSuccess = false;
    let smsAttempted = false;
    let emailAttempted = false;
    let skipped = false;

    // ── 1. SEMAPHORE SMS ───────────────────────────────────────────────────────
    if (type === 'sms' || type === 'both') {
      const semaphoreApiKey = Deno.env.get('SEMAPHORE_API_KEY');
      if (semaphoreApiKey && recipient.phone) {
        smsAttempted = true;
        const params = new URLSearchParams();
        params.append('apikey', semaphoreApiKey);
        params.append('number', recipient.phone);
        params.append('message', message);
        params.append('sendername', Deno.env.get('SEMAPHORE_SENDER_NAME') || 'POLISYNC');

        const smsRes = await fetch('https://api.semaphore.co/api/v4/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });

        if (smsRes.ok) {
          smsSuccess = true;
        } else {
          const errBody = await smsRes.text();
          console.error('Semaphore API error:', smsRes.status, 'body length:', errBody.length);
        }
      } else {
        if (!semaphoreApiKey) skipped = true;
        console.warn('SMS skipped: Missing SEMAPHORE_API_KEY or recipient phone number');
      }
    }

    // ── 2. RESEND EMAIL ────────────────────────────────────────────────────────
    if (type === 'email' || type === 'both') {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      // Use your verified Resend domain. Falls back to the shared testing domain.
      const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

      if (resendApiKey && recipient.email) {
        emailAttempted = true;
        const emailSubject = subject || 'Polisync Notification';
        const safeSubject = escapeHtml(emailSubject);
        const safeMessage = escapeHtml(message ?? '');
        const htmlBody = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <title>${safeSubject}</title>
          </head>
          <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                          🗓 Polisync
                        </h1>
                        <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">SPED Center Management System</p>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:40px;">
                        <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;font-weight:600;">${safeSubject}</h2>
                        <p style="margin:0;color:#475569;font-size:15px;line-height:1.7;">${safeMessage}</p>
                        <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
                        <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                          This is an automated notification from <strong>Polisync</strong>.<br/>
                          Please do not reply to this email.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                        <p style="margin:0;color:#cbd5e1;font-size:11px;">
                          © ${new Date().getFullYear()} Polisync · SPED Center Management System
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: `Polisync <${fromAddress}>`,
            to: recipient.email,
            subject: emailSubject,
            html: htmlBody
          })
        });

        if (emailRes.ok) {
          emailSuccess = true;
        } else {
          const errBody = await emailRes.text();
          console.error('Resend API error:', emailRes.status, 'body length:', errBody.length);
        }
      } else {
        if (!resendApiKey) skipped = true;
        console.warn('Email skipped: Missing RESEND_API_KEY or recipient email');
      }
    }

    // Both channels tried and both failed is a real failure, not a success
    if (smsAttempted && emailAttempted && !smsSuccess && !emailSuccess) {
      return json({ success: false, smsSuccess, emailSuccess }, 409, req)
    }

    return json({
      success: true,
      smsSuccess,
      emailSuccess,
      ...(skipped ? { skipped: true } : {}),
    }, 200, req)

  } catch (error) {
    console.error('Send notification error:', (error as Error).message);
    return json({ success: false, error: 'Internal error' }, 500, req)
  }
})
