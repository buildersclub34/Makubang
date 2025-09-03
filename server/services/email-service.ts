import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

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
