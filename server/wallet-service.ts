
import { db } from "./db";
import { 
  deliveryWallet, 
  walletTransactions, 
  withdrawalMethods, 
  withdrawalRequests,
  deliveryPartners,
  deliveryEarnings
} from "@shared/schema";
import { eq, and, desc, sum, gte } from "drizzle-orm";

export class WalletService {
  static async getDeliveryPartnerWallet(deliveryPartnerId: string) {
    try {
      let wallet = await db.query.deliveryWallet.findFirst({
        where: eq(deliveryWallet.deliveryPartnerId, deliveryPartnerId),
      });

      if (!wallet) {
        // Create wallet if it doesn't exist
        wallet = await db.insert(deliveryWallet)
          .values({ deliveryPartnerId })
          .returning()
          .then(result => result[0]);
      }

      // Calculate weekly stats
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const weeklyEarnings = await db
        .select({ total: sum(deliveryEarnings.totalAmount) })
        .from(deliveryEarnings)
        .where(and(
          eq(deliveryEarnings.deliveryPartnerId, deliveryPartnerId),
          gte(deliveryEarnings.createdAt, weekStart)
        ));

      const weeklyDeliveries = await db
        .select({ count: sum(1) })
        .from(deliveryEarnings)
        .where(and(
          eq(deliveryEarnings.deliveryPartnerId, deliveryPartnerId),
          gte(deliveryEarnings.createdAt, weekStart)
        ));

      return {
        ...wallet,
        weeklyEarnings: parseFloat(weeklyEarnings[0]?.total || '0'),
        weeklyDeliveries: weeklyDeliveries[0]?.count || 0,
        averageTime: 25, // Calculate from delivery tracking
        weeklyRating: 4.7, // Calculate from ratings
      };
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      throw error;
    }
  }

  static async getWalletTransactions(deliveryPartnerId: string, limit: number = 50) {
    try {
      return await db.query.walletTransactions.findMany({
        where: eq(walletTransactions.deliveryPartnerId, deliveryPartnerId),
        orderBy: desc(walletTransactions.createdAt),
        limit,
      });
    } catch (error) {
      console.error("Error fetching wallet transactions:", error);
      throw error;
    }
  }

  static async addWalletTransaction(data: {
    deliveryPartnerId: string;
    type: string;
    amount: string;
    description: string;
    status?: string;
    referenceId?: string;
    metadata?: any;
  }) {
    try {
      const transaction = await db.insert(walletTransactions)
        .values(data)
        .returning()
        .then(result => result[0]);

      // Update wallet balance
      const amount = parseFloat(data.amount);
      if (data.type === 'earning' || data.type === 'bonus') {
        await db.update(deliveryWallet)
          .set({
            availableBalance: db.raw(`available_balance + ${amount}`),
            totalEarned: db.raw(`total_earned + ${amount}`),
            updatedAt: new Date(),
          })
          .where(eq(deliveryWallet.deliveryPartnerId, data.deliveryPartnerId));
      } else if (data.type === 'withdrawal' && data.status === 'completed') {
        await db.update(deliveryWallet)
          .set({
            availableBalance: db.raw(`available_balance - ${amount}`),
            totalWithdrawn: db.raw(`total_withdrawn + ${amount}`),
            updatedAt: new Date(),
          })
          .where(eq(deliveryWallet.deliveryPartnerId, data.deliveryPartnerId));
      }

      return transaction;
    } catch (error) {
      console.error("Error adding wallet transaction:", error);
      throw error;
    }
  }

  static async getWithdrawalMethods(deliveryPartnerId: string) {
    try {
      return await db.query.withdrawalMethods.findMany({
        where: eq(withdrawalMethods.deliveryPartnerId, deliveryPartnerId),
        orderBy: desc(withdrawalMethods.createdAt),
      });
    } catch (error) {
      console.error("Error fetching withdrawal methods:", error);
      throw error;
    }
  }

  static async createWithdrawalMethod(data: {
    deliveryPartnerId: string;
    type: string;
    details: any;
    isDefault?: boolean;
  }) {
    try {
      // If this is set as default, remove default from others
      if (data.isDefault) {
        await db.update(withdrawalMethods)
          .set({ isDefault: false })
          .where(eq(withdrawalMethods.deliveryPartnerId, data.deliveryPartnerId));
      }

      return await db.insert(withdrawalMethods)
        .values(data)
        .returning()
        .then(result => result[0]);
    } catch (error) {
      console.error("Error creating withdrawal method:", error);
      throw error;
    }
  }

