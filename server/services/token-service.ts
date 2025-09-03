import { db } from '../db';
import { verificationTokens } from '@shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'crypto';
import { addHours } from 'date-fns';
import { logger } from '../utils/logger';

const TOKEN_EXPIRY_HOURS = 24; // 24 hours expiry

export async function createVerificationToken(userId: string, type: 'email' | 'password') {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = addHours(new Date(), TOKEN_EXPIRY_HOURS);

  try {
    // Invalidate any existing tokens for this user and type
    await db
      .update(verificationTokens)
      .set({ isValid: false })
      .where(
        and(
          eq(verificationTokens.userId, userId),
          eq(verificationTokens.type, type),
          eq(verificationTokens.isValid, true)
        )
      );

    // Create new token
    const [verificationToken] = await db
      .insert(verificationTokens)
      .values({
        id: crypto.randomUUID(),
        userId,
        token,
        type,
        expiresAt,
        isValid: true,
        createdAt: new Date(),
      })
      .returning();

    return verificationToken;
  } catch (error) {
    logger.error('Error creating verification token', { error, userId, type });
    throw new Error('Failed to create verification token');
  }
}

export async function validateVerificationToken(token: string, type: 'email' | 'password') {
  try {
    const [verificationToken] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.token, token),
          eq(verificationTokens.type, type),
          eq(verificationTokens.isValid, true),
          gt(verificationTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!verificationToken) {
      return null;
    }

    // Invalidate the token after use
    await db
      .update(verificationTokens)
      .set({ isValid: false })
      .where(eq(verificationTokens.id, verificationToken.id));

    return verificationToken;
  } catch (error) {
    logger.error('Error validating verification token', { error, token, type });
    throw new Error('Failed to validate verification token');
  }
}

export async function invalidateUserTokens(userId: string, type: 'email' | 'password') {
  try {
    await db
      .update(verificationTokens)
      .set({ isValid: false })
      .where(
        and(
          eq(verificationTokens.userId, userId),
          eq(verificationTokens.type, type),
          eq(verificationTokens.isValid, true)
        )
      );
  } catch (error) {
    logger.error('Error invalidating user tokens', { error, userId, type });
    throw new Error('Failed to invalidate user tokens');
  }
}
