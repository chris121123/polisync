import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, recipient, message, subject } = await req.json()
    
    // type: 'sms' | 'email' | 'both'
    
    let smsSuccess = false;
    let emailSuccess = false;

    // ── 1. SEMAPHORE SMS ───────────────────────────────────────────────────────
    if (type === 'sms' || type === 'both') {
      const semaphoreApiKey = Deno.env.get('SEMAPHORE_API_KEY');
      if (semaphoreApiKey && recipient.phone) {
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
          console.error('Semaphore API Error:', await smsRes.text());
        }
      } else {
        console.warn('SMS skipped: Missing SEMAPHORE_API_KEY or recipient phone number');
      }
    }

    // ── 2. RESEND EMAIL ────────────────────────────────────────────────────────
    if (type === 'email' || type === 'both') {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      // Use your verified Resend domain. Falls back to the shared testing domain.
      const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

      if (resendApiKey && recipient.email) {
        const emailSubject = subject || 'Polisync Notification';
        const htmlBody = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <title>${emailSubject}</title>
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
                        <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;font-weight:600;">${emailSubject}</h2>
                        <p style="margin:0;color:#475569;font-size:15px;line-height:1.7;">${message}</p>
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
          console.error('Resend API Error:', errBody);
        }
      } else {
        console.warn('Email skipped: Missing RESEND_API_KEY or recipient email');
      }
    }

    return new Response(
      JSON.stringify({ success: true, smsSuccess, emailSuccess }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
