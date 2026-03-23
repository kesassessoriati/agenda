import nodemailer from "nodemailer";

import { env, smtpEnabled } from "../config/env.js";

function createTransport() {
  if (!smtpEnabled) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export { smtpEnabled };

export async function sendAccountCreatedEmail(options: {
  to: string;
  name: string;
  email: string;
  password: string;
  workspaceName: string;
  loginUrl: string;
  invitedByName: string;
}) {
  const transport = createTransport();

  if (!transport) {
    return { sent: false, reason: "SMTP não configurado." };
  }

  const from = env.SMTP_FROM ?? env.SMTP_USER;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a;">Conta criada no workspace ${options.workspaceName}</h2>
      <p>Olá, <strong>${options.name}</strong>.</p>
      <p>
        <strong>${options.invitedByName}</strong> criou uma conta para você no workspace
        <strong>${options.workspaceName}</strong>. Use os dados abaixo para acessar a plataforma:
      </p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; font-weight: bold; width: 40%;">E-mail</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${options.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; font-weight: bold;">Senha</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${options.password}</td>
        </tr>
      </table>
      <p>
        <a href="${options.loginUrl}" style="
          display: inline-block;
          padding: 10px 20px;
          background: #1d4ed8;
          color: #fff;
          text-decoration: none;
          font-weight: bold;
        ">Acessar plataforma</a>
      </p>
      <p style="color: #64748b; font-size: 13px;">
        Por segurança, altere sua senha após o primeiro acesso. Não compartilhe suas credenciais.
      </p>
    </div>
  `;

  await transport.sendMail({
    from,
    to: options.to,
    subject: `Sua conta foi criada no workspace ${options.workspaceName}`,
    html,
  });

  return { sent: true };
}
