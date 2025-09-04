# Overview

Makubang is a comprehensive food discovery platform that combines social media functionality with food ordering and delivery services. The platform features a TikTok/Instagram-style video feed for food content, direct ordering from videos, ML-powered personalized recommendations, and a multi-stakeholder marketplace supporting users, content creators, restaurants, and delivery partners.

The platform operates on a subscription-based model for restaurants (starting at ₹1,000) and includes advanced features like AI content moderation, real-time analytics, creator monetization, loyalty programs, and comprehensive administrative tools.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Web Client**: React-based SPA with TypeScript using Vite as the build tool
- **Mobile Apps**: Two separate React Native/Expo applications - one for customers and one for delivery partners
- **UI Framework**: Shadcn/ui components with Tailwind CSS for styling
- **State Management**: TanStack Query for server state, local React state for UI state
- **Routing**: React Router for web, Expo Router for mobile apps

## Backend Architecture
- **API Server**: Express.js with TypeScript running on Node.js
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **Real-time Communication**: WebSocket implementation for live order tracking and notifications
- **File Storage**: AWS S3 integration for media uploads (videos, images)

## Data Layer
- **Schema Design**: Comprehensive Drizzle schema supporting multi-role users, restaurants, orders, videos, subscriptions, and analytics
- **Database Features**: PostgreSQL with proper indexing, foreign key constraints, and JSONB fields for flexible data
- **Migration System**: Drizzle migrations for schema versioning and deployment

## Authentication & Authorization
- **Multi-role System**: Support for Users, Restaurant Owners, Delivery Partners, and Admins
- **Token-based Auth**: JWT tokens with role-based access control
- **Session Management**: Secure session handling with proper token expiration
- **Password Security**: bcrypt hashing with salt rounds for password protection

## Payment Integration
- **Payment Gateway**: Razorpay integration for Indian market
- **Subscription Billing**: Automated recurring billing for restaurant subscriptions
- **Order Payments**: Secure payment processing with GST calculation
- **Wallet System**: Built-in wallet functionality for users and delivery partners

## Real-time Features
- **WebSocket Server**: Custom WebSocket implementation for real-time updates
- **Live Tracking**: Real-time delivery tracking with location updates
- **Notifications**: Push notifications via Firebase with in-app notification system
- **Order Updates**: Live order status updates across all stakeholders

## Content Management
- **Video Platform**: TikTok-style video feed with upload, processing, and streaming
- **AI Moderation**: OpenAI integration for automated content moderation
- **Creator Tools**: Analytics dashboard and monetization features for content creators
- **Recommendation Engine**: ML-powered personalization based on user behavior

## Security & Performance
- **Rate Limiting**: Express rate limiting to prevent abuse
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Helmet Security**: Security headers and protection middleware
- **Input Validation**: Zod schema validation for all API endpoints
- **Error Handling**: Comprehensive error handling with logging

# External Dependencies

## Core Infrastructure
- **PostgreSQL**: Primary database for all application data
- **AWS S3**: Cloud storage for video content, images, and static assets
- **Firebase**: Push notification services for mobile apps
- **Upstash Redis**: Rate limiting and caching (optional, falls back gracefully)

## Payment Services
- **Razorpay**: Primary payment gateway for the Indian market
- **Stripe**: Alternative payment processing (configured but not primary)

## AI & ML Services
- **OpenAI API**: Content moderation and recommendation engine enhancement
- **Custom ML Pipeline**: User behavior analysis and personalized recommendations

## Development & Deployment
- **Replit**: Development environment with integrated deployment
- **Expo**: Mobile app development and deployment platform
- **Google Services**: Mobile app analytics and crash reporting

## Third-party Libraries
- **Authentication**: JWT, bcrypt for security
- **Validation**: Zod for runtime type checking
- **File Processing**: Sharp for image processing, FFmpeg for video processing
- **Real-time**: Socket.io for WebSocket communication
- **HTTP Client**: Axios for API communication in mobile apps