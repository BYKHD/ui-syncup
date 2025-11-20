/**
 * Playwright Global Teardown
 * 
 * Runs once after all tests to clean up the test environment
 */

import { teardownTestDatabase } from './helpers/test-fixtures';

async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test environment...');
  
  try {
    // Clean up test database
    await teardownTestDatabase();
    
    console.log('✅ E2E test environment cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup E2E test environment:', error);
    // Don't throw - we don't want to fail the test run on cleanup errors
  }
}

export default globalTeardown;
