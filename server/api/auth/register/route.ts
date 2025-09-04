import { NextResponse } from 'next/server';
import { db } from '../../db';
import { users, verificationTokens } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createVerificationToken } from '../../services/token-service';
import { emailService } from '../../services/email-service';
import { logger } from '../../utils/logger';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Input validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email,
        name,
        password: hashedPassword,
        isVerified: false, // User needs to verify email
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create email verification token
    const verificationToken = await createVerificationToken(user.id, 'email');

    // Send verification email
    await emailService.sendVerificationEmail(
      user.email,
      verificationToken.token,
      user.name
    );

    logger.info('User registered successfully', { userId: user.id });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
      message: 'Registration successful. Please check your email to verify your account.'
    }, { status: 201 });

  } catch (error) {
    logger.error('Error during user registration', { error });
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
