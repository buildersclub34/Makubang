import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor() {
    this.from = process.env.EMAIL_FROM || 'noreply@makubang.com';

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    // Verify connection configuration
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified');
    } catch (error) {
      logger.error('Error verifying SMTP connection', { error });
      throw new Error('Failed to verify SMTP connection');
    }
  }

  public async sendVerificationEmail(email: string, token: string, name: string) {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email Address</h2>
        <p>Hello ${name},</p>
        <p>Thank you for signing up with Makubang! Please verify your email address by clicking the button below:</p>
        <p style="margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Verify Email Address
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>Best regards,<br>The Makubang Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address - Makubang',
      html,
    });
  }

  public async sendPasswordResetEmail(email: string, token: string, name: string) {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have questions.</p>
        <p>Best regards,<br>The Makubang Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request - Makubang',
      html,
    });
  }

  private async sendEmail({ to, subject, html, text }: SendEmailOptions) {
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>?/gm, ''), // Fallback text version
      });

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to,
        subject,
      });

      return info;
    } catch (error) {
      logger.error('Error sending email', { error, to, subject });
      throw new Error('Failed to send email');
    }
  }
}

export const emailService = new EmailService();
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

export interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(emailData: EmailData): Promise<boolean> {
    try {
      const html = this.renderTemplate(emailData.template, emailData.data);

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: emailData.to,
        subject: emailData.subject,
        html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    // Simple template rendering - replace {{variable}} with actual values
    let html = this.getTemplate(template);

    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, data[key] || '');
    });

    return html;
  }

  private getTemplate(templateName: string): string {
    const templates: Record<string, string> = {
      notification: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>{{title}}</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333;">Hello {{name}}!</h2>
            <h3 style="color: #007bff;">{{title}}</h3>
            <p style="color: #666; line-height: 1.6;">{{message}}</p>
            {{#if actionUrl}}
            <div style="margin: 20px 0;">
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Details</a>
            </div>
            {{/if}}
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This is an automated message from Makubang. Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `,
      welcome: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Makubang</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333;">Welcome to Makubang, {{name}}!</h2>
            <p style="color: #666; line-height: 1.6;">Thank you for joining our community. We're excited to have you on board!</p>
            <div style="margin: 20px 0;">
              <a href="{{appUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Get Started</a>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    return templates[templateName] || templates.notification;
  }
}