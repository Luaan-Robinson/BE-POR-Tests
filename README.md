# BE POR Automation Test Framework

Production-ready Playwright automation testing framework with database integration for the BE POR application.

## 🎯 Key Features

- **Self-Contained Tests**: Each test manages its own data lifecycle
- **Self-Isolating Tests**: No dependencies between tests
- **Database Integration**: Direct database verification and cleanup using raw PostgreSQL (`pg`)
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
DATABASE_URL=postgresql://postgres:password@localhost:5432/be_por
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-password
```

### 3. Start the Application

```bash
cd ../your-app-directory
docker-compose up
```

### 4. Run Tests

```bash
npm test
```

## 📁 Project Structure

```
be-por-automation-tests/
├── config/
│   ├── environments.ts         # Environment configurations (unused, reserved)
│   └── test-config.ts          # Central configuration
├── fixtures/
│   └── test-fixtures.ts        # Playwright fixtures with database support
├── pages/
│   ├── SignInPage.ts           # Sign-in page object
│   ├── SignUpPage.ts           # Sign-up page object
│   ├── DashboardPage.ts        # Dashboard / sidebar navigation page object
│   ├── OrganizationPage.ts     # Organization list + create form page object
│   ├── ClientsPage.ts          # Clients page object
│   ├── SuppliersPage.ts        # Suppliers page object
│   └── SupplierGroupsPage.ts   # Supplier Groups page object
├── tests/
│   ├── auth/
│   │   ├── signin.spec.ts      # Authentication tests
│   │   └── signup.spec.ts      # Registration tests
│   └── dashboard/
│       ├── organization.spec.ts        # Organization create/verify/delete
│       ├── clients.spec.ts             # Client create/verify/delete
│       ├── suppliers.spec.ts           # Supplier create/verify/delete
│       └── supplier-groups.spec.ts     # Supplier group create/verify/delete
├── utils/
│   ├── database-helper.ts      # Database operations (raw pg)
│   ├── logger.ts               # Logging utility
│   └── test-data-generator.ts  # Test data generation (faker.js)
├── scripts/
│   └── cleanup-test-data.ts    # Manual cleanup script
├── global-setup.ts             # Global test setup
├── global-teardown.ts          # Global test teardown
├── playwright.config.ts        # Playwright configuration
├── package.json
└── README.md
```

## 🧪 Test Architecture

### Self-Contained Tests

Each test:

1. Creates its own test data (where applicable)
2. Performs test actions
3. Verifies results (UI + database)
4. Cleans up created data directly via database queries

### Precondition: Active Organization

Dashboard tests (clients, suppliers, supplier groups) require at least one organization to exist and be activated. The `beforeEach` hooks in these test files handle activation automatically — but you must have created at least one organization first (via the organization test or manually).

### Database Integration

Tests can:

- Verify data was created in the database
- Query the database for test validation
- Clean up test data after each test
- Prevent test data pollution

## 🎮 Running Tests

### All Tests

```bash
npm test
```

### Specific Test Suites

```bash
npm run test:auth             # All authentication tests
npm run test:signin           # Sign-in tests only
npm run test:signup           # Sign-up tests only
npm run test:organization     # Organization tests
npm run test:clients          # Clients tests
npm run test:suppliers        # Suppliers tests
npm run test:supplier-groups  # Supplier groups tests
npm run test:dashboard        # All dashboard tests
```

### With UI / Debug

```bash
npm run test:ui       # Interactive UI mode
npm run test:headed   # See browser
npm run test:debug    # Debug mode with DevTools
```

### Specific Browser

```bash
npm run test:chrome   # Chromium only
npm run test:firefox  # Firefox only
```

### View Report

```bash
npm run report
```

## 🗄️ Database Operations

### Automatic Cleanup (via `testCleanup` fixture)

```typescript
test('my test', async ({ testCleanup }) => {
  const user = TestDataGenerator.generateUser();
  testCleanup.registerUser(user.email); // cleaned up after test

  const org = TestDataGenerator.generateOrganization();
  testCleanup.registerOrganization(org.slug); // cleaned up after test
});
```

### Manual Cleanup

```bash
npm run db:cleanup
```

### Direct Database Access in Tests

```typescript
// Run any SQL
const rows = await database.query<{ display_name: string }>(
  `SELECT display_name FROM client WHERE display_name = $1 LIMIT 1`,
  [clientName]
);

// Convenience helpers
const user = await database.findUserByEmail(email);
const org = await database.findOrganizationBySlug(slug);
await database.deleteOrganizationBySlug(slug);
await database.deleteUserByEmail(email);
```

## ✍️ Writing New Tests

### Template

```typescript
import { test, expect } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/logger';
import { TestDataGenerator } from '../../utils/test-data-generator';

test.describe('My Feature', () => {
  test('should do something', async ({ page, database, testCleanup }) => {
    Logger.testStart('Test Name');

    const data = TestDataGenerator.generateUser();
    testCleanup.registerUser(data.email);

    Logger.step(1, 'Do something');
    // ... test logic ...

    const result = await database.findUserByEmail(data.email);
    expect(result).not.toBeNull();

    Logger.testEnd('Test Name', true);
  });
});
```

### Self-Isolation Checklist

- ✅ Test creates its own data
- ✅ Test doesn't depend on other tests
- ✅ Test registers or manually deletes data for cleanup
- ✅ Test can run in any order
- ✅ Test can run multiple times

## 🔧 Configuration

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

All generated test users use a dedicated domain:

```
test-john-1234567890-abcd@playwright-test.example.com
```

### Test Organization Prefix

All generated test organizations use a prefix:

```
test-org-1234567890-abcd-company-name
```

This makes bulk cleanup safe and prevents collision with real data.

## 🐛 Debugging

```bash
# Enable verbose logging
DEBUG=true npm test

# Debug a single file
npm run test:debug tests/auth/signup.spec.ts

# Check DB state
const userCount = await database.getUserCount();
const orgCount  = await database.getOrganizationCount();
```

## 🎯 Best Practices

1. Use `TestDataGenerator` for all generated test data
2. Register created data with `testCleanup`, or delete it manually at the end of the test
3. Verify critical data in the database, not just the UI
4. Use `Logger` for clear, timestamped test output
5. Keep tests independent — no shared mutable state between tests
6. Use Page Objects — keep raw selectors out of test files
7. Always `await` database operations

## 🔄 CI/CD Integration

```yaml
- name: Run tests
  run: npm test
  env:
    BASE_URL: ${{ secrets.BASE_URL }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Faker.js Documentation](https://fakerjs.dev)

## 📝 License

MIT
