import nodemailer from "nodemailer";

function getTransport() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS } =
    process.env;

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    throw new Error("Missing EMAIL_* environment variables");
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT ?? 587),
    secure: EMAIL_SECURE === "true",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

function emailShell(title: string, bodyHtml: string, ctaLabel: string, ctaUrl: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#111827;padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;">VR TEST BATCH</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h1>
                <div style="font-size:14px;line-height:1.6;color:#374151;">${bodyHtml}</div>
                <a href="${ctaUrl}" style="display:inline-block;margin-top:24px;background:#f97316;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">${ctaLabel}</a>
                <p style="margin-top:24px;font-size:12px;color:#9ca3af;">If the button doesn't work, copy this link into your browser:<br/>${ctaUrl}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${process.env.APP_URL}/api/auth/verify-email?token=${token}`;
  const html = emailShell(
    "Verify your email",
    `Hi ${name},<br/><br/>Thanks for signing up to VR TEST BATCH. Confirm your email address to activate your account.`,
    "Verify Email",
    url,
  );
  const transport = getTransport();
  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Verify your VR TEST BATCH account",
    html,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${process.env.APP_URL}/reset-password?token=${token}`;
  const html = emailShell(
    "Reset your password",
    `Hi ${name},<br/><br/>We received a request to reset your password. This link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    "Reset Password",
    url,
  );
  const transport = getTransport();
  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Reset your VR TEST BATCH password",
    html,
  });
}
