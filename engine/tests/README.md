# Tests for Simple Blog Engine

This directory contains tests for the Simple Blog Engine package.

## NPM Publishing Tests

The tests in the `npm-publishing` directory verify that the package can be properly installed and used after being published to NPM.

### Running the Tests

```bash
# Run all tests
npm test

# Run individual tests
node tests/npm-publishing/install-test.js
node tests/npm-publishing/cli-test.js
```

### What the Tests Verify

1. **Installation Test** - Verifies that:
   - The package can be installed correctly
   - The CLI commands are properly linked
   - The package version is reported correctly

2. **CLI Functionality Test** - Verifies that:
   - The `init` command initializes a blog correctly
   - The `post` command creates a new post
   - The `build` command generates the static site correctly

These tests run automatically before publishing to NPM via the `prepublishOnly` script.

## Temporary Directories

The tests create temporary directories for testing, which are automatically cleaned up after the tests run. These directories follow the patterns:

- `tests/temp-*`
- `tests/npm-test-*`

These patterns are added to `.gitignore` to ensure they are not committed to the repository. 