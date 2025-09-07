import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../db';
import { users, emailVerifications } from '../../shared/schema';
import { eq, and, gte } from 'drizzle-orm';
import { signJwt } from '../../lib/jwt';
import { emailService } from '../../services/email-service';

const VERIFICATION_EXPIRY_HOURS = 24; // 24 hours

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token, email: emailParam } = req.body;
  let email = emailParam;

  try {
    // If token is provided, get email from token
    if (token && !email) {
      const decoded = verifyJwt(token);
      if (decoded?.email) {
        email = decoded.email;
      }
    }

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email or valid token is required' 
      });
    }

    // Check if user exists and is not already verified
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is already verified' 
      });
    }

    // Check for existing verification token
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + VERIFICATION_EXPIRY_HOURS);

    // Generate new verification token
    const verificationToken = signJwt({
      email: user.email,
      purpose: 'email-verification',
    });

    // Create or update verification record
    await db
      .insert(emailVerifications)
      .values({
        email: user.email,
        token: verificationToken,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: emailVerifications.email,
        set: { 
          token: verificationToken,
          expiresAt,
          updatedAt: new Date() 
        },
      });

    // Send verification email
    await emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.name || 'User'
    );

    return res.status(200).json({ 
      success: true,
      message: 'Verification email sent successfully' 
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to resend verification email' 
    });
  }
}
