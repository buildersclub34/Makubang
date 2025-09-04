
import { db } from '../db';
import { wallets, transactions, withdrawals, earnings } from '../../shared/schema';
import { eq, sum, desc, and, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { NotFoundError, BadRequestError, InternalServerError } from '../middleware/error-handler';

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface EarningsData {
  orderId: string;
  deliveryPartnerId: string;
  baseAmount: number;
  distanceBonus: number;
  timeBonus: number;
  tipAmount: number;
  totalEarnings: number;
  completedAt: Date;
}

export interface WithdrawalRequest {
  id: string;
  deliveryPartnerId: string;
  amount: number;
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolder: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  processedAt?: Date;
}

export class WalletService {
  /**
   * Create a new wallet for a delivery partner
   */
  async createWallet(deliveryPartnerId: string): Promise<any> {
    try {
      const [wallet] = await db.insert(wallets).values({
        id: `wallet_${uuidv4()}`,
        userId: deliveryPartnerId,
        balance: 0,
        currency: 'INR',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      logger.info('Wallet created', { deliveryPartnerId, walletId: wallet.id });
      return wallet;
    } catch (error) {
      logger.error('Error creating wallet', { error, deliveryPartnerId });
      throw new InternalServerError('Failed to create wallet');
    }
  }

  /**
   * Get wallet by delivery partner ID
   */
  async getWallet(deliveryPartnerId: string): Promise<any> {
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, deliveryPartnerId),
    });

    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    return wallet;
  }

  /**
   * Add earnings to wallet
   */
  async addEarnings(earningsData: EarningsData): Promise<WalletTransaction> {
    return db.transaction(async (tx) => {
      try {
        // Get or create wallet
        let wallet = await this.getWallet(earningsData.deliveryPartnerId);
        if (!wallet) {
          wallet = await this.createWallet(earningsData.deliveryPartnerId);
        }

        // Record earnings
        const [earning] = await tx.insert(earnings).values({
          id: `earn_${uuidv4()}`,
          orderId: earningsData.orderId,
          deliveryPartnerId: earningsData.deliveryPartnerId,
          baseAmount: earningsData.baseAmount,
          distanceBonus: earningsData.distanceBonus,
          timeBonus: earningsData.timeBonus,
          tipAmount: earningsData.tipAmount,
          totalEarnings: earningsData.totalEarnings,
          completedAt: earningsData.completedAt,
          createdAt: new Date(),
        }).returning();

        // Update wallet balance
        await tx.update(wallets)
          .set({ 
            balance: wallet.balance + earningsData.totalEarnings,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id));

        // Create transaction record
        const [transaction] = await tx.insert(transactions).values({
          id: `txn_${uuidv4()}`,
          walletId: wallet.id,
          type: 'credit',
          amount: earningsData.totalEarnings,
          description: `Delivery earnings for order ${earningsData.orderId}`,
          reference: earningsData.orderId,
          status: 'completed',
          metadata: {
            baseAmount: earningsData.baseAmount,
            distanceBonus: earningsData.distanceBonus,
            timeBonus: earningsData.timeBonus,
            tipAmount: earningsData.tipAmount,
          },
          createdAt: new Date(),
        }).returning();

        logger.info('Earnings added to wallet', { 
          deliveryPartnerId: earningsData.deliveryPartnerId,
          amount: earningsData.totalEarnings,
          orderId: earningsData.orderId 
        });

        return transaction;
      } catch (error) {
        logger.error('Error adding earnings', { error, earningsData });
        throw new InternalServerError('Failed to add earnings');
      }
    });
  }

  /**
   * Process withdrawal request
   */
  async requestWithdrawal(
    deliveryPartnerId: string,
    amount: number,
    bankDetails: WithdrawalRequest['bankDetails']
  ): Promise<WithdrawalRequest> {
    return db.transaction(async (tx) => {
      try {
        // Get wallet and check balance
        const wallet = await this.getWallet(deliveryPartnerId);
        
        if (wallet.balance < amount) {
          throw new BadRequestError('Insufficient wallet balance');
        }

        if (amount < 100) {
          throw new BadRequestError('Minimum withdrawal amount is ₹100');
        }

        // Create withdrawal request
        const [withdrawal] = await tx.insert(withdrawals).values({
          id: `wd_${uuidv4()}`,
          deliveryPartnerId,
          amount,
          bankDetails: JSON.stringify(bankDetails),
          status: 'pending',
          requestedAt: new Date(),
        }).returning();

        // Create pending transaction
        await tx.insert(transactions).values({
          id: `txn_${uuidv4()}`,
          walletId: wallet.id,
          type: 'debit',
          amount,
          description: `Withdrawal request ${withdrawal.id}`,
          reference: withdrawal.id,
          status: 'pending',
          createdAt: new Date(),
        });

        logger.info('Withdrawal requested', { 
          deliveryPartnerId, 
          amount, 
          withdrawalId: withdrawal.id 
        });

        return {
          ...withdrawal,
          bankDetails,
        } as WithdrawalRequest;
      } catch (error) {
        logger.error('Error requesting withdrawal', { error, deliveryPartnerId, amount });
        throw error instanceof BadRequestError ? error : new InternalServerError('Failed to request withdrawal');
      }
    });
  }

  /**
   * Process withdrawal (admin function)
   */
  async processWithdrawal(
    withdrawalId: string,
    status: 'completed' | 'failed',
    adminNotes?: string
  ): Promise<void> {
    return db.transaction(async (tx) => {
      try {
        // Get withdrawal request
        const withdrawal = await tx.query.withdrawals.findFirst({
          where: eq(withdrawals.id, withdrawalId),
        });

        if (!withdrawal) {
          throw new NotFoundError('Withdrawal request not found');
        }

        if (withdrawal.status !== 'pending') {
          throw new BadRequestError('Withdrawal already processed');
        }

        // Update withdrawal status
        await tx.update(withdrawals)
          .set({ 
            status,
            processedAt: new Date(),
            adminNotes,
          })
          .where(eq(withdrawals.id, withdrawalId));

        // Update transaction status
        await tx.update(transactions)
          .set({ status })
          .where(eq(transactions.reference, withdrawalId));

        // If completed, deduct from wallet balance
        if (status === 'completed') {
          const wallet = await this.getWallet(withdrawal.deliveryPartnerId);
          await tx.update(wallets)
            .set({ 
              balance: wallet.balance - withdrawal.amount,
              updatedAt: new Date(),
            })
            .where(eq(wallets.id, wallet.id));
        }

        logger.info('Withdrawal processed', { withdrawalId, status });
      } catch (error) {
        logger.error('Error processing withdrawal', { error, withdrawalId, status });
        throw error instanceof NotFoundError || error instanceof BadRequestError 
          ? error 
          : new InternalServerError('Failed to process withdrawal');
      }
    });
  }

  /**
   * Get wallet transactions
   */
  async getTransactions(
    deliveryPartnerId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: 'credit' | 'debit';
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const { limit = 20, offset = 0, type, startDate, endDate } = options;
    
    const wallet = await this.getWallet(deliveryPartnerId);
    
    const where = [eq(transactions.walletId, wallet.id)];
    
    if (type) {
      where.push(eq(transactions.type, type));
    }
    
    if (startDate) {
      where.push(gte(transactions.createdAt, startDate));
    }
    
    if (endDate) {
      where.push(lte(transactions.createdAt, endDate));
    }
    
    const [items, [total]] = await Promise.all([
      db.query.transactions.findMany({
        where: and(...where),
        orderBy: desc(transactions.createdAt),
        limit,
        offset,
      }),
      db.select({ count: sum(transactions.amount) })
        .from(transactions)
        .where(and(...where)),
    ]);
    
    return {
      items,
      total: total?.count || 0,
      limit,
      offset,
    };
  }

  /**
   * Get earnings summary
   */
  async getEarningsSummary(
    deliveryPartnerId: string,
    period: 'today' | 'week' | 'month' = 'today'
  ) {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    const summary = await db.select({
      totalEarnings: sum(earnings.totalEarnings),
      totalDeliveries: sql<number>`count(*)`,
      avgEarningsPerDelivery: sql<number>`avg(${earnings.totalEarnings})`,
    })
    .from(earnings)
    .where(
      and(
        eq(earnings.deliveryPartnerId, deliveryPartnerId),
        gte(earnings.completedAt, startDate)
      )
    );
    
    const wallet = await this.getWallet(deliveryPartnerId);
    
    return {
      period,
      currentBalance: wallet.balance,
      ...summary[0],
    };
  }

  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(deliveryPartnerId: string) {
    return await db.query.withdrawals.findMany({
      where: eq(withdrawals.deliveryPartnerId, deliveryPartnerId),
      orderBy: desc(withdrawals.requestedAt),
    });
  }
}

export default WalletService;
