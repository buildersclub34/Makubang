declare module 'next/server' {
  export * from 'next/dist/server/web/spec-extension/adapters/next-types';
  export { default as NextResponse } from 'next/dist/server/web/spec-extension/response';
  export { default as NextRequest } from 'next/dist/server/web/spec-extension/request';
}

declare module 'next-auth/next' {
  export * from 'next-auth/next/types';
  export { default as getServerSession } from 'next-auth/next';
}

declare module '@/app/api/auth/[...nextauth]/route' {
  import { NextAuthOptions } from 'next-auth';
  const authOptions: NextAuthOptions;
  export default authOptions;
}

declare module '@/server/db' {
  import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
  import * as schema from '../shared/schema';
  
  export const db: PostgresJsDatabase<typeof schema>;
  export * from '../shared/schema';
}

declare module '@/server/lib/websocket/order-tracking' {
  import { OrderTrackingService } from './order-tracking';
  export function getOrderTrackingService(): OrderTrackingService;
}

// Add type declarations for WebSocket
interface WebSocket {
  isAlive: boolean;
}
