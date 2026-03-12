#!/bin/bash

# Test script for CI Quality Checks workflow
# This script tests all quality check scenarios:
# 1. Valid code (all checks pass)
# 2. TypeScript errors
# 3. ESLint errors
# 4. Test failures

set -o pipefail

ORIGINAL_BRANCH=$(git branch --show-current)
TEST_RESULTS_FILE="ci-test-results.txt"

echo "=== CI Workflow Testing Script ===" > "$TEST_RESULTS_FILE"
echo "Original branch: $ORIGINAL_BRANCH" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"

# Function to cleanup and return to original branch
cleanup() {
    echo "Cleaning up..."
    git checkout "$ORIGINAL_BRANCH" 2>/dev/null || true
    git branch -D test-ci-valid 2>/dev/null || true
    git branch -D test-ci-typescript-fail 2>/dev/null || true
    git branch -D test-ci-eslint-fail 2>/dev/null || true
    git branch -D test-ci-test-fail 2>/dev/null || true
    rm -rf src/test-failures
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

echo "Starting CI workflow tests..."
echo ""

# Test 1: Valid code (all checks should pass)
echo "=== Test 1: Valid Code (All Checks Pass) ===" | tee -a "$TEST_RESULTS_FILE"
git branch -D test-ci-valid 2>/dev/null || true
git checkout -b test-ci-valid
echo "Branch created: test-ci-valid" | tee -a "$TEST_RESULTS_FILE"

# Run all checks locally
echo "Running TypeScript check..." | tee -a "$TEST_RESULTS_FILE"
if bun run typecheck; then
    echo "✓ TypeScript check passed" | tee -a "$TEST_RESULTS_FILE"
else
    echo "✗ TypeScript check failed" | tee -a "$TEST_RESULTS_FILE"
fi

echo "Running ESLint..." | tee -a "$TEST_RESULTS_FILE"
if bun run lint; then
    echo "✓ ESLint passed" | tee -a "$TEST_RESULTS_FILE"
else
    echo "✗ ESLint failed" | tee -a "$TEST_RESULTS_FILE"
fi

echo "Running tests..." | tee -a "$TEST_RESULTS_FILE"
if bun run test; then
    echo "✓ Tests passed" | tee -a "$TEST_RESULTS_FILE"
else
    echo "✗ Tests failed" | tee -a "$TEST_RESULTS_FILE"
fi

echo "Running build..." | tee -a "$TEST_RESULTS_FILE"
if bun run build; then
    echo "✓ Build passed" | tee -a "$TEST_RESULTS_FILE"
else
    echo "✗ Build failed" | tee -a "$TEST_RESULTS_FILE"
fi

echo "" | tee -a "$TEST_RESULTS_FILE"

# Test 2: TypeScript errors
echo "=== Test 2: TypeScript Errors ===" | tee -a "$TEST_RESULTS_FILE"
git checkout "$ORIGINAL_BRANCH"
git branch -D test-ci-typescript-fail 2>/dev/null || true
git checkout -b test-ci-typescript-fail
echo "Branch created: test-ci-typescript-fail" | tee -a "$TEST_RESULTS_FILE"

# Create a file with TypeScript errors
mkdir -p src/test-failures
cat > src/test-failures/typescript-error.ts << 'EOF'
// This file intentionally contains TypeScript errors for CI testing

export function testFunction(value: string): number {
    // Type error: returning string instead of number
    return value;
}

export const testVariable: number = "not a number";

export function anotherTest() {
    const x: string = 123; // Type error
    return x;
}
EOF

echo "Created file with TypeScript errors" | tee -a "$TEST_RESULTS_FILE"

echo "Running TypeScript check (should fail)..." | tee -a "$TEST_RESULTS_FILE"
if bun run typecheck; then
    echo "✗ TypeScript check passed (expected to fail)" | tee -a "$TEST_RESULTS_FILE"
else
    echo "✓ TypeScript check failed as expected" | tee -a "$TEST_RESULTS_FILE"
fi

# Cleanup test file
rm -rf src/test-failures
echo "" | tee -a "$TEST_RESULTS_FILE"

# Test 3: ESLint errors
echo "=== Test 3: ESLint Errors ===" | tee -a "$TEST_RESULTS_FILE"
git checkout "$ORIGINAL_BRANCH"
git branch -D test-ci-eslint-fail 2>/dev/null || true
git checkout -b test-ci-eslint-fail
echo "Branch created: test-ci-eslint-fail" | tee -a "$TEST_RESULTS_FILE"

# Create a file with ESLint errors
mkdir -p src/test-failures
cat > src/test-failures/eslint-error.tsx << 'EOF'
// This file intentionally contains ESLint errors for CI testing
import React from 'react';

export function TestComponent() {
    var unusedVariable = 'test'; // eslint error: prefer const/let
    var anotherUnused = 123;
    
    // eslint error: missing dependency in useEffect
    React.useEffect(() => {
        console.log(unusedVariable);
    }, []);
    
    return <div>Test</div>;
}
EOF

echo "Created file with ESLint errors" | tee -a "$TEST_RESULTS_FILE"

echo "Running ESLint (should fail)..." | tee -a "$TEST_RESULTS_FILE"
if bun run lint; then
    echo "✗ ESLint passed (expected to fail)" | tee -a "$TEST_RESULTS_FILE"
else
    echo "✓ ESLint failed as expected" | tee -a "$TEST_RESULTS_FILE"
fi

# Cleanup test file
rm -rf src/test-failures
echo "" | tee -a "$TEST_RESULTS_FILE"

# Test 4: Test failures
echo "=== Test 4: Test Failures ===" | tee -a "$TEST_RESULTS_FILE"
git checkout "$ORIGINAL_BRANCH"
git branch -D test-ci-test-fail 2>/dev/null || true
git checkout -b test-ci-test-fail
echo "Branch created: test-ci-test-fail" | tee -a "$TEST_RESULTS_FILE"

# Create a failing test
mkdir -p src/test-failures
cat > src/test-failures/failing-test.test.ts << 'EOF'
// This file intentionally contains failing tests for CI testing
import { describe, it, expect } from 'vitest';

describe('Failing Test Suite', () => {
    it('should fail intentionally', () => {
        expect(1 + 1).toBe(3); // This will fail
    });
    
    it('should also fail', () => {
        expect(true).toBe(false); // This will fail
    });
});
EOF

echo "Created failing test file" | tee -a "$TEST_RESULTS_FILE"

echo "Running tests (should fail)..." | tee -a "$TEST_RESULTS_FILE"
if bun run test; then
    echo "✗ Tests passed (expected to fail)" | tee -a "$TEST_RESULTS_FILE"
else
    echo "✓ Tests failed as expected" | tee -a "$TEST_RESULTS_FILE"
fi

# Cleanup test file
rm -rf src/test-failures
echo "" | tee -a "$TEST_RESULTS_FILE"

# Return to original branch
git checkout "$ORIGINAL_BRANCH"

echo "=== Test Summary ===" | tee -a "$TEST_RESULTS_FILE"
echo "All CI workflow tests completed!" | tee -a "$TEST_RESULTS_FILE"
echo "Results saved to: $TEST_RESULTS_FILE" | tee -a "$TEST_RESULTS_FILE"
echo ""
echo "To push these test branches to GitHub and trigger the CI workflow:"
echo "  git push origin test-ci-valid"
echo "  git push origin test-ci-typescript-fail"
echo "  git push origin test-ci-eslint-fail"
echo "  git push origin test-ci-test-fail"
echo ""
echo "Then check the Actions tab in GitHub to verify the workflow behavior."
