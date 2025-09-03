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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  role: varchar("role").default("user"), // user, creator, restaurant, admin
  bio: text("bio"),
  followersCount: integer("followers_count").default(0),
  followingCount: integer("following_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurants table
export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  description: text("description"),
  imageUrl: varchar("image_url"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  deliveryTime: varchar("delivery_time").default("30-45 min"),
  priceRange: varchar("price_range").default("₹₹"),
  address: text("address"),
  phone: varchar("phone"),
  ownerId: varchar("owner_id").references(() => users.id),
  subscriptionPlan: varchar("subscription_plan").default("starter"), // starter, premium
  subscriptionStatus: varchar("subscription_status").default("active"),
  ordersThisMonth: integer("orders_this_month").default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
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
  imageUrl: varchar("image_url"),
  category: varchar("category"),
  isAvailable: boolean("is_available").default(true),
  preparationTime: varchar("preparation_time").default("15-20 min"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Videos table
export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: varchar("creator_id").references(() => users.id),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  title: varchar("title").notNull(),
  description: text("description"),
  videoUrl: varchar("video_url").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  duration: integer("duration"), // in seconds
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  ordersGenerated: integer("orders_generated").default(0),
  status: varchar("status").default("published"), // draft, published, moderated, rejected
  tags: text("tags").array(),
  isPromoted: boolean("is_promoted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  videoId: uuid("video_id").references(() => videos.id),
  items: jsonb("items").notNull(), // array of {menuItemId, quantity, price}
  subtotal: decimal("subtotal", { precision: 8, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 6, scale: 2 }).default("40"),
  gst: decimal("gst", { precision: 6, scale: 2 }).notNull(),
  total: decimal("total", { precision: 8, scale: 2 }).notNull(),
  status: varchar("status").default("pending"), // pending, confirmed, preparing, out_for_delivery, delivered, cancelled
  paymentStatus: varchar("payment_status").default("pending"), // pending, paid, failed, refunded
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  deliveryAddress: text("delivery_address"),
  customerPhone: varchar("customer_phone"),
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Creator Payouts table
export const creatorPayouts = pgTable("creator_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: varchar("creator_id").references(() => users.id),
  orderId: uuid("order_id").references(() => orders.id),
  videoId: uuid("video_id").references(() => videos.id),
  commissionRate: decimal("commission_rate", { precision: 3, scale: 2 }).default("15"), // 15%
  orderAmount: decimal("order_amount", { precision: 8, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 8, scale: 2 }).notNull(),
  status: varchar("status").default("pending"), // pending, paid, cancelled
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Preferences table
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  cuisineTypes: text("cuisine_types").array(),
  spiceLevel: varchar("spice_level").default("medium"),
  dietaryRestrictions: text("dietary_restrictions").array(),
  priceRange: varchar("price_range").default("medium"),
  deliveryRadius: integer("delivery_radius").default(10), // km
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Interactions table (for recommendation engine)
export const userInteractions = pgTable("user_interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  videoId: uuid("video_id").references(() => videos.id),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  interactionType: varchar("interaction_type").notNull(), // view, like, comment, share, order
  watchTime: integer("watch_time"), // seconds watched
  timestamp: timestamp("timestamp").defaultNow(),
});

// Follows table
export const follows = pgTable("follows", {
  id: uuid("id").primaryKey().defaultRandom(),
  followerId: varchar("follower_id").references(() => users.id),
  followingId: varchar("following_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id").references(() => videos.id),
  userId: varchar("user_id").references(() => users.id),
  content: text("content").notNull(),
  likes: integer("likes").default(0),
  parentId: uuid("parent_id").references(() => comments.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Delivery Partners table
export const deliveryPartners = pgTable("delivery_partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name").notNull(),
  phone: varchar("phone").notNull(),
  email: varchar("email"),
  vehicleType: varchar("vehicle_type").default("bike"), // bike, scooter, car
  vehicleNumber: varchar("vehicle_number"),
  licenseNumber: varchar("license_number"),
  isAvailable: boolean("is_available").default(true),
  isVerified: boolean("is_verified").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalDeliveries: integer("total_deliveries").default(0),
  currentLat: decimal("current_lat", { precision: 10, scale: 8 }),
  currentLng: decimal("current_lng", { precision: 11, scale: 8 }),
  earnings: decimal("earnings", { precision: 10, scale: 2 }).default("0"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery Tracking table
export const deliveryTracking = pgTable("delivery_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  deliveryPartnerId: uuid("delivery_partner_id").references(() => deliveryPartners.id),
  status: varchar("status").default("assigned"), // assigned, picked_up, in_transit, delivered, cancelled
  estimatedTime: integer("estimated_time"), // minutes
  actualTime: integer("actual_time"), // minutes
  pickupLat: decimal("pickup_lat", { precision: 10, scale: 8 }),
  pickupLng: decimal("pickup_lng", { precision: 11, scale: 8 }),
  dropoffLat: decimal("dropoff_lat", { precision: 10, scale: 8 }),
  dropoffLng: decimal("dropoff_lng", { precision: 11, scale: 8 }),
  currentLat: decimal("current_lat", { precision: 10, scale: 8 }),
  currentLng: decimal("current_lng", { precision: 11, scale: 8 }),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery Partner Earnings table
export const deliveryEarnings = pgTable("delivery_earnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryPartnerId: uuid("delivery_partner_id").references(() => deliveryPartners.id),
  orderId: uuid("order_id").references(() => orders.id),
  baseAmount: decimal("base_amount", { precision: 8, scale: 2 }).notNull(),
  distanceBonus: decimal("distance_bonus", { precision: 6, scale: 2 }).default("0"),
  timeBonus: decimal("time_bonus", { precision: 6, scale: 2 }).default("0"),
  tipAmount: decimal("tip_amount", { precision: 6, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 8, scale: 2 }).notNull(),
  status: varchar("status").default("pending"), // pending, paid
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  orders: many(orders),
  payouts: many(creatorPayouts),
  preferences: many(userPreferences),
  interactions: many(userInteractions),
  comments: many(comments),
  restaurants: many(restaurants),
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
  interactions: many(userInteractions),
  comments: many(comments),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [orders.restaurantId], references: [restaurants.id] }),
  video: one(videos, { fields: [orders.videoId], references: [videos.id] }),
  deliveryTracking: many(deliveryTracking),
}));

export const deliveryPartnersRelations = relations(deliveryPartners, ({ one, many }) => ({
  user: one(users, { fields: [deliveryPartners.userId], references: [users.id] }),
  deliveries: many(deliveryTracking),
  earnings: many(deliveryEarnings),
}));

export const deliveryTrackingRelations = relations(deliveryTracking, ({ one }) => ({
  order: one(orders, { fields: [deliveryTracking.orderId], references: [orders.id] }),
  deliveryPartner: one(deliveryPartners, { fields: [deliveryTracking.deliveryPartnerId], references: [deliveryPartners.id] }),
}));

export const deliveryEarningsRelations = relations(deliveryEarnings, ({ one }) => ({
  deliveryPartner: one(deliveryPartners, { fields: [deliveryEarnings.deliveryPartnerId], references: [deliveryPartners.id] }),
  order: one(orders, { fields: [deliveryEarnings.orderId], references: [orders.id] }),
}));

// Delivery Partner Wallet table
export const deliveryWallet = pgTable("delivery_wallet", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryPartnerId: uuid("delivery_partner_id").references(() => deliveryPartners.id),
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
  deliveryPartnerId: uuid("delivery_partner_id").references(() => deliveryPartners.id),
  type: varchar("type").notNull(), // earning, withdrawal, bonus, penalty, adjustment
  amount: decimal("amount", { precision: 8, scale: 2 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status").default("completed"), // pending, completed, failed
  referenceId: uuid("reference_id"), // orderId, withdrawalId, etc.
  metadata: jsonb("metadata"), // additional transaction details
  createdAt: timestamp("created_at").defaultNow(),
});

// Withdrawal Methods table
export const withdrawalMethods = pgTable("withdrawal_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryPartnerId: uuid("delivery_partner_id").references(() => deliveryPartners.id),
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
  deliveryPartnerId: uuid("delivery_partner_id").references(() => deliveryPartners.id),
  methodId: uuid("method_id").references(() => withdrawalMethods.id),
  amount: decimal("amount", { precision: 8, scale: 2 }).notNull(),
  status: varchar("status").default("pending"), // pending, approved, rejected, completed
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at"),
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

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  deliveryPartnerId: uuid("delivery_partner_id").references(() => deliveryPartners.id),
  type: varchar("type").notNull(), // order_update, payment, promotion, system
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // additional notification data
  isRead: boolean("is_read").default(false),
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Support Tickets table
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  deliveryPartnerId: uuid("delivery_partner_id").references(() => deliveryPartners.id),
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

// Analytics Events table
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: varchar("event_type").notNull(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  videoId: uuid("video_id").references(() => videos.id),
  orderId: uuid("order_id").references(() => orders.id),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  deliveryPartnerId: uuid("delivery_partner_id").references(() => deliveryPartners.id),
  properties: jsonb("properties"), // event-specific data
  timestamp: timestamp("timestamp").defaultNow(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  location: jsonb("location"), // lat, lng, city, country
});

// Insert schemas
export const insertRestaurantSchema = createInsertSchema(restaurants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true, createdAt: true });
export const insertDeliveryPartnerSchema = createInsertSchema(deliveryPartners).omit({ id: true, createdAt: true, updatedAt: true });
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
export type UserInteraction = typeof userInteractions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type DeliveryPartner = typeof deliveryPartners.$inferSelect;
export type DeliveryTracking = typeof deliveryTracking.$inferSelect;
export type DeliveryEarnings = typeof deliveryEarnings.$inferSelect;

export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertDeliveryPartner = z.infer<typeof insertDeliveryPartnerSchema>;
export type InsertDeliveryTracking = z.infer<typeof insertDeliveryTrackingSchema>;
