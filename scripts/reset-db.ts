import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  console.error('❌ DIRECT_URL is not set in .env.local');
  process.exit(1);
}

const sql = postgres(connectionString);

async function main() {
  console.log('🗑️  Resetting database...');

  try {
    // Drop tables in correct order (dependencies first)
    // Based on schema: account, sessions, verification_tokens, user_roles, email_jobs depend on users?
    // Using CASCADE to handle dependencies automatically
    
    await sql`DROP TABLE IF EXISTS "account", "session", "sessions", "verificationToken", "verification_tokens", "user_roles", "email_jobs", "user", "users" CASCADE`;
    
    console.log('✅ Tables dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
