import { db } from '../db';
import { emailVerifications, users } from '../shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { signToken } from '../lib/jwt';
import { sendEmail } from './email-service';
import { getEmailVerificationTemplate } from './email-templates';

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24; // Token expires in 24 hours

interface SendVerificationEmailParams {
  userId: string;
  email: string;
  name?: string;
}

export async function sendVerificationEmail({ userId, email, name }: SendVerificationEmailParams) {
  // Generate a verification token
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);

  // Create or update verification record
  await db.transaction(async (tx) => {
    // Delete any existing verification tokens for this email
    await tx
      .delete(emailVerifications)
      .where(eq(emailVerifications.email, email));

    // Create new verification record
    await tx.insert(emailVerifications).values({
      id: uuidv4(),
      email,
      token,
      expiresAt,
      userId,
    });
  });

  // Generate verification URL
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;

  // Send verification email
  const emailContent = getEmailVerificationTemplate({
    name: name || 'there',
    verificationUrl,
    expiresInHours: VERIFICATION_TOKEN_EXPIRY_HOURS,
    appName: process.env.APP_NAME || 'Makubang',
    logoUrl: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
    primaryColor: '#4f46e5',
    secondaryColor: '#818cf8',
  });

  await sendEmail({
    to: email,
    subject: 'Verify your email address',
    html: emailContent,
  });
}

export async function verifyEmailToken(token: string) {
  // Find the verification record
  const [verification] = await db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.token, token),
        gt(emailVerifications.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!verification) {
    throw new Error('Invalid or expired verification token');
  }

  // Update user's email verification status
  await db
    .update(users)
    .set({ isVerified: true })
    .where(eq(users.id, verification.userId));

  // Delete the used verification record
  await db
    .delete(emailVerifications)
    .where(eq(emailVerifications.id, verification.id));

  return {
    userId: verification.userId,
    email: verification.email,
  };
}

export async function isEmailVerified(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ isVerified: users.isVerified })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.isVerified ?? false;
}
