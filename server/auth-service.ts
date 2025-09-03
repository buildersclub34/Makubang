
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly JWT_EXPIRES_IN = '7d';

  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(payload: any): string {
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static async registerUser(userData: {
    email: string;
    password: string;
    name: string;
    role?: string;
    phone?: string;
  }) {
    const existingUser = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
    
    if (existingUser.length > 0) {
      throw new Error('User already exists');
    }

    const hashedPassword = await this.hashPassword(userData.password);
    
    const [newUser] = await db.insert(users).values({
      ...userData,
      password: hashedPassword,
      role: userData.role || 'user',
      createdAt: new Date(),
    }).returning();

    const token = this.generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return { user: { ...newUser, password: undefined }, token };
  }

  static async loginUser(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await this.verifyPassword(password, user.password);
    
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user: { ...user, password: undefined }, token };
  }

  static async refreshToken(oldToken: string) {
    const decoded = this.verifyToken(oldToken);
    
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
    
    if (!user) {
      throw new Error('User not found');
    }

    const newToken = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { token: newToken };
  }

  static async resetPassword(email: string, newPassword: string, resetToken: string) {
    // Verify reset token (in production, store these in database with expiry)
    const decoded = this.verifyToken(resetToken);
    
    if (decoded.email !== email) {
      throw new Error('Invalid reset token');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email));

    return { success: true };
  }

  static async generateResetToken(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user) {
      throw new Error('User not found');
    }

    const resetToken = this.generateToken({ email, type: 'reset' });
    
    // In production, send this token via email
    return { resetToken };
  }
}
