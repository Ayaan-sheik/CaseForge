interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function wrapHtml(body: string): string {
  return `<div style="font-family: Inter, -apple-system, 'Segoe UI', sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #1e293b;">
  <p style="font-size: 18px; font-weight: 700; color: #4f46e5; margin: 0 0 24px;">CaseForge</p>
  ${body}
  <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">Powered by CaseForge — async audio case studies.</p>
</div>`;
}

/** 1. Campaign Created */
export function campaignCreatedEmail(params: {
  clientName: string;
  link: string;
}): EmailContent {
  const { clientName, link } = params;
  return {
    subject: 'Your CaseForge link is ready',
    text: `Here's your magic link to send to ${clientName}: ${link}\nThey'll answer 3 quick questions — it takes about 90 seconds.`,
    html: wrapHtml(`
      <p style="font-size: 15px; line-height: 1.6;">Here's your magic link to send to <strong>${clientName}</strong>:</p>
      <p style="margin: 20px 0;"><a href="${link}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-size: 14px; font-weight: 600;">Open interview link</a></p>
      <p style="font-size: 13px; color: #64748b; word-break: break-all;">${link}</p>
      <p style="font-size: 15px; line-height: 1.6;">They'll answer 3 quick questions — it takes about 90 seconds.</p>
    `),
  };
}

/** 2. Client Opened Link */
export function clientOpenedEmail(params: {
  clientName: string;
}): EmailContent {
  const { clientName } = params;
  return {
    subject: `✅ ${clientName} just started their interview`,
    text: `Great news — ${clientName} has opened your CaseForge link and begun recording.\nWe'll email you as soon as their case study is ready.`,
    html: wrapHtml(`
      <p style="font-size: 15px; line-height: 1.6;">Great news — <strong>${clientName}</strong> has opened your CaseForge link and begun recording.</p>
      <p style="font-size: 15px; line-height: 1.6;">We'll email you as soon as their case study is ready.</p>
    `),
  };
}

/** 3. Outputs Ready */
export function outputsReadyEmail(params: {
  clientName: string;
  dashboardLink: string;
}): EmailContent {
  const { clientName, dashboardLink } = params;
  return {
    subject: `🎉 Your ${clientName} case study is ready`,
    text: `Your case study for ${clientName} has been generated.\nView it here: ${dashboardLink}`,
    html: wrapHtml(`
      <p style="font-size: 15px; line-height: 1.6;">Your case study for <strong>${clientName}</strong> has been generated.</p>
      <p style="margin: 20px 0;"><a href="${dashboardLink}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-size: 14px; font-weight: 600;">View your case study</a></p>
      <p style="font-size: 13px; color: #64748b; word-break: break-all;">${dashboardLink}</p>
    `),
  };
}
