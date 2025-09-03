import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createVerificationToken } from '@/server/services/token-service';
import { emailService } from '@/server/services/email-service';
import { logger } from '@/server/utils/logger';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // For security, don't reveal if the email exists or not
      return NextResponse.json(
        { message: 'If your email exists in our system, you will receive a password reset link' },
        { status: 200 }
      );
    }

    // Create password reset token
    const verificationToken = await createVerificationToken(user.id, 'password');

    // Send password reset email
    await emailService.sendPasswordResetEmail(
      user.email,
      verificationToken.token,
      user.name
    );

    logger.info('Password reset email sent', { userId: user.id });

    return NextResponse.json({
      message: 'If your email exists in our system, you will receive a password reset link',
    });

  } catch (error) {
    logger.error('Error requesting password reset', { error });
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
