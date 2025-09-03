import { db } from '../db';
import { users, passwordResetTokens } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { addHours } from 'date-fns';
import { hashPassword } from '../utils/auth';
import { EmailService } from './email-service';
import { logger } from '../utils/logger';
import { InternalServerError, NotFoundError, BadRequestError } from '../middleware/error-handler';

const TOKEN_EXPIRY_HOURS = 2; // 2 hours expiry for password reset links

export class PasswordResetService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Request a password reset
   */
  async requestPasswordReset(email: string) {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, name: true },
    });

    if (!user) {
      // Don't reveal that the email doesn't exist
      return { success: true };
    }

    // Generate reset token
    const token = uuidv4();
    const expiresAt = addHours(new Date(), TOKEN_EXPIRY_HOURS);

    // Store token in database
    await db.insert(passwordResetTokens)
      .values({
        token,
        userId: user.id,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: passwordResetTokens.userId,
        set: {
          token,
          expiresAt,
          updatedAt: new Date(),
        },
      });

    // Send password reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    
    try {
      await this.emailService.send({
        to: email,
        subject: 'Reset your password',
        template: 'reset-password',
        data: {
          name: user.name || 'there',
          resetUrl,
          expiryHours: TOKEN_EXPIRY_HOURS,
        },
      });
    } catch (error) {
      logger.error('Failed to send password reset email', { error, email });
      throw new InternalServerError('Failed to send password reset email');
    }

    return { success: true };
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string) {
    // Find and validate token
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date())
      ),
    });

    if (!resetToken) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user's password
    const [user] = await db.update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, resetToken.userId))
      .returning();

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Delete used token
    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));

    // Send confirmation email
    try {
      await this.emailService.send({
        to: user.email,
        subject: 'Your password has been reset',
        template: 'password-reset-confirmation',
        data: {
          name: user.name || 'there',
          timestamp: new Date().toLocaleString(),
        },
      });
    } catch (error) {
      logger.error('Failed to send password reset confirmation', { 
        error, 
        userId: user.id 
      });
      // Don't fail the reset if email sending fails
    }

    return { success: true };
  }

  /**
   * Validate a password reset token
   */
  async validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date())
      ),
      with: {
        user: {
          columns: {
            email: true,
          },
        },
      },
    });

    if (!resetToken) {
      return { valid: false };
    }

    return {
      valid: true,
      email: resetToken.user.email,
    };
  }
}

// Example usage:
/*
const passwordResetService = new PasswordResetService();

// Request password reset
await passwordResetService.requestPasswordReset('user@example.com');

// Reset password with token
await passwordResetService.resetPassword('reset-token-123', 'newSecurePassword123!');

// Validate reset token
const { valid, email } = await passwordResetService.validateResetToken('reset-token-123');
if (valid) {
  // Show password reset form
  console.log(`Resetting password for: ${email}`);
} else {
  // Show invalid/expired token message
  console.log('Invalid or expired token');
}
*/
