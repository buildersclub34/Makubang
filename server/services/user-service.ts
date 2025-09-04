import { db } from '../db';
import { users } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

export const userService = {
  /**
   * Find a user by ID
   */
  async findById(id: string) {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      return user || null;
    } catch (error) {
      logger.error('Failed to find user by ID:', error);
      throw new Error('Failed to find user');
    }
  },

  /**
   * Find a user by email
   */
  async findByEmail(email: string) {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      return user || null;
    } catch (error) {
      logger.error('Failed to find user by email:', error);
      throw new Error('Failed to find user');
    }
  },

  /**
   * Create a new user
   */
  async createUser(data: {
    email: string;
    password: string;
    name: string;
    role?: 'user' | 'restaurant' | 'delivery' | 'admin';
  }) {
    try {
      // Check if user already exists
      const existingUser = await this.findByEmail(data.email);
      if (existingUser) {
        throw new Error('Email already in use');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Create user
      const [user] = await db
        .insert(users)
        .values({
          id: crypto.randomUUID(),
          email: data.email,
          name: data.name,
          password: hashedPassword,
          role: data.role || 'user',
          isVerified: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return user;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  },

  /**
   * Update a user
   */
  async updateUser(
    userId: string,
    data: {
      name?: string;
      avatar?: string | null;
      password?: string;
      isVerified?: boolean;
      isActive?: boolean;
    }
  ) {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.name) updateData.name = data.name;
      if (data.avatar !== undefined) updateData.avatar = data.avatar;
      if (data.isVerified !== undefined) updateData.isVerified = data.isVerified;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 12);
      }

      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      return user || null;
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw new Error('Failed to update user');
    }
  },

  /**
   * Delete a user (soft delete)
   */
  async deleteUser(userId: string) {
    try {
      await db
        .update(users)
        .set({ 
          isActive: false,
          email: `deleted-${Date.now()}-${users.email}`,
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      logger.error('Failed to delete user:', error);
      throw new Error('Failed to delete user');
    }
  },

  /**
   * Verify user password
   */
  async verifyPassword(userId: string, password: string) {
    try {
      const user = await this.findById(userId);
      if (!user) {
        return false;
      }
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      logger.error('Failed to verify password:', error);
      return false;
    }
  },

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      const isValid = await this.verifyPassword(userId, currentPassword);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      await this.updateUser(userId, {
        password: newPassword,
      });

      return true;
    } catch (error) {
      logger.error('Failed to change password:', error);
      throw error;
    }
  },
};
