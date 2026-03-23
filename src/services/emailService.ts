import { Resend } from 'resend';
import { config } from '../config/config';

const resend = new Resend(config.resendApiKey);

const FROM = 'Conecta Marceneiro <noreply@conectamarceneiro.com.br>';
const APP_URL = config.appUrl;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#111827;border-radius:16px 16px 0 0;padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background:#DC2626;border-radius:8px;padding:8px 10px;vertical-align:middle;">
                      <span style="font-size:18px;">🪵</span>
                    </span>
                    <span style="color:#fff;font-size:18px;font-weight:900;margin-left:10px;vertical-align:middle;">Conecta</span><span style="color:#DC2626;font-size:18px;font-weight:900;vertical-align:middle;">Marceneiro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-radius:0 0 16px 16px;padding:24px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                © ${new Date().getFullYear()} Conecta Marceneiro — Uma iniciativa M&amp;F Planejados<br/>
                <a href="${APP_URL}/privacidade" style="color:#9ca3af;">Política de Privacidade</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/termos" style="color:#9ca3af;">Termos de Uso</a>
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

function button(text: string, url: string, color = '#DC2626'): string {
  return `<a href="${url}" style="display:inline-block;background:${color};color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;margin-top:8px;">${text}</a>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#111827;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;">${text}</p>`;
}

