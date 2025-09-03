import { pgTable, text, integer, timestamp, boolean, decimal, jsonb, index, primaryKey, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
// Enums
export const paymentStatus = pgEnum('payment_status', ['pending', 'succeeded', 'failed', 'refunded']);
export const paymentMethod = pgEnum('payment_method', ['razorpay', 'cod', 'other']);

// Payment table
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR'),
  status: paymentStatus('status').default('pending'),
  paymentMethod: paymentMethod('payment_method').notNull(),
  externalPaymentId: text('external_payment_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  orderIdIdx: index('payments_order_id_idx').on(table.orderId),
  userIdIdx: index('payments_user_id_idx').on(table.userId),
}));

// Subscription plans
export const subscriptionPlans = pgTable('subscription_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR'),
  durationDays: integer('duration_days').notNull(),
  maxOrders: integer('max_orders'),
  features: jsonb('features'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
});

// Restaurant subscriptions
export const restaurantSubscriptions = pgTable('restaurant_subscriptions', {
  id: text('id').primaryKey(),
  restaurantId: text('restaurant_id').references(() => restaurants.id).notNull(),
  planId: text('plan_id').references(() => subscriptionPlans.id).notNull(),
  status: text('status').notNull().default('active'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  paymentId: text('payment_id').references(() => payments.id),
  orderLimit: integer('order_limit'),
  orderCount: integer('order_count').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  restaurantIdIdx: index('restaurant_subscriptions_restaurant_id_idx').on(table.restaurantId),
  planIdIdx: index('restaurant_subscriptions_plan_id_idx').on(table.planId),
}));

// Email verifications table
export const emailVerifications = pgTable('email_verifications', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  emailIdx: index('email_verifications_email_idx').on(table.email),
  tokenIdx: index('email_verifications_token_idx').on(table.token),
}));

// Password reset tokens
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  emailIdx: index('password_reset_tokens_email_idx').on(table.email),
  tokenIdx: index('password_reset_tokens_token_idx').on(table.token),
}));

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  role: text('role').notNull().default('user'),
  phone: text('phone'),
  address: jsonb('address'),
  preferences: jsonb('preferences'),
  referralCode: text('referral_code').unique(),
  isVerified: boolean('is_verified').default(false),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
});

// Restaurants table
export const restaurants = pgTable('restaurants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  cuisineType: text('cuisine_type').notNull(),
  address: jsonb('address').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  ownerId: text('owner_id').references(() => users.id),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  totalRatings: integer('total_ratings').default(0),
  isActive: boolean('is_active').default(true),
  subscriptionTier: text('subscription_tier').default('basic'),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  openingHours: jsonb('opening_hours'),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
});

