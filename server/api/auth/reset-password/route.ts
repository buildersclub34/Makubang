import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { validateVerificationToken } from '@/server/services/token-service';
import { logger } from '@/server/utils/logger';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate the token
    const verificationToken = await validateVerificationToken(token, 'password');
    
    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset token' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user's password
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, verificationToken.userId));

    logger.info('Password reset successfully', { userId: verificationToken.userId });

    return NextResponse.json({
      message: 'Password has been reset successfully',
    });

  } catch (error) {
    logger.error('Error resetting password', { error });
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
