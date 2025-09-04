import { User, IUser } from '../models';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

class UserService {
  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<IUser | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }
      return await User.findById(id).select('-password').lean();
    } catch (error) {
      logger.error('Failed to find user by ID:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email }).select('+password').lean();
    } catch (error) {
      logger.error('Failed to find user by email:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Create a new user
   */
  async createUser(data: {
    email: string;
    password: string;
    name: string;
    role?: 'user' | 'restaurant_owner' | 'delivery_partner' | 'admin';
  }): Promise<IUser> {
    try {
      // Check if user already exists
      const existingUser = await this.findByEmail(data.email);
      if (existingUser) {
        throw new Error('Email already in use');
      }

      // Create user
      const user = await User.create({
        email: data.email,
        name: data.name,
        password: data.password, // Password will be hashed by pre-save hook
        role: data.role || 'user',
      });

      // Convert to plain object and remove password
      const userObject = user.toObject();
      delete (userObject as any).password;
      return userObject as IUser;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Update a user
   */
  async updateUser(
    userId: string,
    data: {
      name?: string;
      phone?: string;
      password?: string;
      isVerified?: boolean;
      isActive?: boolean;
      avatar?: string;
    }
  ): Promise<IUser | null> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      const updateData: any = { ...data };
      
      // Handle password update
      if (data.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(data.password, salt);
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password').lean();

      if (!updatedUser) {
        throw new Error('User not found');
      }

      return updatedUser as IUser;
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }
        updatedAt: new Date(),
      };

      if (data.name) updateData.name = data.name;
      if (data.avatar !== undefined) updateData.avatar = data.avatar;
      if (data.isVerified !== undefined) updateData.isVerified = data.isVerified;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 12);
      }

  /**
   * Delete a user (soft delete)
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      const result = await User.findByIdAndUpdate(
        userId,
        { 
          isActive: false,
          deletedAt: new Date() 
        },
        { new: true }
      );
      
      return !!result;
    } catch (error) {
      logger.error('Failed to delete user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    try {
      const user = await User.findOne({ email }).select('+password').lean();
      if (!user) {
        return false;
      }
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      logger.error('Failed to verify password:', error);
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }

      user.password = newPassword; // Pre-save hook will hash the password
      await user.save();
      
      return true;
    } catch (error) {
      logger.error('Failed to change password:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: {
      name?: string;
      phone?: string;
      avatar?: string;
    }
  ): Promise<IUser | null> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      const updatedUser = await User.findByIdAndUpdate(
export const userService = new UserService();