// Menu items table
export const menuItems = pgTable('menu_items', {
  id: text('id').primaryKey(),
  restaurantId: text('restaurant_id').references(() => restaurants.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  category: text('category').notNull(),
  image: text('image'),
  isVegan: boolean('is_vegan').default(false),
  isVegetarian: boolean('is_vegetarian').default(false),
  isGlutenFree: boolean('is_gluten_free').default(false),
  spiceLevel: integer('spice_level'),
  ingredients: jsonb('ingredients'),
  nutritionInfo: jsonb('nutrition_info'),
  isAvailable: boolean('is_available').default(true),
  preparationTime: integer('preparation_time'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
});

// Videos table
export const videos = pgTable('videos', {
  id: text('id').primaryKey(),
  creatorId: text('creator_id').references(() => users.id).notNull(),
  restaurantId: text('restaurant_id').references(() => restaurants.id),
  title: text('title').notNull(),
  description: text('description'),
  videoUrl: text('video_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  duration: integer('duration'),
  views: integer('views').default(0),
  likes: integer('likes').default(0),
  shares: integer('shares').default(0),
  comments: integer('comments').default(0),
  tags: jsonb('tags'),
  menuItemIds: jsonb('menu_item_ids'),
  isPublic: boolean('is_public').default(true),
  moderationStatus: text('moderation_status').default('approved'),
  moderationFlags: jsonb('moderation_flags'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  creatorIdx: index('creator_idx').on(table.creatorId),
  restaurantIdx: index('restaurant_idx').on(table.restaurantId),
  viewsIdx: index('views_idx').on(table.views),
}));

// Video interactions table
export const videoInteractions = pgTable('video_interactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  videoId: text('video_id').references(() => videos.id).notNull(),
  type: text('type').notNull(), // 'like', 'share', 'comment', 'view'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull(),
}, (table) => ({
  userVideoIdx: index('user_video_idx').on(table.userId, table.videoId),
  typeIdx: index('type_idx').on(table.type),
}));

// Comments table
export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  videoId: text('video_id').references(() => videos.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  parentId: text('parent_id').references(() => comments.id),
  likes: integer('likes').default(0),
  isHidden: boolean('is_hidden').default(false),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
});

// Orders table
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  restaurantId: text('restaurant_id').references(() => restaurants.id).notNull(),
  deliveryPartnerId: text('delivery_partner_id').references(() => users.id),
  status: text('status').notNull().default('pending'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal('delivery_fee', { precision: 10, scale: 2 }).default('0'),
  platformFee: decimal('platform_fee', { precision: 10, scale: 2 }).default('0'),
  taxes: decimal('taxes', { precision: 10, scale: 2 }).default('0'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  deliveryAddress: jsonb('delivery_address').notNull(),
  pickupAddress: jsonb('pickup_address'),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').default('pending'),
  notes: text('notes'),
  estimatedDeliveryTime: timestamp('estimated_delivery_time'),
  actualDeliveryTime: timestamp('actual_delivery_time'),
  trackingData: jsonb('tracking_data'),
  rating: integer('rating'),
  review: text('review'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  userIdx: index('order_user_idx').on(table.userId),
  restaurantIdx: index('order_restaurant_idx').on(table.restaurantId),
  statusIdx: index('order_status_idx').on(table.status),
  deliveryPartnerIdx: index('order_delivery_partner_idx').on(table.deliveryPartnerId),
}));

// Order items table
export const orderItems = pgTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id).notNull(),
  menuItemId: text('menu_item_id').references(() => menuItems.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  customizations: text('customizations'),
  specialInstructions: text('special_instructions'),
});

// Delivery partners table
export const deliveryPartners = pgTable('delivery_partners', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  vehicleType: text('vehicle_type').notNull(),
  vehicleNumber: text('vehicle_number').notNull(),
  licenseNumber: text('license_number').notNull(),
  isAvailable: boolean('is_available').default(false),
  currentLocation: jsonb('current_location'),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  totalRatings: integer('total_ratings').default(0),
  totalDeliveries: integer('total_deliveries').default(0),
  earnings: decimal('earnings', { precision: 10, scale: 2 }).default('0'),
  zone: text('zone'),
  status: text('status').default('inactive'), // active, inactive, suspended
  verificationStatus: text('verification_status').default('pending'),
  documents: jsonb('documents'),
  bankDetails: jsonb('bank_details'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
});

// Wallet table
export const wallets = pgTable('wallets', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  balance: decimal('balance', { precision: 10, scale: 2 }).default('0'),
  pendingAmount: decimal('pending_amount', { precision: 10, scale: 2 }).default('0'),
  totalEarnings: decimal('total_earnings', { precision: 10, scale: 2 }).default('0'),
  withdrawableAmount: decimal('withdrawable_amount', { precision: 10, scale: 2 }).default('0'),
  lastWithdrawalAt: timestamp('last_withdrawal_at'),
  bankDetails: jsonb('bank_details'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
});

// Wallet transactions table
export const walletTransactions = pgTable('wallet_transactions', {
  id: text('id').primaryKey(),
  walletId: text('wallet_id').references(() => wallets.id).notNull(),
  type: text('type').notNull(), // 'credit', 'debit', 'withdrawal', 'commission'
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  orderId: text('order_id').references(() => orders.id),
  status: text('status').default('completed'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull(),
});

// Loyalty points table
export const loyaltyPoints = pgTable('loyalty_points', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  currentPoints: integer('current_points').default(0),
  lifetimePoints: integer('lifetime_points').default(0),
  tier: text('tier').default('bronze'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
});

// Loyalty transactions table
export const loyaltyTransactions = pgTable('loyalty_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  points: integer('points').notNull(),
  type: text('type').notNull(), // 'earned', 'redeemed'
  reason: text('reason').notNull(),
  orderId: text('order_id').references(() => orders.id),
  rewardId: text('reward_id'),
  createdAt: timestamp('created_at').notNull(),
});

