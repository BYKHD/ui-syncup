#!/usr/bin/env bun

import { db } from '../src/lib/db';
import { sessions, users } from '../src/server/db/schema';
import { eq } from 'drizzle-orm';

async function checkSessions() {
  console.log('Checking sessions in database...\n');
  
  try {
    // Get all sessions with user info
    const allSessions = await db
      .select({
        sessionId: sessions.id,
        sessionToken: sessions.token,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
        createdAt: sessions.createdAt,
        userEmail: users.email,
        userName: users.name,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id));
    
    console.log(`Found ${allSessions.length} session(s):\n`);
    
    allSessions.forEach((session, index) => {
      const isExpired = new Date(session.expiresAt) < new Date();
      console.log(`Session ${index + 1}:`);
      console.log(`  User: ${session.userName} (${session.userEmail})`);
      console.log(`  Session ID: ${session.sessionId}`);
      console.log(`  Token: ${session.sessionToken.substring(0, 20)}...`);
      console.log(`  Expires: ${session.expiresAt.toISOString()} ${isExpired ? '(EXPIRED)' : '(VALID)'}`);
      console.log(`  Created: ${session.createdAt.toISOString()}`);
      console.log('');
    });
    
    if (allSessions.length === 0) {
      console.log('No sessions found. User needs to sign in.');
    }
    
  } catch (error) {
    console.error('Error checking sessions:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

checkSessions();
