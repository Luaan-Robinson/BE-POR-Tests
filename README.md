# BE POR Automation Test Framework

A practice Playwright automation testing framework for the BE POR web application.

## 🚀 Features

- **Page Object Model** - Clean, maintainable test structure
- **TypeScript** - Type-safe test development
- **Environment Configuration** - Support for dev/staging/production
- **Test Data Generation** - Dynamic test data with Faker.js
- **Custom Logging** - Detailed test execution logs
- **Multi-browser Testing** - Chromium, Firefox, WebKit support
- **HTML Reports** - Visual test reports with screenshots/videos
- **CI/CD Ready** - Configured for automated testing pipelines

## 📋 Test Coverage

### Authentication

- ✅ User sign in with valid credentials
- ✅ User sign up (registration)
- ✅ Sign in page validation
- ✅ Invalid credential handling

### Dashboard Navigation

- ✅ Sidebar navigation links
- ✅ Organization page access
- ✅ Users page access
- ✅ Create button visibility

### Organization Management

- ✅ Organization creation with form validation
- ✅ Organization activation/deactivation
- ✅ Organization list management
- ✅ Toast notifications

## 🛠️ Quick Start

1. **Clone and install:**

   ```bash
   git clone <https://github.com/Luaan-Robinson/BE-Practice-Tests.git>
   cd be-por-automation-tests
   npm install
   npm run install:browsers

    Configure environment:
    bash

    cp .env.example .env
    # Edit .env with your credentials

    Run tests:
    bash

    npm test

    View report:
    bash

    npm run report
   ```

📁 Project Structure
text

be-por-automation-tests/
├── config/ # Environment and test configuration
├── fixtures/ # Playwright custom fixtures
├── pages/ # Page Object Model classes
├── tests/ # Test specifications
├── utils/ # Utilities (logger, data generator)
└── \*.config.ts # Configuration files

🧪 Running Tests
bash

# Run all tests

npm test

# Run specific test suites

npm run test:auth
npm run test:dashboard
npm run test:organization

# Run with UI (interactive)

npm run test:ui

# Run specific browser

npm run test:chrome
npm run test:firefox
npm run test:webkit

🖥️ Development
Creating Page Objects
typescript

// pages/NewPage.ts
import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';

export class NewPage {
constructor(public page: Page) {}

async navigateTo(): Promise<void> {
Logger.info('Navigating to new page');
await this.page.goto('/new-page');
}
}

Writing Tests
typescript

// tests/feature/new-feature.spec.ts
import { test, expect } from '../fixtures/test-fixtures';
import { Logger } from '../utils/logger';

test.describe('New Feature', () => {
test('should test new feature', async ({ newPage }) => {
Logger.testStart('Testing New Feature');
await newPage.navigateTo();
// Test logic here
Logger.testEnd('Testing New Feature', true);
});
});

👥 Team Collaboration

    Branch strategy:

        main - Production-ready code

        feature/* - New features/tests

        bugfix/* - Bug fixes

    Code review:

        All changes require PR review

        Tests must pass before merging

        Follow existing patterns

📊 Reporting

Tests generate:

    HTML Reports (playwright-report/)

    JUnit XML (test-results/junit.xml)

    JSON Results (test-results/results.json)

🤝 Contributing

See CONTRIBUTING.md for detailed guidelines.
📄 License

MIT
