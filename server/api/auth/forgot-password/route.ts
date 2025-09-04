import { NextResponse } from 'next/server';
import { db } from '../../db';
import { users, passwordResetTokens } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { sendPasswordResetEmail } from '../../services/email-service';
import { logger } from '../../utils/logger';

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
        { message: 'If an account exists with this email, a password reset link has been sent' },
        { status: 200 }
      );
    }

    // Generate reset token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Store token in database
    await db.insert(passwordResetTokens).values({
      id: uuidv4(),
      userId: user.id,
      token,
      expiresAt,
      createdAt: new Date(),
    });

    // Send password reset email
    await sendPasswordResetEmail(user.email, token);

    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent',
    });
  } catch (error) {
    logger.error('Password reset request failed:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
