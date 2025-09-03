import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { validateVerificationToken } from '@/server/services/token-service';
import { logger } from '@/server/utils/logger';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Verification token is required' },
      { status: 400 }
    );
  }

  try {
    // Validate the token
    const verificationToken = await validateVerificationToken(token, 'email');
    
    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Update user's email verification status
    await db
      .update(users)
      .set({ 
        isVerified: true,
        updatedAt: new Date() 
      })
      .where(eq(users.id, verificationToken.userId));

    logger.info('Email verified successfully', { userId: verificationToken.userId });

    // Redirect to success page
    const redirectUrl = new URL('/auth/verification-success', request.url);
    return NextResponse.redirect(redirectUrl.toString());

  } catch (error) {
    logger.error('Error verifying email', { error });
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}
