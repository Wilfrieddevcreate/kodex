import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email: string, code: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@kodex.com",
    to: email,
    subject: "Kodex - Votre code de vérification",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #14708E; text-align: center;">Kodex</h2>
        <p style="color: #333; font-size: 16px;">Votre code de vérification :</p>
        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.5em; color: #14708E;">${code}</span>
        </div>
        <p style="color: #666; font-size: 14px;">Ce code expire dans 15 minutes.</p>
        <p style="color: #999; font-size: 12px;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
      </div>
    `,
  });
}

export async function sendResetPasswordEmail(email: string, code: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@kodex.com",
    to: email,
    subject: "Kodex - Réinitialisation de mot de passe",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #14708E; text-align: center;">Kodex</h2>
        <p style="color: #333; font-size: 16px;">Votre code de réinitialisation :</p>
        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.5em; color: #14708E;">${code}</span>
        </div>
        <p style="color: #666; font-size: 14px;">Ce code expire dans 15 minutes.</p>
        <p style="color: #999; font-size: 12px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      </div>
    `,
  });
}