  static async createWithdrawalRequest(data: {
    deliveryPartnerId: string;
    methodId: string;
    amount: string;
    status?: string;
  }) {
    try {
      const amount = parseFloat(data.amount);
      
      // Check if sufficient balance
      const wallet = await this.getDeliveryPartnerWallet(data.deliveryPartnerId);
      if (amount > wallet.availableBalance) {
        throw new Error('Insufficient balance');
      }

      // Create withdrawal request
      const withdrawal = await db.insert(withdrawalRequests)
        .values(data)
        .returning()
        .then(result => result[0]);

      // Move money from available to pending
      await db.update(deliveryWallet)
        .set({
          availableBalance: db.raw(`available_balance - ${amount}`),
          pendingBalance: db.raw(`pending_balance + ${amount}`),
          updatedAt: new Date(),
        })
        .where(eq(deliveryWallet.deliveryPartnerId, data.deliveryPartnerId));

      // Add transaction record
      await this.addWalletTransaction({
        deliveryPartnerId: data.deliveryPartnerId,
        type: 'withdrawal',
        amount: data.amount,
        description: `Withdrawal request - ₹${amount}`,
        status: 'pending',
        referenceId: withdrawal.id,
      });

      return withdrawal;
    } catch (error) {
      console.error("Error creating withdrawal request:", error);
      throw error;
    }
  }

  static async processWithdrawal(withdrawalId: string, status: 'approved' | 'rejected', adminNotes?: string) {
    try {
      const withdrawal = await db.query.withdrawalRequests.findFirst({
        where: eq(withdrawalRequests.id, withdrawalId),
      });

      if (!withdrawal) {
        throw new Error('Withdrawal request not found');
      }

      const amount = parseFloat(withdrawal.amount);

      if (status === 'approved') {
        // Mark withdrawal as completed
        await db.update(withdrawalRequests)
          .set({
            status: 'completed',
            adminNotes,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(withdrawalRequests.id, withdrawalId));

        // Update wallet
        await db.update(deliveryWallet)
          .set({
            pendingBalance: db.raw(`pending_balance - ${amount}`),
            totalWithdrawn: db.raw(`total_withdrawn + ${amount}`),
            updatedAt: new Date(),
          })
          .where(eq(deliveryWallet.deliveryPartnerId, withdrawal.deliveryPartnerId));

        // Update transaction status
        await db.update(walletTransactions)
          .set({ status: 'completed' })
          .where(and(
            eq(walletTransactions.deliveryPartnerId, withdrawal.deliveryPartnerId),
            eq(walletTransactions.referenceId, withdrawalId)
          ));

      } else {
        // Rejection: return money to available balance
        await db.update(withdrawalRequests)
          .set({
            status: 'rejected',
            adminNotes,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(withdrawalRequests.id, withdrawalId));

        await db.update(deliveryWallet)
          .set({
            pendingBalance: db.raw(`pending_balance - ${amount}`),
            availableBalance: db.raw(`available_balance + ${amount}`),
            updatedAt: new Date(),
          })
          .where(eq(deliveryWallet.deliveryPartnerId, withdrawal.deliveryPartnerId));

        // Update transaction status
        await db.update(walletTransactions)
          .set({ status: 'failed' })
          .where(and(
            eq(walletTransactions.deliveryPartnerId, withdrawal.deliveryPartnerId),
            eq(walletTransactions.referenceId, withdrawalId)
          ));
      }

      return withdrawal;
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      throw error;
    }
  }

  static async addEarningToWallet(deliveryPartnerId: string, orderId: string, amount: number, description: string) {
    try {
      await this.addWalletTransaction({
        deliveryPartnerId,
        type: 'earning',
        amount: amount.toString(),
        description,
        status: 'completed',
        referenceId: orderId,
      });
    } catch (error) {
      console.error("Error adding earning to wallet:", error);
      throw error;
    }
  }
}

// Insert schemas</new_str>
