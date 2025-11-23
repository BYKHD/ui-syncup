import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/server/db/schema';
import * as dotenv from 'dotenv';
import { hashPassword } from '../src/server/auth/password';

dotenv.config({ path: '.env.local' });

if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL is not set');
}

const client = postgres(process.env.DIRECT_URL);
const db = drizzle(client, { schema });

async function main() {
  console.log('🌱 Seeding database...');

  try {
    const passwordHash = await hashPassword('password123');

    // Create a default test user
    // Using onConflictDoUpdate to ensure password is set even if user exists
    await db.insert(schema.users).values({
      email: 'demo@ui-syncup.com',
      name: 'Demo User',
      emailVerified: true,
      image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Demo',
      passwordHash,
    }).onConflictDoUpdate({ 
      target: schema.users.email,
      set: { passwordHash } 
    });

    console.log('✅ Seeding completed');
    console.log('👤 Default User: demo@ui-syncup.com');
    console.log('🔑 Password: password123');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
