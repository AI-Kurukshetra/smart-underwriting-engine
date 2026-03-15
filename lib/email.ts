import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  });
}

export async function sendInviteEmail(params: {
  to: string;
  inviteLink: string;
  workspaceName: string;
  role: string;
  expiresInDays: number;
}): Promise<{ sent: boolean; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) return { sent: false };

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "Aegis";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #4f46e5; margin-bottom: 16px;">You've been invited to join ${params.workspaceName}</h2>
  <p>You've been invited to join <strong>${params.workspaceName}</strong> on Aegis as <strong>${params.role}</strong>.</p>
  <p>Click the link below to accept the invite and get started. This link expires in ${params.expiresInDays} days.</p>
  <p style="margin: 24px 0;">
    <a href="${params.inviteLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Accept invite</a>
  </p>
  <p style="font-size: 14px; color: #6b7280;">Or copy this link: ${params.inviteLink}</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 12px; color: #9ca3af;">Aegis — AI-powered underwriting intelligence platform</p>
</body>
</html>
`;

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: `You're invited to join ${params.workspaceName} on Aegis`,
      html,
    });
    return { sent: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { sent: false, error };
  }
}
