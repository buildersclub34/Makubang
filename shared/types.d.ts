// Type definitions for shared modules
declare module '@shared/schema' {
  import { PgTableWithColumns } from 'drizzle-orm/pg-core';
  
  // Export all schema types
  export * from './schema';
  
  // Export schema types that might be used in other modules
  export const users: PgTableWithColumns<any>;
  export const restaurants: PgTableWithColumns<any>;
  export const orders: PgTableWithColumns<any>;
  export const orderItems: PgTableWithColumns<any>;
  export const menuItems: PgTableWithColumns<any>;
  export const subscriptionPlans: PgTableWithColumns<any>;
  export const subscriptions: PgTableWithColumns<any>;
  export const subscriptionInvoices: PgTableWithColumns<any>;
  export const subscriptionUsage: PgTableWithColumns<any>;
  export const payments: PgTableWithColumns<any>;
}
