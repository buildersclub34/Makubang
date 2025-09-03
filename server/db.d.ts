import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';

declare module '../../../server/db' {
  export const pool: Pool;
  export const db: ReturnType<typeof drizzle<typeof schema>>;
  export * from '@shared/schema';
}
