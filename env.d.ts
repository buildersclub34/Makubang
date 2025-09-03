/// <reference types="node" />
/// <reference types="react" />
/// <reference types="react-dom" />

declare namespace NodeJS {
  export interface ProcessEnv {
    // Database
    DATABASE_URL: string;
    DIRECT_URL?: string;
    
    // Authentication
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    
    // Email
    EMAIL_SERVER_HOST: string;
    EMAIL_SERVER_PORT: string;
    EMAIL_SERVER_USER: string;
    EMAIL_SERVER_PASSWORD: string;
    EMAIL_FROM: string;
    
    // OAuth Providers
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    FACEBOOK_CLIENT_ID: string;
    FACEBOOK_CLIENT_SECRET: string;
    
    // App
    NODE_ENV: 'development' | 'production' | 'test';
    NEXT_PUBLIC_APP_URL: string;
    
    // Feature Flags
    EMAIL_VERIFICATION_REQUIRED?: string;
    
    // File Storage
    S3_ACCESS_KEY: string;
    S3_SECRET_KEY: string;
    S3_REGION: string;
    S3_BUCKET_NAME: string;
    CDN_URL?: string;
    
    // Payment
    RAZORPAY_KEY_ID: string;
    RAZORPAY_KEY_SECRET: string;
    
    // Analytics
    GOOGLE_ANALYTICS_ID?: string;
    
    // Content Moderation
    PERSPECTIVE_API_KEY?: string;
  }
}
