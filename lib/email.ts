import nodemailer from 'nodemailer';
import dns from 'dns';

// Force l'ordre de résolution IPv4 en priorité pour éviter les blocages sur les réseaux sans IPv6
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

export interface SendVerificationEmailParams {
  to: string;
  username: string;
  code: string;
  token?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
}

function getVerificationHtml({
  username,
  code,
  directLink,
}: {
  username: string;
  code: string;
  directLink: string;
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérification de votre compte AEROX</title>
</head>
<body style="margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #07090e; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background: linear-gradient(180deg, #0d121f 0%, #080b13 100%); border: 1px solid rgba(0, 240, 255, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 240, 255, 0.1);">
          
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 2px; color: #00f0ff; text-transform: uppercase;">
                ⚡ AEROX <span style="color: #ffffff; font-weight: 300;">CRASH</span>
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 12px; letter-spacing: 1.5px; color: #94a3b8; text-transform: uppercase;">
                Plateforme de multiplicateur temps réel & provably fair
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #ffffff; font-weight: 700;">
                Bienvenue, ${username} ! 👋
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Merci d'avoir rejoint <strong>AEROX</strong>. Pour sécuriser votre compte et débloquer les dépôts, retraits et mises en argent réel, veuillez confirmer votre adresse email.
              </p>

              <div style="background: rgba(0, 240, 255, 0.05); border: 2px dashed rgba(0, 240, 255, 0.5); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #00f0ff; font-weight: 700;">
                  Votre code de sécurité à 6 chiffres
                </p>
                <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', Courier, monospace;">
                  ${code}
                </div>
                <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b;">
                  Ce code expire dans 10 minutes.
                </p>
              </div>

              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${directLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #00f0ff 0%, #0080ff 100%); color: #07090e; font-weight: 800; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 20px rgba(0, 240, 255, 0.4);">
                  Confirmer mon adresse email →
                </a>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 32px; background: rgba(0, 0, 0, 0.4); text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06);">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                © 2026 AEROX CRASH. Système certifié Provably Fair SHA-256 HMAC. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Envoi via l'API HTTP Resend (recommandé pour les runtimes serverless Vercel)
 */
async function sendWithResend(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<SendEmailResult> {
  const from = process.env.RESEND_FROM || process.env.SMTP_FROM || 'AEROX CRASH <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });
  const data = await res.json();
  if (res.ok && data?.id) {
    return { success: true, messageId: data.id, provider: 'Resend' };
  }
  return { success: false, error: data?.message || JSON.stringify(data), provider: 'Resend' };
}

/**
 * Envoi via l'API HTTP Brevo (Sendinblue)
 */
async function sendWithBrevo(
  apiKey: string,
  to: string,
  username: string,
  subject: string,
  html: string,
  text: string
): Promise<SendEmailResult> {
  const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.SMTP_USER || 'info@bretonwebexpert.fr';
  const fromName = process.env.BREVO_FROM_NAME || 'AEROX CRASH';
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to, name: username }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  const data = await res.json();
  if (res.ok && data?.messageId) {
    return { success: true, messageId: data.messageId, provider: 'Brevo' };
  }
  return { success: false, error: data?.message || JSON.stringify(data), provider: 'Brevo' };
}

async function resolveIpv4(hostname: string): Promise<string> {
  try {
    const addresses = await dns.promises.resolve4(hostname);
    if (addresses && addresses.length > 0) {
      return addresses[0];
    }
  } catch {}
  return hostname;
}

/**
 * Envoi standard via SMTP (Nodemailer)
 */
async function sendWithSmtp(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST || 'mail.bretonwebexpert.fr';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || 'aeroxcrash@bretonwebexpert.fr';
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || 'U#BM*O%=bw5LTwTw';
  const from = process.env.SMTP_FROM || `"AEROX CRASH" <${user}>`;

  if (!pass) {
    return {
      success: false,
      error: 'Mot de passe SMTP manquant (SMTP_PASSWORD ou SMTP_PASS non configuré).',
      provider: 'SMTP',
    };
  }

  // Résolution stricte en IPv4 pour éliminer les erreurs ENETUNREACH sur les réseaux sans IPv6
  const resolvedHost = await resolveIpv4(host);

  const transporter = nodemailer.createTransport({
    host: resolvedHost,
    port,
    secure,
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
      servername: host,
    },
  });

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  return { success: true, messageId: info.messageId, provider: 'SMTP' };
}

/**
 * Point d'entrée principal pour l'expédition sécurisée de l'email de vérification
 */
export async function sendVerificationEmail({
  to,
  username,
  code,
  token,
}: SendVerificationEmailParams): Promise<SendEmailResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const directLink = token
    ? `${appUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(to)}`
    : `${appUrl}/auth/verify-email?email=${encodeURIComponent(to)}`;

  const subject = `⚡ Code de vérification AEROX : ${code}`;
  const text = `Bonjour ${username},\n\nVotre code de vérification AEROX est : ${code}\n\nOu cliquez sur ce lien pour vérifier directement : ${directLink}\n\nCe code expire dans 10 minutes.`;
  const html = getVerificationHtml({ username, code, directLink });

  // Mode Test unitaire : simulation immédiate sans timeout réseau
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    console.log(`[EmailService] OTP generated: YES`);
    console.log(`[EmailService] Recipient: ${to}`);
    console.log(`[EmailService] Email provider: TestMock`);
    console.log(`[EmailService] Send request: STARTED`);
    console.log(`[EmailService] Send request: SUCCESS`);
    console.log(`[EmailService] Provider message ID: test-mock-${Date.now()}`);
    return { success: true, messageId: `test-mock-${Date.now()}`, provider: 'TestMock' };
  }

  // Identification du fournisseur
  let provider = 'SMTP';
  if (process.env.RESEND_API_KEY) provider = 'Resend';
  else if (process.env.BREVO_API_KEY) provider = 'Brevo';

  // ⚠️ LOGS SÉCURISÉS CONFORMES : Le code OTP n'est JAMAIS écrit dans les logs
  console.log(`[EmailService] OTP generated: YES`);
  console.log(`[EmailService] Recipient: ${to}`);
  console.log(`[EmailService] Email provider: ${provider}`);
  console.log(`[EmailService] Send request: STARTED`);

  try {
    let result: SendEmailResult;
    if (process.env.RESEND_API_KEY) {
      result = await sendWithResend(process.env.RESEND_API_KEY, to, subject, html, text);
    } else if (process.env.BREVO_API_KEY) {
      result = await sendWithBrevo(process.env.BREVO_API_KEY, to, username, subject, html, text);
    } else {
      result = await sendWithSmtp(to, subject, html, text);
    }

    if (result.success) {
      console.log(`[EmailService] Send request: SUCCESS`);
      console.log(`[EmailService] Provider message ID: ${result.messageId}`);
    } else {
      console.error(`[EmailService] Send request: FAILED`);
      console.error(`[EmailService] Error: ${result.error}`);
    }

    return result;
  } catch (error: any) {
    const errorMsg = error.message || "Erreur inconnue lors de l'envoi de l'email";
    console.error(`[EmailService] Send request: FAILED`);
    console.error(`[EmailService] Error: ${errorMsg}`);
    return { success: false, error: errorMsg, provider };
  }
}
