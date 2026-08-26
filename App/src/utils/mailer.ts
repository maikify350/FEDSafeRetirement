// @ts-ignore
import nodemailer from 'nodemailer'

/**
 * mailer.ts — FedSafe Retirement Automated Email Service (Google Workspace / SMTP)
 */

interface SendInvitationParams {
  to: string
  recipientName: string
  actionLink?: string | null
  tempPassword?: string | null
  role?: string
}

export function getSmtpTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT) || 465
  const user = process.env.SMTP_USER || 'contact@fedsaferetirement.com'
  const pass = process.env.SMTP_PASS || process.env.GOOGLE_APP_PASSWORD || process.env.SMTP_PASSWORD

  if (!pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user,
      pass,
    },
  })
}

export async function sendInvitationEmail({
  to,
  recipientName,
  actionLink,
  tempPassword,
  role = 'Partner',
}: SendInvitationParams): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const transporter = getSmtpTransporter()
  const fromUser = process.env.SMTP_USER || 'contact@fedsaferetirement.com'
  const fromAddress = process.env.SMTP_FROM || `"FEDSafe Retirement" <${fromUser}>`

  if (!transporter) {
    console.warn('[Mailer] SMTP password is not configured in environment variables (SMTP_PASS or GOOGLE_APP_PASSWORD).')
    return {
      success: false,
      error: 'SMTP credentials not configured on server. Please configure SMTP_PASS in environment variables.',
    }
  }

  const loginUrl = 'https://fedsafe-retirement.vercel.app/login'
  const linkToUse = actionLink || loginUrl

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to FEDSafe Retirement</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#111827;border-radius:12px;border:1px solid #1f2937;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding:32px 36px;background:linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);border-bottom:1px solid #312e81;text-align:center;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;padding:8px 16px;background-color:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.35);border-radius:20px;margin-bottom:16px;">
                      <span style="font-size:11px;font-weight:700;letter-spacing:1px;color:#818cf8;text-transform:uppercase;">
                        🛡️ FEDSafe Retirement · SAM.gov Registered
                      </span>
                    </div>
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                      Welcome to the FEDSafe Portal
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:36px;">
              <p style="font-size:16px;line-height:1.6;color:#cbd5e1;margin-top:0;margin-bottom:20px;">
                Hello <strong>${recipientName || 'there'}</strong>,
              </p>
              
              <p style="font-size:15px;line-height:1.6;color:#94a3b8;margin-bottom:24px;">
                You have been invited to the <strong>FEDSafe Retirement Portal</strong> as a verified <strong>${role}</strong>. Your account gives you access to the Federal Employee Prospecting CRM, Video Producer Studio, and FEGLI benefit calculators.
              </p>

              <!-- Credentials Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#1e293b;border-radius:8px;border:1px solid #334155;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:6px;">
                          Portal Account
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:15px;font-weight:600;color:#ffffff;padding-bottom:12px;">
                          ${to}
                        </td>
                      </tr>
                      ${tempPassword ? `
                      <tr>
                        <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:6px;">
                          Temporary Password
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:15px;font-weight:700;font-family:monospace;color:#38bdf8;">
                          ${tempPassword}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${linkToUse}" target="_blank" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:8px;box-shadow:0 4px 14px rgba(99,102,241,0.4);">
                      Set Password & Access Portal →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;line-height:1.5;color:#64748b;margin-bottom:0;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="${linkToUse}" style="color:#6366f1;word-break:break-all;font-size:12px;">${linkToUse}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px;background-color:#0b0f19;border-top:1px solid #1f2937;text-align:center;">
              <p style="font-size:12px;color:#475569;margin:0 0 6px 0;">
                FEDSafe Retirement · 508-479-7170 · contact@fedsaferetirement.com
              </p>
              <p style="font-size:11px;color:#334155;margin:0;">
                Secure Federal Prospecting Platform · SAM.gov Unique Entity ID Registered
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: 'Welcome to FEDSafe Retirement — Your Portal Access',
      html: htmlContent,
    })

    console.log('[Mailer] Invitation email dispatched successfully to:', to, 'MessageId:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (err: any) {
    console.error('[Mailer Error] Failed to send email via SMTP:', err)
    return { success: false, error: err.message || 'SMTP sending failed' }
  }
}
