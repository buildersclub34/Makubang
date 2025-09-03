
import { db } from './db';
import { users, loyaltyPoints, loyaltyRewards, loyaltyTransactions } from '../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export class LoyaltyService {
  private static readonly TIER_THRESHOLDS = {
    bronze: 0,
    silver: 1000,
    gold: 5000,
    platinum: 15000,
  };

  private static readonly TIER_MULTIPLIERS = {
    bronze: 1,
    silver: 1.2,
    gold: 1.5,
    platinum: 2,
  };

  static async getUserLoyaltyData(userId: string) {
    const [userPoints] = await db.select()
      .from(loyaltyPoints)
      .where(eq(loyaltyPoints.userId, userId))
      .limit(1);

    if (!userPoints) {
      // Create initial loyalty record
      const [newPoints] = await db.insert(loyaltyPoints).values({
        userId,
        currentPoints: 0,
        lifetimePoints: 0,
        tier: 'bronze',
        createdAt: new Date(),
      }).returning();

      return newPoints;
    }

    return userPoints;
  }

  static async addPoints(userId: string, points: number, reason: string, orderId?: string) {
    const userLoyalty = await this.getUserLoyaltyData(userId);
    const tierMultiplier = this.TIER_MULTIPLIERS[userLoyalty.tier as keyof typeof this.TIER_MULTIPLIERS];
    const actualPoints = Math.round(points * tierMultiplier);

    // Update points
    const [updatedPoints] = await db.update(loyaltyPoints)
      .set({
        currentPoints: userLoyalty.currentPoints + actualPoints,
        lifetimePoints: userLoyalty.lifetimePoints + actualPoints,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyPoints.userId, userId))
      .returning();

    // Record transaction
    await db.insert(loyaltyTransactions).values({
      userId,
      points: actualPoints,
      type: 'earned',
      reason,
      orderId,
      createdAt: new Date(),
    });

    // Check for tier upgrade
    await this.checkTierUpgrade(userId, updatedPoints.lifetimePoints);

    return updatedPoints;
  }

  static async deductPoints(userId: string, points: number, reason: string, rewardId?: string) {
    const userLoyalty = await this.getUserLoyaltyData(userId);

    if (userLoyalty.currentPoints < points) {
      throw new Error('Insufficient points');
    }

    const [updatedPoints] = await db.update(loyaltyPoints)
      .set({
        currentPoints: userLoyalty.currentPoints - points,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyPoints.userId, userId))
      .returning();

    // Record transaction
    await db.insert(loyaltyTransactions).values({
      userId,
      points: -points,
      type: 'redeemed',
      reason,
      rewardId,
      createdAt: new Date(),
    });

    return updatedPoints;
  }

  static async checkTierUpgrade(userId: string, lifetimePoints: number) {
    let newTier = 'bronze';
    
    if (lifetimePoints >= this.TIER_THRESHOLDS.platinum) {
      newTier = 'platinum';
    } else if (lifetimePoints >= this.TIER_THRESHOLDS.gold) {
      newTier = 'gold';
    } else if (lifetimePoints >= this.TIER_THRESHOLDS.silver) {
      newTier = 'silver';
    }

    const currentUser = await this.getUserLoyaltyData(userId);
    
    if (currentUser.tier !== newTier) {
      await db.update(loyaltyPoints)
        .set({ tier: newTier, updatedAt: new Date() })
        .where(eq(loyaltyPoints.userId, userId));

      // Award tier upgrade bonus
      const bonusPoints = this.getTierUpgradeBonus(newTier);
      if (bonusPoints > 0) {
        await this.addPoints(userId, bonusPoints, `Tier upgrade to ${newTier}`);
      }

      return newTier;
    }

    return currentUser.tier;
  }

  private static getTierUpgradeBonus(tier: string): number {
    const bonuses = {
      silver: 100,
      gold: 250,
      platinum: 500,
    };
    return bonuses[tier as keyof typeof bonuses] || 0;
  }

  static async getAvailableRewards(userId: string) {
    const userLoyalty = await this.getUserLoyaltyData(userId);
    
    return db.select()
      .from(loyaltyRewards)
      .where(and(
        eq(loyaltyRewards.isActive, true),
        sql`${loyaltyRewards.pointsCost} <= ${userLoyalty.currentPoints}`
      ))
      .orderBy(loyaltyRewards.pointsCost);
  }

  static async redeemReward(userId: string, rewardId: string) {
    const [reward] = await db.select()
      .from(loyaltyRewards)
      .where(eq(loyaltyRewards.id, rewardId))
      .limit(1);

    if (!reward || !reward.isActive) {
      throw new Error('Reward not available');
    }

    const userLoyalty = await this.getUserLoyaltyData(userId);
    
    if (userLoyalty.currentPoints < reward.pointsCost) {
      throw new Error('Insufficient points');
    }

    // Deduct points
    await this.deductPoints(userId, reward.pointsCost, `Redeemed ${reward.title}`, rewardId);

    // Generate reward code/voucher
    const voucherCode = this.generateVoucherCode();
    
    return {
      voucherCode,
      reward,
      pointsDeducted: reward.pointsCost,
    };
  }

  private static generateVoucherCode(): string {
    return 'MKB' + Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  static async getLoyaltyHistory(userId: string, limit: number = 50) {
    return db.select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.userId, userId))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(limit);
  }

  static async getNextTierInfo(userId: string) {
    const userLoyalty = await this.getUserLoyaltyData(userId);
    const currentTier = userLoyalty.tier;
    
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tierOrder.indexOf(currentTier);
    
    if (currentIndex === tierOrder.length - 1) {
      return {
        isMaxTier: true,
        currentTier,
        currentPoints: userLoyalty.lifetimePoints,
      };
    }

    const nextTier = tierOrder[currentIndex + 1];
    const nextThreshold = this.TIER_THRESHOLDS[nextTier as keyof typeof this.TIER_THRESHOLDS];
    
    return {
      isMaxTier: false,
      currentTier,
      nextTier,
      currentPoints: userLoyalty.lifetimePoints,
      nextTierThreshold: nextThreshold,
      pointsNeeded: nextThreshold - userLoyalty.lifetimePoints,
    };
  }

  // Points earning rules
  static calculateOrderPoints(orderAmount: number): number {
    return Math.floor(orderAmount / 10); // 1 point per ₹10 spent
  }

  static calculateReviewPoints(): number {
    return 25; // Fixed points for posting a review
  }

  static calculateReferralPoints(): number {
    return 100; // Points for successful referral
  }

  static calculateSocialSharePoints(): number {
    return 10; // Points for sharing content
  }

  // Achievements system
  static async checkAchievements(userId: string) {
    const userLoyalty = await this.getUserLoyaltyData(userId);
    const achievements = [];

    // Order-based achievements
    const orderCount = await this.getUserOrderCount(userId);
    if (orderCount === 1) {
      achievements.push({ title: 'First Order', points: 50 });
    } else if (orderCount === 10) {
      achievements.push({ title: 'Regular Customer', points: 100 });
    } else if (orderCount === 50) {
      achievements.push({ title: 'Food Explorer', points: 250 });
    }

    // Points-based achievements
    if (userLoyalty.lifetimePoints >= 1000) {
      achievements.push({ title: 'Points Collector', points: 100 });
    }

    // Award achievement points
    for (const achievement of achievements) {
      await this.addPoints(userId, achievement.points, `Achievement: ${achievement.title}`);
    }

    return achievements;
  }

  private static async getUserOrderCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(db.select().from(orders).where(eq(orders.userId, userId)));
    return result[0]?.count || 0;
  }
}
