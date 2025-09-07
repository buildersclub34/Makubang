import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { signJwt } from '../../lib/jwt';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, password, role = 'user' } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in database
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        isVerified: false, // Email verification required
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Generate JWT token
    const token = signJwt({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    // Set HTTP-only cookie
    res.setHeader(
      'Set-Cookie',
      `token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000` // 30 days
    );

    // Send verification email (implementation needed)
    // await sendVerificationEmail(newUser.email, newUser.name, token);

    // Return user data (excluding password)
    const { password: _, ...userData } = newUser;
    return res.status(201).json({
      user: userData,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
