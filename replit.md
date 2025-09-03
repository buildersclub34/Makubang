# Overview

Makubang is a content-first food discovery platform that combines short-form video content (similar to Instagram/TikTok) with direct food ordering functionality. The platform features a subscription-based model for restaurants, creator marketplace for food influencers, ML-powered personalized recommendations, and integrated payment/delivery systems. Users can watch food videos, discover dishes, and order directly through the platform.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built as a React SPA using TypeScript with modern tooling:
- **React Router**: Uses Wouter for client-side routing with conditional rendering based on authentication state
- **State Management**: React Query for server state management with custom query client configuration
- **UI Framework**: Shadcn/ui components built on Radix UI primitives for accessibility and consistency
- **Styling**: Tailwind CSS with CSS variables for theming support and responsive design
- **Video Feed**: Custom infinite scroll video feed component mimicking TikTok-style vertical video browsing

## Backend Architecture
The backend follows a REST API pattern built with Express.js:
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations and schema management
- **Authentication**: Replit Auth integration with OpenID Connect for secure user authentication
- **Session Management**: Express sessions with PostgreSQL session store for scalable session handling
- **API Structure**: Modular route handlers with middleware for authentication, error handling, and request logging
- **Storage Layer**: Abstracted storage interface pattern for database operations with proper separation of concerns

## Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon with connection pooling via @neondatabase/serverless
- **Schema Design**: Comprehensive relational schema supporting users, restaurants, videos, orders, menu items, analytics, and social features
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple for stateful authentication
- **File Storage**: Placeholder structure for media assets (videos/images) with cloud storage integration points

## Authentication and Authorization
- **Authentication Provider**: Replit Auth with OpenID Connect flow
- **Session Management**: Secure HTTP-only cookies with configurable TTL and HTTPS enforcement
- **Authorization Middleware**: Role-based access control with user roles (user, creator, restaurant, admin)
- **API Security**: Protected routes with authentication middleware and proper error handling for unauthorized access

# External Dependencies

## Third-Party Services
- **Payment Processing**: Stripe integration for subscription management and payment processing with webhook support
- **Database**: Neon PostgreSQL serverless database with connection pooling
- **Authentication**: Replit Auth service for OAuth-based user authentication
- **Email/SMS**: Placeholder integrations for notification services

## Frontend Libraries
- **UI Components**: Radix UI primitives for accessible, unstyled components
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **State Management**: TanStack Query for server state caching and synchronization
- **Styling**: Tailwind CSS with class-variance-authority for component variants

## Backend Dependencies
- **Web Framework**: Express.js with TypeScript for API development
- **Database ORM**: Drizzle ORM with PostgreSQL adapter for type-safe database operations
- **Authentication**: OpenID Connect client with Passport.js strategy integration
- **Payment Gateway**: Stripe Node.js SDK for payment processing and webhook handling
- **Development Tools**: tsx for TypeScript execution, esbuild for production builds, Vite for development server

## Development and Build Tools
- **Build System**: Vite for frontend bundling with React plugin and development server
- **TypeScript**: Full TypeScript support across frontend, backend, and shared code
- **Database Migrations**: Drizzle Kit for schema migrations and database management
- **Development Server**: Concurrent development setup with Express backend and Vite frontend proxy