function infoBox(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
      <span style="font-size:13px;color:#9ca3af;">${label}</span><br/>
      <span style="font-size:15px;font-weight:700;color:#111827;">${value}</span>
    </td>
  </tr>`;
}

// ─── Email Senders ─────────────────────────────────────────────────────────────

export class EmailService {

  // 1. Email de boas-vindas + verificação
  static async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${APP_URL}/auth/verify-email?token=${token}`;

    const html = baseTemplate(`
      ${heading(`Bem-vindo, ${name}! 👋`)}
      ${paragraph('Sua conta no Conecta Marceneiro foi criada. Para ativá-la, confirme seu endereço de e-mail clicando no botão abaixo.')}
      <div style="text-align:center;margin:32px 0;">
        ${button('Confirmar meu e-mail', verifyUrl)}
      </div>
      ${paragraph('<span style="font-size:13px;color:#9ca3af;">Este link expira em 24 horas. Se você não criou esta conta, ignore este e-mail.</span>')}
    `);

    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Confirme seu e-mail — Conecta Marceneiro',
      html,
    });
  }

  // 2. Reset de senha
  static async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

    const html = baseTemplate(`
      ${heading('Redefinir sua senha 🔑')}
      ${paragraph(`Olá, ${name}. Recebemos uma solicitação para redefinir a senha da sua conta.`)}
      <div style="text-align:center;margin:32px 0;">
        ${button('Redefinir minha senha', resetUrl, '#111827')}
      </div>
      ${paragraph('<span style="font-size:13px;color:#9ca3af;">Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este e-mail — sua senha continua a mesma.</span>')}
    `);

    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Redefinição de senha — Conecta Marceneiro',
      html,
    });
  }

  // 3. Novo orçamento recebido (para o cliente)
  static async sendNewQuoteEmail(params: {
    to: string;
    clientName: string;
    professionalName: string;
    serviceName: string;
    value: number;
    estimatedDays: number;
  }): Promise<void> {
    const { to, clientName, professionalName, serviceName, value, estimatedDays } = params;

    const html = baseTemplate(`
      ${heading('Você recebeu um novo orçamento! 📋')}
      ${paragraph(`Olá, ${clientName}. <strong>${professionalName}</strong> enviou um orçamento para o seu serviço.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        ${infoBox('Serviço', serviceName)}
        ${infoBox('Profissional', professionalName)}
        ${infoBox('Valor proposto', `R$ ${value.toFixed(2).replace('.', ',')}`)}
        ${infoBox('Prazo estimado', `${estimatedDays} dia${estimatedDays !== 1 ? 's' : ''} úteis`)}
      </table>
      <div style="text-align:center;margin:32px 0;">
        ${button('Ver orçamento no app', APP_URL)}
      </div>
      ${paragraph('<span style="font-size:13px;color:#9ca3af;">Abra o app para ver todos os detalhes, fazer perguntas e aceitar o orçamento.</span>')}
    `);

    await resend.emails.send({
      from: FROM,
      to,
      subject: `Novo orçamento de ${professionalName} — Conecta Marceneiro`,
      html,
    });
  }

  // 4. Orçamento aceito (para o profissional)
  static async sendQuoteAcceptedEmail(params: {
    to: string;
    professionalName: string;
    clientName: string;
    serviceName: string;
    value: number;
  }): Promise<void> {
    const { to, professionalName, clientName, serviceName, value } = params;

    const html = baseTemplate(`
      ${heading('Seu orçamento foi aceito! 🎉')}
      ${paragraph(`Ótima notícia, ${professionalName}! <strong>${clientName}</strong> aceitou seu orçamento.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        ${infoBox('Serviço', serviceName)}
        ${infoBox('Cliente', clientName)}
        ${infoBox('Valor acordado', `R$ ${value.toFixed(2).replace('.', ',')}`)}
        ${infoBox('Seu recebimento (90%)', `R$ ${(value * 0.9).toFixed(2).replace('.', ',')}`)}
      </table>
      <div style="text-align:center;margin:32px 0;">
        ${button('Ver detalhes no app', APP_URL)}
      </div>
      ${paragraph('<span style="font-size:13px;color:#9ca3af;">Acesse o app para combinar os próximos passos com o cliente via chat.</span>')}
    `);

    await resend.emails.send({
      from: FROM,
      to,
      subject: `Orçamento aceito por ${clientName} — Conecta Marceneiro`,
      html,
    });
  }

  // 5. Orçamento recusado (para o profissional)
  static async sendQuoteRejectedEmail(params: {
    to: string;
    professionalName: string;
    clientName: string;
    serviceName: string;
  }): Promise<void> {
    const { to, professionalName, clientName, serviceName } = params;

    const html = baseTemplate(`
      ${heading('Orçamento não aprovado')}
      ${paragraph(`Olá, ${professionalName}. Infelizmente, ${clientName} optou por outro orçamento para o serviço <strong>${serviceName}</strong>.`)}
      ${paragraph('Não desanime! Novos serviços aparecem constantemente na plataforma. Continue enviando propostas e acumulando avaliações.')}
      <div style="text-align:center;margin:32px 0;">
        ${button('Ver novos serviços', APP_URL, '#111827')}
      </div>
    `);

    await resend.emails.send({
      from: FROM,
      to,
      subject: `Atualização de orçamento — Conecta Marceneiro`,
      html,
    });
  }

  // 6. Pagamento confirmado (para o cliente)
  static async sendPaymentConfirmedClientEmail(params: {
    to: string;
    clientName: string;
    serviceName: string;
    professionalName: string;
    amount: number;
    method: string;
  }): Promise<void> {
    const { to, clientName, serviceName, professionalName, amount, method } = params;
    const methodLabel = method === 'pix' ? 'PIX' : method === 'credit_card' ? 'Cartão de Crédito' : method;

    const html = baseTemplate(`
      ${heading('Pagamento confirmado ✅')}
      ${paragraph(`Olá, ${clientName}. Recebemos o seu pagamento com sucesso!`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        ${infoBox('Serviço', serviceName)}
        ${infoBox('Profissional', professionalName)}
        ${infoBox('Valor pago', `R$ ${amount.toFixed(2).replace('.', ',')}`)}
        ${infoBox('Forma de pagamento', methodLabel)}
        ${infoBox('Status', 'Retido — será liberado após conclusão do serviço')}
      </table>
      ${paragraph('O valor fica em custódia e só será liberado ao profissional após você confirmar a conclusão do serviço.')}
      <div style="text-align:center;margin:32px 0;">
        ${button('Acompanhar no app', APP_URL)}
      </div>
    `);

    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Pagamento confirmado — Conecta Marceneiro',
      html,
    });
  }

  // 7. Serviço concluído e pagamento liberado (para o profissional)
  static async sendPaymentReleasedProfessionalEmail(params: {
    to: string;
    professionalName: string;
    serviceName: string;
    clientName: string;
    grossAmount: number;
    netAmount: number;
  }): Promise<void> {
    const { to, professionalName, serviceName, clientName, grossAmount, netAmount } = params;

    const html = baseTemplate(`
      ${heading('Pagamento liberado para saque! 💸')}
      ${paragraph(`Ótimas notícias, ${professionalName}! O serviço foi confirmado por ${clientName} e o pagamento está disponível.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        ${infoBox('Serviço concluído', serviceName)}
        ${infoBox('Valor bruto', `R$ ${grossAmount.toFixed(2).replace('.', ',')}`)}
        ${infoBox('Taxa da plataforma (10%)', `R$ ${(grossAmount * 0.1).toFixed(2).replace('.', ',')}`)}
        ${infoBox('Seu valor líquido (90%)', `R$ ${netAmount.toFixed(2).replace('.', ',')}`)}
      </table>
      ${paragraph('O valor está disponível para saque no app. O processamento leva até 1 dia útil.')}
      <div style="text-align:center;margin:32px 0;">
        ${button('Sacar agora', APP_URL)}
      </div>
    `);

    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Pagamento disponível para saque — Conecta Marceneiro',
      html,
    });
  }
}
