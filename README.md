# BE POR Automation Test Framework

Production-ready Playwright automation testing framework with database integration for the BE POR application.

## 🎯 Key Features

- **Self-Contained Tests**: Each test manages its own data lifecycle
- **Self-Isolating Tests**: No dependencies between tests
- **Database Integration**: Direct database verification and cleanup using Drizzle ORM
- **Automatic Cleanup**: Test data is automatically cleaned up after each test
- **Page Object Model**: Maintainable, reusable page objects
- **TypeScript**: Fully type-safe test development
- **Multi-browser Support**: Chromium and Firefox

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose (for running the application)
- PostgreSQL database (via Docker)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
npm run install:browsers
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:as98d7f98798dafdsafas@localhost:5432/be_por
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-password
```

### 3. Start the Application

```bash
cd ../your-app-directory
docker-compose up
```

Wait for the application to be ready at http://localhost:3000

### 4. Run Tests

```bash
npm test
```

## 📁 Project Structure

```
be-por-automation-tests/
├── config/
│   └── test-config.ts          # Central configuration
├── fixtures/
│   └── test-fixtures.ts        # Playwright fixtures with database support
├── pages/
│   ├── SignInPage.ts           # Sign-in page object
│   ├── SignUpPage.ts           # Sign-up page object
│   ├── DashboardPage.ts        # Dashboard page object
│   └── OrganizationPage.ts    # Organization page object
├── tests/
│   ├── auth/
│   │   ├── signin.spec.ts     # Authentication tests
│   │   └── signup.spec.ts     # Registration tests with DB verification
│   └── dashboard/
│       └── organization-create.spec.ts  # Organization tests with DB verification
├── utils/
│   ├── database-helper.ts      # Database operations (Drizzle ORM)
│   ├── logger.ts               # Logging utility
│   └── test-data-generator.ts  # Test data generation
├── scripts/
│   └── cleanup-test-data.ts    # Manual cleanup script
├── global-setup.ts             # Global test setup (DB connection)
├── global-teardown.ts          # Global test teardown (DB cleanup)
├── playwright.config.ts        # Playwright configuration
├── package.json
└── README.md
```

## 🧪 Test Architecture

### Self-Contained Tests

Each test:

1. Creates its own test data
2. Performs test actions
3. Verifies results (including database)
4. Automatically cleans up created data

Example:

```typescript
test('should create user', async ({ signUpPage, database, testCleanup }) => {
  // 1. Generate unique test data
  const user = TestDataGenerator.generateUser();
  testCleanup.registerUser(user.email); // Auto-cleanup

  // 2. Perform action
  await signUpPage.signUp(user);

  // 3. Verify in database
  const dbUser = await database.findUserByEmail(user.email);
  expect(dbUser).not.toBeNull();

  // 4. Cleanup happens automatically
});
```

### Database Integration

Tests can:

- Verify data was created in database
- Query database for test validation
- Clean up test data automatically
- Prevent test data pollution

## 🎮 Running Tests

### All Tests

```bash
npm test
```

### Specific Test Suites

```bash
npm run test:auth          # All authentication tests
npm run test:signin        # Sign-in tests only
npm run test:signup        # Sign-up tests only
npm run test:organization  # Organization tests
```

### With UI

```bash
npm run test:ui           # Interactive UI mode
npm run test:headed       # See browser
npm run test:debug        # Debug mode with DevTools
```

### Specific Browser

```bash
npm run test:chrome       # Chromium only
npm run test:firefox      # Firefox only
```

### View Report

```bash
npm run report
```

## 🗄️ Database Operations

### Automatic Cleanup

Test data is automatically cleaned up via the `testCleanup` fixture:

```typescript
test('my test', async ({ testCleanup }) => {
  const user = TestDataGenerator.generateUser();
  testCleanup.registerUser(user.email); // Cleaned up after test

  const org = TestDataGenerator.generateOrganization();
  testCleanup.registerOrganization(org.slug); // Cleaned up after test
});
```

### Manual Cleanup

Clean up all test data manually:

```bash
npm run db:cleanup
```

### Database Helper

Direct database access in tests:

```typescript
// Find user
const user = await database.findUserByEmail(email);

