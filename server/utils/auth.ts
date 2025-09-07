import { compare, hash } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { env } from '@/env.mjs';

type TokenPayload = {
  userId: string;
  email: string;
  role?: string;
};

/**
 * Hashes a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

/**
 * Compares a plain text password with a hashed password
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

/**
 * Generates a JWT token
 */
export function generateToken(
  payload: TokenPayload,
  expiresIn: string | number = '7d'
): string {
  return sign(payload, env.NEXTAUTH_SECRET, { expiresIn });
}

/**
 * Verifies a JWT token
 */
export function verifyToken<T = TokenPayload>(token: string): T {
  return verify(token, env.NEXTAUTH_SECRET) as T;
}

/**
 * Generates a random token for email verification and password reset
 */
export function generateRandomToken(length = 32): string {
  return require('crypto')
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Generates a random numeric OTP
 */
export function generateOTP(length = 6): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
}

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validates a password
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function isValidPassword(password: string): boolean {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return re.test(password);
}

/**
 * Generates a secure password reset token with expiration
 */
export function generatePasswordResetToken(userId: string, email: string): string {
  return sign(
    { userId, email, type: 'password_reset' },
    env.NEXTAUTH_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Verifies a password reset token
 */
export function verifyPasswordResetToken(token: string): {
  userId: string;
  email: string;
  type: string;
} {
  const payload = verify(token, env.NEXTAUTH_SECRET) as {
    userId: string;
    email: string;
    type: string;
  };

  if (payload.type !== 'password_reset') {
    throw new Error('Invalid token type');
  }

  return payload;
}

/**
 * Generates an email verification token
 */
export function generateEmailVerificationToken(userId: string, email: string): string {
  return sign(
    { userId, email, type: 'email_verification' },
    env.NEXTAUTH_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Verifies an email verification token
 */
export function verifyEmailVerificationToken(token: string): {
  userId: string;
  email: string;
  type: string;
} {
  const payload = verify(token, env.NEXTAUTH_SECRET) as {
    userId: string;
    email: string;
    type: string;
  };

  if (payload.type !== 'email_verification') {
    throw new Error('Invalid token type');
  }

  return payload;
}
