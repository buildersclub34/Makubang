# Makubang - Food Discovery & Ordering Platform

A content-first, shoppable food video platform where users scroll through Instagram-style reels, discover food, follow friends/influencers/restaurants, and instantly order dishes with integrated payment and delivery tracking.

## 🌟 Features

### User Experience
- **Instagram-style Feed**: Vertical video scrolling with food content
- **Swipe Gestures**: Slide left to add to cart, slide right for instant buy
- **Social Features**: Follow friends, restaurants, and influencers
- **Real-time Engagement**: Like, comment, and share videos
- **Personalized Recommendations**: AI-powered content discovery

### Ordering & Payments
- **Instant Ordering**: Quick order from video feed
- **Cart Management**: Add multiple items and checkout
- **Razorpay Integration**: Secure payments with UPI, cards, wallets
- **GST Calculations**: Automatic tax calculations and invoicing
- **Order Tracking**: Real-time delivery updates

### Delivery System
- **In-house Delivery**: Own delivery partner network
- **Live Tracking**: GPS-based real-time location updates
- **OTP Verification**: Secure pickup and delivery confirmation
- **Earnings Dashboard**: Partner earnings and payout tracking

### Restaurant Management
- **Menu Management**: Full CRUD operations for menu items
- **Subscription Plans**: Starter/Pro/Unlimited tiers with order limits
- **Analytics Dashboard**: Performance metrics and insights
- **Order Management**: Real-time order processing

### Content & Moderation
- **Video Processing**: HLS streaming with multiple resolutions
- **Content Moderation**: Admin approval workflow
- **Auto-flagging**: Community reporting system
- **User Management**: Suspend/ban capabilities

## 🏗️ Architecture

### Backend Stack
- **Node.js/Express**: REST API and WebSocket server
- **MongoDB**: Primary database with geospatial indexes
- **Redis**: Caching and session storage
- **Socket.io**: Real-time communications
- **FFmpeg**: Video processing and HLS streaming

### Frontend Stack
- **React**: Main web application
- **React Native**: Mobile apps (User + Delivery Partner)
- **TailwindCSS**: Styling framework
- **HLS.js**: Video streaming player
- **React Query**: State management and caching

### Infrastructure
- **Docker**: Containerized deployment
- **Nginx**: Load balancer and reverse proxy
- **MinIO**: S3-compatible object storage
- **MongoDB Atlas**: Cloud database option

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB (local or Atlas)
- Redis (local or cloud)

### Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-org/makubang.git
cd makubang
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Environment Setup**
```bash
# Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Update with your credentials:
# - MongoDB connection string
# - Redis URL
# - Razorpay keys
# - AWS/S3 credentials
# - JWT secrets
```

4. **Start with Docker Compose**
```bash
cd server
docker-compose up -d
```

5. **Start development servers**
```bash
# Backend
npm run dev:backend

# Frontend
cd client && npm run dev

# Mobile (optional)
npm run dev:mobile
npm run dev:delivery
```

### Manual Setup (without Docker)

1. **Start required services**
```bash
# MongoDB
mongod --dbpath /path/to/data

# Redis
redis-server
```

2. **Setup database**
```bash
# Import initial data
mongoimport --db makubang --collection subscription_plans --file server/data/plans.json
```

3. **Start application**
```bash
# Backend
cd server && npm run dev

# Frontend
cd client && npm run dev
```

## 📱 Mobile Apps

### User App (React Native)
```bash
cd mobile
npm install
npm start
```

### Delivery Partner App
```bash
cd delivery-app
npm install
npm start
```

## 🛠️ Configuration

### Environment Variables

#### Server (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/makubang
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# AWS/S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=makubang-videos
CDN_URL=https://your-cdn.com

# External APIs
CLIENT_URL=http://localhost:3000
```

#### Client (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
VITE_RAZORPAY_KEY_ID=your_key_id
```

## 📊 API Documentation

### Authentication
```bash
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Content & Feed
```bash
GET  /api/feed/personalized
GET  /api/feed/explore
GET  /api/feed/trending
POST /api/videos/upload
GET  /api/videos/:id
```

### Social Features
```bash
POST   /api/social/:userId/follow
DELETE /api/social/:userId/follow
GET    /api/social/:userId/counters
```

### Engagement
```bash
POST   /api/engagement/videos/:id/like
DELETE /api/engagement/videos/:id/like
POST   /api/engagement/videos/:id/comments
GET    /api/engagement/videos/:id/comments
```

### Orders & Payments
```bash
POST /api/payments/create-order
POST /api/payments/verify-payment
GET  /api/orders
GET  /api/orders/:id
```

### Delivery Partner
```bash
POST /api/delivery-partners/register
POST /api/delivery-partners/status
POST /api/delivery-partners/assignments/:id/accept
POST /api/delivery-partners/assignments/:id/verify-pickup
```

### Admin & Moderation
```bash
GET  /api/admin/moderation/pending
POST /api/admin/moderation/videos/:id/approve
POST /api/admin/moderation/videos/:id/reject
GET  /api/admin/moderation/stats
```

## 🔧 Development

### Code Structure
```
├── server/                 # Backend API
│   ├── controllers/        # Route controllers
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   └── lib/               # Utilities
├── client/                # React web app
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities
├── mobile/                # React Native user app
├── delivery-app/          # React Native delivery app
└── shared/                # Shared types and schemas
```

### Testing
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test

# E2E tests
npm run test:e2e
```

### Deployment

#### Production Build
```bash
npm run build
```

#### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### Environment-specific Deployments
```bash
# Staging
npm run deploy:staging

# Production
npm run deploy:production
```

## 🔐 Security

- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control (RBAC)
- **Payment Security**: Razorpay signature verification
- **Data Validation**: Input sanitization and validation
- **Rate Limiting**: API endpoint protection
- **HTTPS**: SSL/TLS encryption in production

## 📈 Monitoring

- **Health Checks**: `/health` endpoint
- **Logging**: Winston with daily rotation
- **Metrics**: Custom analytics dashboard
- **Error Tracking**: Centralized error logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.makubang.com](https://docs.makubang.com)
- **Issues**: GitHub Issues
- **Discord**: [Makubang Community](https://discord.gg/makubang)
- **Email**: support@makubang.com

## 🎯 Roadmap

- [ ] **Phase 1**: HSR Layout Bangalore pilot
- [ ] **Phase 2**: Bangalore city-wide expansion
- [ ] **Phase 3**: Multi-city rollout
- [ ] **Phase 4**: Advanced AI recommendations
- [ ] **Phase 5**: B2B restaurant solutions

## 🙏 Acknowledgments

- Razorpay for payment processing
- MongoDB for database solutions
- React Native community
- All our early adopters and contributors

---

**Built with ❤️ by the Makubang Team**