// Verify existence
const exists = await database.verifyUserExists(email);

// Delete specific data
await database.deleteUserByEmail(email);
await database.deleteOrganizationBySlug(slug);

// Query directly
const results = await database.query('SELECT * FROM users WHERE email = $1', [email]);
```

## ✍️ Writing New Tests

### 1. Use Test Template

Tests should follow this pattern:

```typescript
import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { TestDataGenerator } from '../../utils/test-data-generator';

test.describe('My Feature', () => {
  test('should do something', async ({ page, database, testCleanup }) => {
    Logger.testStart('Test Name');

    // Generate test data
    const data = TestDataGenerator.generateUser();
    testCleanup.registerUser(data.email);

    // Test steps
    Logger.step(1, 'Do something');
    // ... test logic ...

    // Verify in database if needed
    const result = await database.findUserByEmail(data.email);
    expect(result).not.toBeNull();

    Logger.testEnd('Test Name', true);
  });
});
```

### 2. Self-Isolation Checklist

- ✅ Test creates its own data
- ✅ Test doesn't depend on other tests
- ✅ Test registers data for cleanup
- ✅ Test can run in any order
- ✅ Test can run multiple times

### 3. Database Verification

When to verify in database:

- User registration
- Organization creation
- Data persistence tests
- Data integrity tests

When NOT to verify in database:

- Pure UI tests
- Navigation tests
- Validation tests

## 🔧 Configuration

### Test Configuration (`config/test-config.ts`)

```typescript
{
  baseUrl: 'http://localhost:3000',
  database: {
    url: 'postgresql://...',
    cleanupOnStart: false,  // Clean before tests
    cleanupOnEnd: true,     // Clean after tests
  },
  timeouts: {
    short: 5000,
    medium: 10000,
    long: 30000,
  }
}
```

### Environment Variables (`.env`)

```env
BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/be_por
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
CLEANUP_ON_START=false
CLEANUP_ON_END=true
DEBUG=false
```

## 📊 Test Data Management

### Test Email Domain

All test users use a special domain for easy identification:

```typescript
// Generated emails: test-john-1234567890-abcd@playwright-test.example.com
```

### Test Organization Prefix

All test organizations use a special prefix:

```typescript
// Generated slugs: test-org-1234567890-abcd-company-name
```

This makes cleanup easy and prevents collision with real data.

## 🐛 Debugging

### Enable Debug Logging

```bash
DEBUG=true npm test
```

### Debug Single Test

```bash
npm run test:debug tests/auth/signup.spec.ts
```

### View Database State

```typescript
const userCount = await database.getUserCount();
const orgCount = await database.getOrganizationCount();
console.log(`Users: ${userCount}, Orgs: ${orgCount}`);
```

## 🎯 Best Practices

1. **Always use TestDataGenerator** for test data
2. **Always register created data** with testCleanup
3. **Verify critical data** in database
4. **Use Logger** for clear test output
5. **Keep tests independent** - no shared state
6. **Use Page Objects** - don't write raw selectors in tests
7. **Handle async properly** - always await database operations

## 🔄 CI/CD Integration

Tests are CI/CD ready:

- Automatic browser installation
- Parallel execution
- Retry on failure
- Multiple report formats (HTML, JSON, JUnit)
- Database cleanup

### GitHub Actions Example

```yaml
- name: Run tests
  run: npm test
  env:
    BASE_URL: ${{ secrets.BASE_URL }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)

## 🤝 Contributing

1. Follow the existing test patterns
2. Ensure tests are self-contained
3. Add database verification for data operations
4. Register all created data for cleanup
5. Run tests locally before committing
6. Update documentation as needed

## 📝 License

MIT
