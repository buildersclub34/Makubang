import { db } from '../db';
import { users, emailVerificationTokens } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { addHours } from 'date-fns';
import { EmailService } from './email-service';
import { logger } from '../utils/logger';
import { InternalServerError, NotFoundError, BadRequestError } from '../middleware/error-handler';

const TOKEN_EXPIRY_HOURS = 24; // 24 hours expiry for verification links

export class EmailVerificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Generate and send verification email
   */
  async sendVerificationEmail(userId: string, email: string, name?: string) {
    // Check if user is already verified
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { emailVerified: true },
    });

    if (user?.emailVerified) {
      throw new BadRequestError('Email is already verified');
    }

    // Generate verification token
    const token = uuidv4();
    const expiresAt = addHours(new Date(), TOKEN_EXPIRY_HOURS);

    // Store token in database
    await db.insert(emailVerificationTokens)
      .values({
        token,
        userId,
        email,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: emailVerificationTokens.userId,
        set: {
          token,
          email,
          expiresAt,
          updatedAt: new Date(),
        },
      });

    // Send verification email
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
    
    try {
      await this.emailService.send({
        to: email,
        subject: 'Verify your email address',
        template: 'verify-email',
        data: {
          name: name || 'there',
          verificationUrl,
          expiryHours: TOKEN_EXPIRY_HOURS,
        },
      });
    } catch (error) {
      logger.error('Failed to send verification email', { error, userId, email });
      throw new InternalServerError('Failed to send verification email');
    }

    return { success: true };
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string) {
    // Find and validate token
    const verification = await db.query.emailVerificationTokens.findFirst({
      where: and(
        eq(emailVerificationTokens.token, token),
        gt(emailVerificationTokens.expiresAt, new Date())
      ),
    });

    if (!verification) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    // Update user's email verification status
    const [user] = await db.update(users)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, verification.userId))
      .returning();

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Delete used token
    await db.delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));

    return { success: true, user };
  }

  /**
   * Check if a user's email is verified
   */
  async isEmailVerified(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { emailVerified: true },
    });

    return user?.emailVerified || false;
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { email: true, name: true, emailVerified: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestError('Email is already verified');
    }

    return this.sendVerificationEmail(userId, user.email, user.name || undefined);
  }
}

// Example usage:
/*
const emailVerificationService = new EmailVerificationService();

// Send verification email
await emailVerificationService.sendVerificationEmail('user-123', 'user@example.com', 'John Doe');

// Verify email with token
await emailVerificationService.verifyEmail('verification-token-123');

// Check if email is verified
const isVerified = await emailVerificationService.isEmailVerified('user-123');

// Resend verification email
await emailVerificationService.resendVerificationEmail('user-123');
*/
