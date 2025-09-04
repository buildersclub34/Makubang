
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb, uuid, serial, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  profilePicture: text('profile_picture'),
  role: varchar('role', { length: 50 }).default('user').notNull(), // user, restaurant_owner, admin, delivery_partner
  isVerified: boolean('is_verified').default(false),
  fcmTokens: jsonb('fcm_tokens').default([]),
  preferences: jsonb('preferences').default({}),
  address: jsonb('address').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Restaurants table
export const restaurants = pgTable('restaurants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  cuisine: varchar('cuisine', { length: 100 }),
  address: jsonb('address').notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  logo: text('logo'),
  coverImage: text('cover_image'),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  totalRatings: integer('total_ratings').default(0),
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  openingHours: jsonb('opening_hours').default({}),
  deliveryRadius: integer('delivery_radius').default(5), // in km
  minimumOrder: decimal('minimum_order', { precision: 10, scale: 2 }).default('0'),
  deliveryFee: decimal('delivery_fee', { precision: 10, scale: 2 }).default('0'),
  estimatedDeliveryTime: integer('estimated_delivery_time').default(30), // in minutes
  ownerId: uuid('owner_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Menu items/dishes table
export const dishes = pgTable('dishes', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
  category: varchar('category', { length: 100 }),
  tags: jsonb('tags').default([]),
  images: jsonb('images').default([]),
  isVegetarian: boolean('is_vegetarian').default(false),
  isVegan: boolean('is_vegan').default(false),
  isGlutenFree: boolean('is_gluten_free').default(false),
  spicyLevel: integer('spicy_level').default(0), // 0-5 scale
  calories: integer('calories'),
  preparationTime: integer('preparation_time').default(15), // in minutes
  isAvailable: boolean('is_available').default(true),
  popularity: integer('popularity').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Videos/content table
export const videos = pgTable('videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  videoUrl: text('video_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  duration: integer('duration'), // in seconds
  views: integer('views').default(0),
  likes: integer('likes').default(0),
  shares: integer('shares').default(0),
  creatorId: uuid('creator_id').references(() => users.id).notNull(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id),
  dishId: uuid('dish_id').references(() => dishes.id),
  tags: jsonb('tags').default([]),
  isPublished: boolean('is_published').default(false),
  moderationStatus: varchar('moderation_status', { length: 50 }).default('pending'), // pending, approved, rejected
  moderationNotes: text('moderation_notes'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Orders table
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: varchar('order_number', { length: 50 }).unique().notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  items: jsonb('items').notNull(), // Array of order items
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal('delivery_fee', { precision: 10, scale: 2 }).default('0'),
  tax: decimal('tax', { precision: 10, scale: 2 }).default('0'),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR'),
  deliveryAddress: jsonb('delivery_address').notNull(),
  deliveryInstructions: text('delivery_instructions'),
  estimatedDeliveryTime: timestamp('estimated_delivery_time'),
  actualDeliveryTime: timestamp('actual_delivery_time'),
  deliveryPartnerId: uuid('delivery_partner_id').references(() => users.id),
  paymentId: uuid('payment_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Payments table
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR'),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  externalPaymentId: varchar('external_payment_id', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Subscription plans table
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR'),
  orderLimit: integer('order_limit'), // null for unlimited
  durationDays: integer('duration_days').default(30),
  features: jsonb('features').default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Restaurant subscriptions table
export const restaurantSubscriptions = pgTable('restaurant_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id).notNull(),
  planId: uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
  startDate: timestamp('start_date').defaultNow().notNull(),
  endDate: timestamp('end_date').notNull(),
  ordersUsed: integer('orders_used').default(0),
  isActive: boolean('is_active').default(true),
  paymentId: uuid('payment_id').references(() => payments.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  imageUrl: text('image_url'),
  actionUrl: text('action_url'),
  metadata: jsonb('metadata').default({}),
  read: boolean('read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User notification settings table
export const userNotificationSettings = pgTable('user_notification_settings', {
  userId: uuid('user_id').references(() => users.id).primaryKey(),
  emailSettings: jsonb('email_settings').default({}),
  pushSettings: jsonb('push_settings').default({}),
  inAppSettings: jsonb('in_app_settings').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User devices table for push notifications
export const userDevices = pgTable('user_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  deviceId: varchar('device_id', { length: 255 }).notNull(),
  platform: varchar('platform', { length: 50 }).notNull(), // ios, android, web
  pushToken: text('push_token'),
  pushEnabled: boolean('push_enabled').default(true),
  metadata: jsonb('metadata').default({}),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Social features - follows
export const follows = pgTable('follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerId: uuid('follower_id').references(() => users.id).notNull(),
  followingId: uuid('following_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Video interactions (likes, comments, shares)
export const videoLikes = pgTable('video_likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  videoId: uuid('video_id').references(() => videos.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const videoComments = pgTable('video_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  videoId: uuid('video_id').references(() => videos.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  comment: text('comment').notNull(),
  parentId: uuid('parent_id').references(() => videoComments.id),
  likes: integer('likes').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  restaurants: many(restaurants),
  orders: many(orders),
  payments: many(payments),
  notifications: many(notifications),
  videos: many(videos),
  followers: many(follows, { relationName: 'followers' }),
  following: many(follows, { relationName: 'following' }),
  videoLikes: many(videoLikes),
  videoComments: many(videoComments),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  owner: one(users, { fields: [restaurants.ownerId], references: [users.id] }),
  dishes: many(dishes),
  orders: many(orders),
  videos: many(videos),
  subscriptions: many(restaurantSubscriptions),
}));

export const dishesRelations = relations(dishes, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [dishes.restaurantId], references: [restaurants.id] }),
  videos: many(videos),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  creator: one(users, { fields: [videos.creatorId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [videos.restaurantId], references: [restaurants.id] }),
  dish: one(dishes, { fields: [videos.dishId], references: [dishes.id] }),
  likes: many(videoLikes),
  comments: many(videoComments),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [orders.restaurantId], references: [restaurants.id] }),
  deliveryPartner: one(users, { fields: [orders.deliveryPartnerId], references: [users.id] }),
}));

// Enums
export const paymentStatus = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'] as const;
export const paymentMethod = ['razorpay', 'stripe', 'wallet', 'cash'] as const;
export const orderStatus = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'] as const;
export const userRoles = ['user', 'restaurant_owner', 'admin', 'delivery_partner', 'influencer'] as const;
export const moderationStatus = ['pending', 'approved', 'rejected', 'flagged'] as const;
export const notificationTypes = [
  'order_created', 'order_status_updated', 'order_delayed', 
  'payment_successful', 'payment_failed',
  'delivery_assigned', 'delivery_started', 'delivery_completed',
  'new_message', 'account_activity', 'promotion'
] as const;

export type PaymentStatus = typeof paymentStatus[number];
export type PaymentMethod = typeof paymentMethod[number];
export type OrderStatus = typeof orderStatus[number];
export type UserRole = typeof userRoles[number];
export type ModerationStatus = typeof moderationStatus[number];
export type NotificationType = typeof notificationTypes[number];
