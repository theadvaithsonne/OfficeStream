import nodemailer from 'nodemailer';

/** Returns a configured nodemailer transporter using SMTP environment variables. */
function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

/** Sends an email. Requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars. */
export async function sendMail(opts: MailOptions): Promise<void> {
  const transporter = createTransport();
  await transporter.sendMail({
    from: `OfficeStream <${process.env.SMTP_USER}>`,
    ...opts,
  });
}

/** Sends a password-reset email containing a one-time link. */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendMail({
    to,
    subject: 'Reset your OfficeStream password',
    html: `
      <p>You requested a password reset. Click the link below (expires in 1 hour):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, ignore this email.</p>
    `,
  });
}
