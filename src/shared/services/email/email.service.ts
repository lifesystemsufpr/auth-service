import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { EmailConfig } from 'src/shared/config/config.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.getOrThrow<EmailConfig>('email');

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.password },
    });

    this.fromAddress = `${config.fromName} <${config.from}>`;
  }

  async sendPasswordRecoveryEmail(
    toEmail: string,
    userName: string,
    recoveryLink: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: toEmail,
        subject: 'Recuperação de Senha',
        html: this.buildRecoveryEmailHtml(userName, recoveryLink),
      });
      this.logger.log(`Password recovery email sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send recovery email to ${toEmail}`, error);
      throw error;
    }
  }

  private buildRecoveryEmailHtml(userName: string, recoveryLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background-color: #2d5a7b; color: #fff; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; color: #333; }
            .content p { line-height: 1.6; margin: 10px 0; }
            .cta-button { display: inline-block; padding: 12px 30px; margin: 20px 0; background-color: #2d5a7b; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold; }
            .footer { background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .link-text { word-break: break-all; color: #2d5a7b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Recuperação de Senha</h1></div>
            <div class="content">
              <p>Olá ${userName},</p>
              <p>Você solicitou a recuperação de senha. Clique no botão abaixo para redefinir:</p>
              <a href="${recoveryLink}" class="cta-button">Redefinir Senha</a>
              <p>Ou acesse o link: <span class="link-text">${recoveryLink}</span></p>
              <p><strong>Este link expira em 24 horas.</strong></p>
              <p>Se você não solicitou essa ação, ignore este e-mail.</p>
            </div>
            <div class="footer"><p>Este é um e-mail automático, não responda.</p></div>
          </div>
        </body>
      </html>
    `;
  }
}