// Loyalty rewards table
export const loyaltyRewards = pgTable('loyalty_rewards', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  pointsCost: integer('points_cost').notNull(),
  type: text('type').notNull(), // 'discount', 'free_item', 'exclusive_access'
  value: decimal('value', { precision: 10, scale: 2 }),
  validUntil: timestamp('valid_until'),
  isActive: boolean('is_active').default(true),
  maxRedemptions: integer('max_redemptions'),
  currentRedemptions: integer('current_redemptions').default(0),
  createdAt: timestamp('created_at').notNull(),
});

// Referrals table
export const referrals = pgTable('referrals', {
  id: text('id').primaryKey(),
  referrerId: text('referrer_id').references(() => users.id).notNull(),
  referredUserId: text('referred_user_id').references(() => users.id).notNull(),
  status: text('status').default('pending'), // 'pending', 'completed'
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull(),
});

// Referral rewards table
export const referralRewards = pgTable('referral_rewards', {
  id: text('id').primaryKey(),
  referrerId: text('referrer_id').references(() => users.id).notNull(),
  referredUserId: text('referred_user_id').references(() => users.id).notNull(),
  orderId: text('order_id').references(() => orders.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  type: text('type').notNull(), // 'signup_bonus', 'ongoing_bonus'
  status: text('status').default('pending'), // 'pending', 'paid'
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(), // 'order', 'payment', 'system', 'promotion'
  data: jsonb('data'),
  read: boolean('read').default(false),
  createdAt: timestamp('created_at').notNull(),
});

// Analytics events table
export const analyticsEvents = pgTable('analytics_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  sessionId: text('session_id'),
  eventType: text('event_type').notNull(),
  eventData: jsonb('event_data'),
  metadata: jsonb('metadata'),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').notNull(),
}, (table) => ({
  eventTypeIdx: index('event_type_idx').on(table.eventType),
  userIdx: index('analytics_user_idx').on(table.userId),
  createdAtIdx: index('analytics_created_at_idx').on(table.createdAt),
}));

// Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  restaurantId: text('restaurant_id').references(() => restaurants.id).notNull(),
  planId: text('plan_id').notNull(),
  status: text('status').notNull(), // 'active', 'inactive', 'cancelled', 'expired'
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  billingCycle: text('billing_cycle').notNull(), // 'monthly', 'yearly'
  paymentMethod: text('payment_method'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  features: jsonb('features'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
});

// Define relations
export const usersRelations = relations(users, ({ many, one }) => ({
  restaurants: many(restaurants),
  videos: many(videos),
  orders: many(orders),
  deliveryPartner: one(deliveryPartners, {
    fields: [users.id],
    references: [deliveryPartners.userId],
  }),
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  loyaltyPoints: one(loyaltyPoints, {
    fields: [users.id],
    references: [loyaltyPoints.userId],
  }),
  notifications: many(notifications),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  owner: one(users, {
    fields: [restaurants.ownerId],
    references: [users.id],
  }),
  menuItems: many(menuItems),
  videos: many(videos),
  orders: many(orders),
  subscription: one(subscriptions, {
    fields: [restaurants.id],
    references: [subscriptions.restaurantId],
  }),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  creator: one(users, {
    fields: [videos.creatorId],
    references: [users.id],
  }),
  restaurant: one(restaurants, {
    fields: [videos.restaurantId],
    references: [restaurants.id],
  }),
  interactions: many(videoInteractions),
  comments: many(comments),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  restaurant: one(restaurants, {
    fields: [orders.restaurantId],
    references: [restaurants.id],
  }),
  deliveryPartner: one(users, {
    fields: [orders.deliveryPartnerId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(walletTransactions),
}));