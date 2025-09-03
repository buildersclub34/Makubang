
import { db } from './db';
import { users, referrals, referralRewards } from '../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { LoyaltyService } from './loyalty-service';

export class ReferralService {
  private static readonly REFERRAL_BONUS = 100; // ₹100 for both referrer and referee
  private static readonly ONGOING_BONUS = 50; // ₹50 for each subsequent order
  private static readonly MAX_ONGOING_ORDERS = 10;

  static generateReferralCode(userId: string): string {
    return 'MKB' + userId.substring(0, 4).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  static async createReferralCode(userId: string) {
    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      throw new Error('User not found');
    }

    if (existingUser.referralCode) {
      return existingUser.referralCode;
    }

    const referralCode = this.generateReferralCode(userId);
    
    await db.update(users)
      .set({ referralCode })
      .where(eq(users.id, userId));

    return referralCode;
  }

  static async processReferral(referrerCode: string, newUserId: string) {
    // Find referrer by code
    const [referrer] = await db.select()
      .from(users)
      .where(eq(users.referralCode, referrerCode))
      .limit(1);

    if (!referrer) {
      throw new Error('Invalid referral code');
    }

    if (referrer.id === newUserId) {
      throw new Error('Cannot refer yourself');
    }

    // Check if referral already exists
    const [existingReferral] = await db.select()
      .from(referrals)
      .where(and(
        eq(referrals.referrerId, referrer.id),
        eq(referrals.referredUserId, newUserId)
      ))
      .limit(1);

    if (existingReferral) {
      return existingReferral;
    }

    // Create referral record
    const [newReferral] = await db.insert(referrals).values({
      referrerId: referrer.id,
      referredUserId: newUserId,
      status: 'pending',
      createdAt: new Date(),
    }).returning();

    return newReferral;
  }

  static async completeReferral(referralId: string, orderId: string) {
    const [referral] = await db.select()
      .from(referrals)
      .where(eq(referrals.id, referralId))
      .limit(1);

    if (!referral || referral.status !== 'pending') {
      return;
    }

    // Update referral status
    await db.update(referrals)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(referrals.id, referralId));

    // Award bonus to both users
    await this.awardReferralBonus(referral.referrerId, referral.referredUserId, orderId);
  }

  private static async awardReferralBonus(referrerId: string, referredUserId: string, orderId: string) {
    // Award bonus to referrer
    await db.insert(referralRewards).values({
      referrerId,
      referredUserId,
      orderId,
      amount: this.REFERRAL_BONUS,
      type: 'signup_bonus',
      status: 'pending',
      createdAt: new Date(),
    });

    // Award bonus to referee
    await db.insert(referralRewards).values({
      referrerId: referredUserId, // Referee gets the reward too
      referredUserId: referrerId,
      orderId,
      amount: this.REFERRAL_BONUS,
      type: 'signup_bonus',
      status: 'pending',
      createdAt: new Date(),
    });

    // Add loyalty points
    await LoyaltyService.addPoints(referrerId, this.REFERRAL_BONUS, 'Referral bonus', orderId);
    await LoyaltyService.addPoints(referredUserId, this.REFERRAL_BONUS, 'Welcome bonus', orderId);
  }

  static async processOngoingReferralBonus(referredUserId: string, orderId: string) {
    // Find the referral for this user
    const [referral] = await db.select()
      .from(referrals)
      .where(and(
        eq(referrals.referredUserId, referredUserId),
        eq(referrals.status, 'completed')
      ))
      .limit(1);

    if (!referral) {
      return;
    }

    // Check how many ongoing bonuses have been awarded
    const ongoingBonusCount = await db.select({ count: sql<number>`count(*)` })
      .from(referralRewards)
      .where(and(
        eq(referralRewards.referrerId, referral.referrerId),
        eq(referralRewards.referredUserId, referredUserId),
        eq(referralRewards.type, 'ongoing_bonus')
      ));

    if (ongoingBonusCount[0].count >= this.MAX_ONGOING_ORDERS) {
      return; // Max ongoing bonuses reached
    }

    // Award ongoing bonus
    await db.insert(referralRewards).values({
      referrerId: referral.referrerId,
      referredUserId,
      orderId,
      amount: this.ONGOING_BONUS,
      type: 'ongoing_bonus',
      status: 'pending',
      createdAt: new Date(),
    });

    await LoyaltyService.addPoints(referral.referrerId, this.ONGOING_BONUS, 'Ongoing referral bonus', orderId);
  }

  static async getUserReferralData(userId: string) {
    // Get or create referral code
    const referralCode = await this.createReferralCode(userId);

    // Count total referrals
    const totalReferrals = await db.select({ count: sql<number>`count(*)` })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    // Calculate pending and earned rewards
    const rewardsSummary = await db.select({
      pending: sql<number>`sum(case when status = 'pending' then amount else 0 end)`,
      earned: sql<number>`sum(case when status = 'paid' then amount else 0 end)`,
    })
    .from(referralRewards)
    .where(eq(referralRewards.referrerId, userId));

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const referralLink = `${baseUrl}/signup?ref=${referralCode}`;

    return {
      referralCode,
      referralLink,
      totalReferrals: totalReferrals[0]?.count || 0,
      pendingRewards: rewardsSummary[0]?.pending || 0,
      earnedRewards: rewardsSummary[0]?.earned || 0,
    };
  }

  static async getUserReferrals(userId: string) {
    return db.select({
      referral: referrals,
      referredUser: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(referrals)
    .leftJoin(users, eq(referrals.referredUserId, users.id))
    .where(eq(referrals.referrerId, userId))
    .orderBy(desc(referrals.createdAt));
  }

  static async claimReferralRewards(userId: string) {
    // Get pending rewards
    const pendingRewards = await db.select()
      .from(referralRewards)
      .where(and(
        eq(referralRewards.referrerId, userId),
        eq(referralRewards.status, 'pending')
      ));

    if (pendingRewards.length === 0) {
      throw new Error('No pending rewards to claim');
    }

    const totalAmount = pendingRewards.reduce((sum, reward) => sum + reward.amount, 0);

    // Mark rewards as paid
    await db.update(referralRewards)
      .set({
        status: 'paid',
        paidAt: new Date(),
      })
      .where(and(
        eq(referralRewards.referrerId, userId),
        eq(referralRewards.status, 'pending')
      ));

    // In production, process actual payment/credit to user's wallet
    console.log(`Paid ₹${totalAmount} to user ${userId} for referral rewards`);

    return {
      amount: totalAmount,
      rewardsCount: pendingRewards.length,
    };
  }

  static async validateReferralCode(code: string): Promise<boolean> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.referralCode, code))
      .limit(1);

    return !!user;
  }

  static async getReferralStats(userId?: string) {
    let query = db.select({
      totalReferrals: sql<number>`count(*)`,
      completedReferrals: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
      totalRewards: sql<number>`coalesce(sum(amount), 0)`,
    })
    .from(referrals)
    .leftJoin(referralRewards, eq(referrals.id, referralRewards.referrerId));

    if (userId) {
      query = query.where(eq(referrals.referrerId, userId));
    }

    return query;
  }
}
