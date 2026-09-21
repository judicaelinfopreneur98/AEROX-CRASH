import nodemailer from 'nodemailer';
import dns from 'dns';

// Force l'ordre de résolution IPv4 en priorité pour éviter les blocages ENETUNREACH sur les réseaux sans IPv6
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const host = process.env.SMTP_HOST || 'mail.bretonwebexpert.fr';
const port = parseInt(process.env.SMTP_PORT || '465', 10);
const secure = process.env.SMTP_SECURE === 'true' || port === 465;
const user = process.env.SMTP_USER || 'info@bretonwebexpert.fr';
const pass = process.env.SMTP_PASS || 'U#BM*O%=bw5LTwTw';
const from = process.env.SMTP_FROM || '"AEROX CRASH" <info@bretonwebexpert.fr>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 10000,
  auth: {
    user,
    pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export interface SendVerificationEmailParams {
  to: string;
  username: string;
  code: string;
  token?: string;
}

export async function sendVerificationEmail({ to, username, code, token }: SendVerificationEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const directLink = token ? `${appUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(to)}` : `${appUrl}/auth/verify-email?email=${encodeURIComponent(to)}`;

  // Log opérationnel sécurisé sans divulgation du code OTP
  console.log(`[EmailService] Envoi de l'email de vérification à destination de : ${to}`);

  try {

    const htmlContent = `
<!DOCTYPE html>
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
</html>
    `;

    const info = await transporter.sendMail({
      from,
      to,
      subject: `⚡ Code de vérification AEROX : ${code}`,
      text: `Bonjour ${username},\n\nVotre code de vérification AEROX est : ${code}\n\nOu cliquez sur ce lien pour vérifier directement : ${directLink}\n\nCe code expire dans 10 minutes.`,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[EmailService] Échec de l\'envoi de l\'email :', error);
    return { success: false, error: error.message || 'Erreur inconnue lors de l\'envoi de l\'email' };
  }
}
