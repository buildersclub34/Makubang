// MongoDB initialization script
db = db.getSiblingDB('makubang');

// Create collections with indexes
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ phone: 1 }, { unique: true, sparse: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

db.createCollection('videos');
db.videos.createIndex({ ownerId: 1 });
db.videos.createIndex({ restaurantId: 1 });
db.videos.createIndex({ moderationStatus: 1 });
db.videos.createIndex({ isPublic: 1 });
db.videos.createIndex({ createdAt: -1 });
db.videos.createIndex({ engagementScore: -1 });
db.videos.createIndex({ tags: 1 });

db.createCollection('restaurants');
db.restaurants.createIndex({ ownerId: 1 });
db.restaurants.createIndex({ isActive: 1 });
db.restaurants.createIndex({ 'location.coordinates': '2dsphere' });

db.createCollection('orders');
db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ restaurantId: 1 });
db.orders.createIndex({ deliveryPartnerId: 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ createdAt: -1 });
db.orders.createIndex({ razorpayOrderId: 1 }, { unique: true, sparse: true });

db.createCollection('delivery_partners');
db.delivery_partners.createIndex({ userId: 1 }, { unique: true });
db.delivery_partners.createIndex({ status: 1 });
db.delivery_partners.createIndex({ isOnline: 1 });
db.delivery_partners.createIndex({ 'currentLocation.coordinates': '2dsphere' });

db.createCollection('follows');
db.follows.createIndex({ followerId: 1, followingId: 1 }, { unique: true });
db.follows.createIndex({ followerId: 1 });
db.follows.createIndex({ followingId: 1 });

db.createCollection('video_likes');
db.video_likes.createIndex({ userId: 1, videoId: 1 }, { unique: true });
db.video_likes.createIndex({ videoId: 1 });

db.createCollection('video_comments');
db.video_comments.createIndex({ videoId: 1 });
db.video_comments.createIndex({ userId: 1 });
db.video_comments.createIndex({ createdAt: -1 });

db.createCollection('notifications');
db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ read: 1 });
db.notifications.createIndex({ createdAt: -1 });

db.createCollection('subscription_plans');
db.subscription_plans.createIndex({ isActive: 1 });
db.subscription_plans.createIndex({ price: 1 });

db.createCollection('restaurant_subscriptions');
db.restaurant_subscriptions.createIndex({ restaurantId: 1 });
db.restaurant_subscriptions.createIndex({ status: 1 });
db.restaurant_subscriptions.createIndex({ endDate: 1 });

db.createCollection('menu_items');
db.menu_items.createIndex({ restaurantId: 1 });
db.menu_items.createIndex({ category: 1 });
db.menu_items.createIndex({ isAvailable: 1 });

// Insert default subscription plans
db.subscription_plans.insertMany([
  {
    _id: ObjectId(),
    name: 'Starter',
    description: 'Perfect for small restaurants',
    price: 1000,
    currency: 'INR',
    durationDays: 30,
    orderLimit: 20,
    features: ['Basic analytics', 'Standard support'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: 'Pro',
    description: 'For growing restaurants',
    price: 3000,
    currency: 'INR',
    durationDays: 30,
    orderLimit: 80,
    features: ['Advanced analytics', 'Priority support', 'Marketing tools'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: 'Unlimited',
    description: 'For high-volume restaurants',
    price: 8000,
    currency: 'INR',
    durationDays: 30,
    orderLimit: -1, // Unlimited
    features: ['Premium analytics', '24/7 support', 'Custom integrations', 'Dedicated account manager'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Create admin user
db.users.insertOne({
  _id: ObjectId(),
  email: 'admin@makubang.com',
  password: '$2b$10$kQZwGQDWZwzCUwQ5wQ5wGu8WsUWGQZwGQDWZwzCUwQ5wQ5wGu8WsU', // 'admin123'
  name: 'Admin User',
  role: 'admin',
  isActive: true,
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialized successfully!');
