
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").unique().notNull(),
  phone: varchar("phone"),
  role: varchar("role").default("customer"), // customer, restaurant, creator, admin, delivery_partner
  avatar: text("avatar"),
  bio: text("bio"),
  specialties: jsonb("specialties"), // for creators - cooking styles, cuisines
  location: jsonb("location"), // {address, lat, lng, city, state}
  preferences: jsonb("preferences"), // user food preferences, dietary restrictions
  socialLinks: jsonb("social_links"), // instagram, youtube, etc.
  isVerified: boolean("is_verified").default(false),
  followers: integer("followers").default(0),
  following: integer("following").default(0),
  totalVideos: integer("total_videos").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurants table
export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: varchar("owner_id").references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  cuisine: jsonb("cuisine"), // array of cuisine types
  address: text("address").notNull(),
  location: jsonb("location"), // {lat, lng, area, city, state, pincode}
  phone: varchar("phone"),
  email: varchar("email"),
  images: jsonb("images"), // array of image URLs
  menu: jsonb("menu"), // complete menu with categories, items, prices
  operatingHours: jsonb("operating_hours"), // {monday: {open, close}, ...}
  isActive: boolean("is_active").default(true),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalOrders: integer("total_orders").default(0),
  subscriptionStatus: varchar("subscription_status").default("inactive"), // inactive, active, expired
  subscriptionPlan: varchar("subscription_plan"), // starter, premium, enterprise
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  verificationStatus: varchar("verification_status").default("pending"), // pending, verified, rejected
  bankDetails: jsonb("bank_details"), // encrypted bank account info
  gstNumber: varchar("gst_number"),
  fssaiLicense: varchar("fssai_license"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu Items table
export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  name: varchar("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 8, scale: 2 }).notNull(),
  category: varchar("category").notNull(),
  image: text("image"),
  isVegetarian: boolean("is_vegetarian").default(false),
  isVegan: boolean("is_vegan").default(false),
  isGlutenFree: boolean("is_gluten_free").default(false),
  spiceLevel: integer("spice_level").default(0), // 0-5
  preparationTime: integer("preparation_time"), // in minutes
  ingredients: jsonb("ingredients"), // array of ingredients
  allergens: jsonb("allergens"), // array of allergens
  nutritionalInfo: jsonb("nutritional_info"), // calories, protein, etc.
  isAvailable: boolean("is_available").default(true),
  customizations: jsonb("customizations"), // available customizations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Videos table
export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: varchar("creator_id").references(() => users.id),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  title: varchar("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"), // in seconds
  fileSize: integer("file_size"), // in bytes
  resolution: varchar("resolution"), // 1080p, 720p, etc.
  tags: jsonb("tags"), // array of hashtags
  menuItems: jsonb("menu_items"), // linked menu items for ordering
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  comments: integer("comments").default(0),
  orders: integer("orders").default(0), // orders generated from this video
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status").default("published"), // draft, published, moderated, removed
  moderationFlags: jsonb("moderation_flags"), // content moderation results
  isPromoted: boolean("is_promoted").default(false),
  promotionEndsAt: timestamp("promotion_ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  videoId: uuid("video_id").references(() => videos.id),
  items: jsonb("items").notNull(), // array of {menuItemId, name, price, quantity, customizations}
  subtotal: decimal("subtotal", { precision: 8, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 6, scale: 2 }).default("40"),
  gst: decimal("gst", { precision: 6, scale: 2 }).notNull(),
  total: decimal("total", { precision: 8, scale: 2 }).notNull(),
  status: varchar("status").default("pending"), // pending, confirmed, preparing, picked_up, out_for_delivery, delivered, cancelled
  paymentStatus: varchar("payment_status").default("pending"), // pending, paid, failed, refunded
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  deliveryAddress: text("delivery_address"),
  customerPhone: varchar("customer_phone"),
  customerNotes: text("customer_notes"),
  assignedPartnerId: varchar("assigned_partner_id").references(() => users.id),
  estimatedPickup: timestamp("estimated_pickup"),
  actualPickup: timestamp("actual_pickup"),
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  rating: integer("rating"), // 1-5 stars
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order Items table
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 8, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 8, scale: 2 }).notNull(),
  customizations: jsonb("customizations"), // special requests, modifications
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  planId: varchar("plan_id").notNull(), // starter, premium, enterprise
  planName: varchar("plan_name").notNull(),
  price: decimal("price", { precision: 8, scale: 2 }).notNull(),
  orderLimit: integer("order_limit").notNull(), // -1 for unlimited
  ordersUsed: integer("orders_used").default(0),
  features: jsonb("features"), // array of included features
  status: varchar("status").default("pending"), // pending_payment, active, expired, cancelled
  paymentIntentId: varchar("payment_intent_id"),
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  autoRenew: boolean("auto_renew").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery Partners table
export const deliveryPartners = pgTable("delivery_partners", {
  id: varchar("id").primaryKey().references(() => users.id),
  vehicleType: varchar("vehicle_type"), // bike, scooter, car, cycle
  vehicleNumber: varchar("vehicle_number"),
  licenseNumber: varchar("license_number"),
  aadharNumber: varchar("aadhar_number"),
  panNumber: varchar("pan_number"),
  currentLocation: jsonb("current_location"), // {lat, lng, address}
  isAvailable: boolean("is_available").default(true),
  isOnline: boolean("is_online").default(false),
  currentOrderId: uuid("current_order_id"),
  totalDeliveries: integer("total_deliveries").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.0"),
  earnings: decimal("earnings", { precision: 10, scale: 2 }).default("0"),
  verificationStatus: varchar("verification_status").default("pending"), // pending, verified, rejected
  bankDetails: jsonb("bank_details"), // encrypted bank account info
  documentsVerified: boolean("documents_verified").default(false),
  lastActiveAt: timestamp("last_active_at"),
  joinedAt: timestamp("joined_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery Tracking table
export const deliveryTracking = pgTable("delivery_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  deliveryPartnerId: varchar("delivery_partner_id").references(() => deliveryPartners.id),
  status: varchar("status").notNull(), // assigned, picked_up, in_transit, delivered, cancelled
  currentLocation: jsonb("current_location"), // {lat, lng, address, timestamp}
  estimatedArrival: timestamp("estimated_arrival"),
  actualArrival: timestamp("actual_arrival"),
  distanceRemaining: decimal("distance_remaining", { precision: 8, scale: 2 }), // in km
  timeRemaining: integer("time_remaining"), // in minutes
  route: jsonb("route"), // array of coordinates for route
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery Partner Wallet table
export const deliveryWallet = pgTable("delivery_wallet", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryPartnerId: varchar("delivery_partner_id").references(() => deliveryPartners.id),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).default("0"),
  pendingBalance: decimal("pending_balance", { precision: 10, scale: 2 }).default("0"),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0"),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet Transactions table
export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryPartnerId: varchar("delivery_partner_id").references(() => deliveryPartners.id),
  type: varchar("type").notNull(), // earning, withdrawal, bonus, penalty, adjustment
  amount: decimal("amount", { precision: 8, scale: 2 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status").default("completed"), // pending, completed, failed
  referenceId: uuid("reference_id"), // orderId, withdrawalId, etc.
  metadata: jsonb("metadata"), // additional transaction details
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Withdrawal Methods table
export const withdrawalMethods = pgTable("withdrawal_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryPartnerId: varchar("delivery_partner_id").references(() => deliveryPartners.id),
  type: varchar("type").notNull(), // bank, upi, paytm, phonepe
  details: jsonb("details").notNull(), // account details, UPI ID, etc.
  isDefault: boolean("is_default").default(false),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Withdrawal Requests table
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryPartnerId: varchar("delivery_partner_id").references(() => deliveryPartners.id),
  methodId: uuid("method_id").references(() => withdrawalMethods.id),
  amount: decimal("amount", { precision: 8, scale: 2 }).notNull(),
  status: varchar("status").default("pending"), // pending, approved, rejected, completed
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video Interactions table (for ML recommendations)
export const videoInteractions = pgTable("video_interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  videoId: uuid("video_id").references(() => videos.id),
  interactionType: varchar("interaction_type").notNull(), // view, like, share, comment, order, skip
  watchTime: integer("watch_time"), // seconds watched
  value: text("value"), // comment text, rating, etc.
  deviceType: varchar("device_type"), // mobile, desktop, tablet
  location: jsonb("location"), // {lat, lng, city}
  sessionId: varchar("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  videoId: uuid("video_id").references(() => videos.id),
  parentId: uuid("parent_id").references(() => comments.id), // for replies
  content: text("content").notNull(),
  likes: integer("likes").default(0),
  isModerated: boolean("is_moderated").default(false),
  moderationReason: text("moderation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  deliveryPartnerId: varchar("delivery_partner_id").references(() => deliveryPartners.id),
  type: varchar("type").notNull(), // order_update, payment, promotion, system
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // additional notification data
  isRead: boolean("is_read").default(false),
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  expiresAt: timestamp("expires_at"),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  channelType: varchar("channel_type").default("in_app"), // in_app, push, email, sms
  createdAt: timestamp("created_at").defaultNow(),
});

// Creator Payouts table
export const creatorPayouts = pgTable("creator_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: varchar("creator_id").references(() => users.id),
  videoId: uuid("video_id").references(() => videos.id),
  orderId: uuid("order_id").references(() => orders.id),
  orderValue: decimal("order_value", { precision: 8, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(), // percentage
  commissionAmount: decimal("commission_amount", { precision: 8, scale: 2 }).notNull(),
  status: varchar("status").default("pending"), // pending, paid, on_hold
  paidAt: timestamp("paid_at"),
  paymentReference: varchar("payment_reference"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics Events table
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  eventType: varchar("event_type").notNull(), // page_view, video_view, order_placed, etc.
  entityType: varchar("entity_type"), // video, restaurant, user, order
  entityId: varchar("entity_id"),
  properties: jsonb("properties"), // additional event data
  sessionId: varchar("session_id"),
  deviceInfo: jsonb("device_info"), // device type, OS, browser, app version
  location: jsonb("location"), // {lat, lng, city, country}
  timestamp: timestamp("timestamp").defaultNow(),
});

// Content Moderation table
export const contentModerations = pgTable("content_moderations", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: varchar("content_id").notNull(),
  contentType: varchar("content_type").notNull(), // video, comment, user_profile
  moderatorId: varchar("moderator_id").references(() => users.id),
  action: varchar("action").notNull(), // approve, reject, flag, remove
  reason: text("reason"),
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 4 }), // AI moderation confidence
  aiFlags: jsonb("ai_flags"), // array of AI-detected issues
  manualReview: boolean("manual_review").default(false),
  status: varchar("status").default("pending"), // pending, resolved, escalated
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Follows table (social graph)
export const follows = pgTable("follows", {
  id: uuid("id").primaryKey().defaultRandom(),
  followerId: varchar("follower_id").references(() => users.id),
  followingId: varchar("following_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Trending Items table
export const trendingItems = pgTable("trending_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // dish, restaurant, creator, hashtag, cuisine
  mentions: integer("mentions").default(0),
  growth: decimal("growth", { precision: 5, scale: 2 }).default("0"), // growth percentage
  metadata: jsonb("metadata"), // additional data like image, description, etc.
  calculatedAt: timestamp("calculated_at").defaultNow(),
  rank: integer("rank"),
});

// Collaborations table (creator marketplace)
export const collaborations = pgTable("collaborations", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  creatorId: varchar("creator_id").references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  requirements: jsonb("requirements"), // array of strings
  deliverables: jsonb("deliverables"), // array of strings
  budget: decimal("budget", { precision: 8, scale: 2 }).notNull(),
  deadline: timestamp("deadline"),
  status: varchar("status").default("pending"), // pending, accepted, in_progress, completed, cancelled
  contractTerms: text("contract_terms"),
  paymentStatus: varchar("payment_status").default("pending"), // pending, paid, on_hold
  finalDeliverables: jsonb("final_deliverables"), // submitted content URLs
  feedback: text("feedback"),
  rating: integer("rating"), // 1-5 stars
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Support Tickets table
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  deliveryPartnerId: varchar("delivery_partner_id").references(() => deliveryPartners.id),
  subject: varchar("subject").notNull(),
  description: text("description").notNull(),
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  status: varchar("status").default("open"), // open, in_progress, resolved, closed
  category: varchar("category").notNull(), // technical, payment, account, delivery
  assignedTo: varchar("assigned_to"),
  adminNotes: text("admin_notes"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Preferences table
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  cuisinePreferences: jsonb("cuisine_preferences"), // preferred cuisines
  dietaryRestrictions: jsonb("dietary_restrictions"), // vegetarian, vegan, etc.
  spicePreference: integer("spice_preference").default(2), // 0-5 scale
  budgetRange: jsonb("budget_range"), // {min, max}
  orderFrequency: varchar("order_frequency"), // daily, weekly, monthly
  preferredMealTimes: jsonb("preferred_meal_times"), // breakfast, lunch, dinner
  deliveryPreferences: jsonb("delivery_preferences"), // time slots, instructions
  notificationSettings: jsonb("notification_settings"), // email, sms, push preferences
  privacySettings: jsonb("privacy_settings"), // profile visibility, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  orders: many(orders),
  payouts: many(creatorPayouts),
  interactions: many(videoInteractions),
  comments: many(comments),
  restaurants: many(restaurants),
  preferences: many(userPreferences),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  owner: one(users, { fields: [restaurants.ownerId], references: [users.id] }),
  videos: many(videos),
  orders: many(orders),
  menuItems: many(menuItems),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  creator: one(users, { fields: [videos.creatorId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [videos.restaurantId], references: [restaurants.id] }),
  orders: many(orders),
  payouts: many(creatorPayouts),
  interactions: many(videoInteractions),
  comments: many(comments),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [orders.restaurantId], references: [restaurants.id] }),
  video: one(videos, { fields: [orders.videoId], references: [videos.id] }),
  deliveryTracking: many(deliveryTracking),
}));

export const deliveryPartnersRelations = relations(deliveryPartners, ({ one, many }) => ({
  user: one(users, { fields: [deliveryPartners.id], references: [users.id] }),
  deliveries: many(deliveryTracking),
  wallet: many(deliveryWallet),
}));

export const deliveryTrackingRelations = relations(deliveryTracking, ({ one }) => ({
  order: one(orders, { fields: [deliveryTracking.orderId], references: [orders.id] }),
  deliveryPartner: one(deliveryPartners, { fields: [deliveryTracking.deliveryPartnerId], references: [deliveryPartners.id] }),
}));

// Insert schemas
export const insertRestaurantSchema = createInsertSchema(restaurants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliveryPartnerSchema = createInsertSchema(deliveryPartners).omit({ joinedAt: true, updatedAt: true });
export const insertDeliveryTrackingSchema = createInsertSchema(deliveryTracking).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type CreatorPayout = typeof creatorPayouts.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type VideoInteraction = typeof videoInteractions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type DeliveryPartner = typeof deliveryPartners.$inferSelect;
export type DeliveryTracking = typeof deliveryTracking.$inferSelect;
export type DeliveryWallet = typeof deliveryWallet.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertDeliveryPartner = z.infer<typeof insertDeliveryPartnerSchema>;
export type InsertDeliveryTracking = z.infer<typeof insertDeliveryTrackingSchema>;
