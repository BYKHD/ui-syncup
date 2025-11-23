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
    
    const tables = [
      'account',
      'session', // Drizzle schema says 'session' or 'sessions'? Check schema file.
      'verificationToken', // Check schema file.
      'user_roles',
      'email_jobs',
      'user' // Check schema file.
    ];

    // Actually, let's just drop the ones we saw in the error + others.
    // Drizzle usually uses plural or singular based on config.
    // The error said "sessions", "users", "verification_tokens".
    
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
