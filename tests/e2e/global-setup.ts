/**
 * Playwright Global Setup
 * 
 * Runs once before all tests to prepare the test environment
 */

import { setupTestDatabase } from './helpers/test-fixtures';

async function globalSetup() {
  console.log('🔧 Setting up E2E test environment...');
  
  try {
    // Setup test database (clean up any existing test data)
    await setupTestDatabase();
    
    console.log('✅ E2E test environment ready');
  } catch (error) {
    console.error('❌ Failed to setup E2E test environment:', error);
    throw error;
  }
}

export default globalSetup;
