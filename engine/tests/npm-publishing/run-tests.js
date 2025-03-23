#!/usr/bin/env node

/**
 * Main test runner for NPM publishing tests
 * This script runs all the tests needed to verify the package is ready for NPM
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const installTest = require('./install-test');
const cliTest = require('./cli-test');

// Create a timestamp for unique test directories
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const baseTestDir = path.join(__dirname, '..', 'temp-' + timestamp);

// Create base test directory
console.log('Creating test directory:', baseTestDir);
fs.mkdirSync(baseTestDir, { recursive: true });

// Track if any tests fail
let hasFailures = false;

// Run tests and capture results
try {
  console.log('\n=== Running package installation test ===');
  installTest(baseTestDir);
  
  console.log('\n=== Running CLI functionality test ===');
  cliTest(baseTestDir);
  
  console.log('\n✅ All tests passed!');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  hasFailures = true;
}

// Clean up test directories when tests complete
try {
  console.log('\nCleaning up test directories...');
  // Comment the next line during development if you want to inspect test outputs
  fs.rmSync(baseTestDir, { recursive: true, force: true });
  console.log('Test directories cleaned up.');
} catch (cleanupError) {
  console.warn('Warning: Could not clean up test directories:', cleanupError.message);
}

// Exit with appropriate code
process.exit(hasFailures ? 1 : 0); 