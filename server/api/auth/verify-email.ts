import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../db';
import { users, emailVerifications } from '../../shared/schema';
import { eq, and, gte } from 'drizzle-orm';
import { verifyJwt } from '../../lib/jwt';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Verification token is required' });
  }

  try {
    // Verify the JWT token
    const decoded = verifyJwt(token);
    if (!decoded || !decoded.email) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // Find the verification record
    const [verification] = await db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.token, token),
          eq(emailVerifications.email, decoded.email),
          gte(emailVerifications.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!verification) {
      return res.status(400).json({ 
        message: 'Verification link is invalid or has expired. Please request a new one.' 
      });
    }

    // Update user's email verification status
    await db
      .update(users)
      .set({ 
        isVerified: true,
        updatedAt: new Date() 
      })
      .where(eq(users.email, decoded.email));

    // Delete the verification record
    await db
      .delete(emailVerifications)
      .where(eq(emailVerifications.id, verification.id));

    return res.status(200).json({ 
      success: true,
      message: 'Email verified successfully!' 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to verify email. Please try again.' 
    });
  }
}
