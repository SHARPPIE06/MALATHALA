import nodemailer from 'nodemailer';

/**
 * Sends a 6-digit verification code to the registered email address.
 * Uses SMTP settings if available, otherwise simulates sending by logging to the console.
 */
export async function sendVerificationEmail(email, code, fullName) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'noreply@malathala.com';

  const htmlContent = `
    <div style="font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 40px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(212, 175, 55, 0.2);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4af37; font-size: 28px; letter-spacing: 0.05em; margin: 0; font-family: Georgia, serif;">MALATHALA</h1>
        <p style="color: #9ca3af; font-size: 14px; margin-top: 5px;">Visual Artist Showcase Portal</p>
      </div>
      <div style="background-color: #111827; padding: 30px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 20px;">Email Verification</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin-bottom: 24px;">
          Hello ${fullName},<br/><br/>
          Thank you for registering an account on MALATHALA. To complete your registration and verify your email address, please use the following 6-digit security code:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; background-color: rgba(212, 175, 55, 0.1); border: 1px solid #d4af37; color: #d4af37; font-size: 32px; font-weight: 700; letter-spacing: 0.2em; padding: 12px 30px; border-radius: 8px; font-family: monospace;">
            ${code}
          </span>
        </div>
        <p style="font-size: 12px; line-height: 1.5; color: #9ca3af; margin-top: 24px; margin-bottom: 0;">
          This code is valid for 15 minutes. If you did not register for a MALATHALA account, please ignore this email or contact support.
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280;">
        &copy; 2026 MALATHALA Organization. All rights reserved.
      </div>
    </div>
  `;

  // If SMTP configurations are present, send a real email
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // True for port 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: `"MALATHALA Portal" <${smtpFrom}>`,
        to: email,
        subject: `[MALATHALA] Verify your email address: ${code}`,
        text: `Hello ${fullName}, Your MALATHALA verification code is: ${code}`,
        html: htmlContent
      });

      console.log(`[SMTP] Verification email successfully sent to ${email}`);
      return true;
    } catch (err) {
      console.error('[SMTP ERROR] Failed to send email via SMTP:', err.message);
      // Fallback to console print so application doesn't crash
    }
  }

  // Fallback simulator log
  console.log('\n==================================================================');
  console.log('📬 [EMAIL SIMULATOR] VERIFICATION EMAIL INITIATED');
  console.log(`TO:         ${fullName} <${email}>`);
  console.log(`SUBJECT:    [MALATHALA] Verify your email address`);
  console.log(`CODE:       ${code}`);
  console.log('==================================================================\n');
  return false;
}
