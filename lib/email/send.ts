import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

/**
 * Send a transactional email. Email failures never break the core flow —
 * they're logged and swallowed.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn('RESEND_API_KEY not set — skipping email:', params.subject);
    return;
  }

  try {
    const from =
      process.env.RESEND_FROM_EMAIL ?? 'CaseForge <onboarding@resend.dev>';
    const { error } = await client.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (error) {
      console.error('Resend error:', error);
    }
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}
