import { db } from '../db';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { join } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigrations() {
  console.log('Applying migrations...');
  
  try {
    await migrate(db, {
      migrationsFolder: join(__dirname, '../../migrations')
    });
    console.log('Migrations applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error applying migrations:', error);
    process.exit(1);
  }
}

applyMigrations();
