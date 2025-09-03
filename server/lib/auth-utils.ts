import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_VERIFICATION_EXPIRES_IN = '24h';

interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role?: string;
  isVerified?: boolean;
}

export function generateAuthToken(user: {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
}) {
  return sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function generateVerificationToken(userId: string, email: string) {
  return sign(
    { userId, email, purpose: 'email-verification' },
    JWT_SECRET,
    { expiresIn: JWT_VERIFICATION_EXPIRES_IN, jwtid: uuidv4() }
  );
}

export function verifyToken(token: string): TokenPayload {
  try {
    return verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function extractTokenFromHeader(authHeader: string | undefined) {
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  return scheme === 'Bearer' ? token : null;
}

export function generatePasswordResetToken(userId: string, email: string) {
  return sign(
    { userId, email, purpose: 'password-reset' },
    JWT_SECRET,
    { expiresIn: '1h', jwtid: uuidv4() }
  );
}

export function verifyPasswordResetToken(token: string) {
  try {
    const payload = verify(token, JWT_SECRET) as TokenPayload & { purpose: string };
    if (payload.purpose !== 'password-reset') {
      throw new Error('Invalid token purpose');
    }
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired password reset token');
  }
}

export function generateRefreshToken(userId: string) {
  return sign(
    { userId, purpose: 'refresh-token' },
    JWT_SECRET,
    { expiresIn: '30d', jwtid: uuidv4() }
  );
}

export function verifyRefreshToken(token: string) {
  try {
    const payload = verify(token, JWT_SECRET) as TokenPayload & { purpose: string };
    if (payload.purpose !== 'refresh-token') {
      throw new Error('Invalid token purpose');
    }
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}
