# BE POR Automation Test Framework — AI Coding Guidelines

These guidelines must be followed by any AI assistant working on this project.

---

## 1. Always Resend Full Updated Files

If an AI changes or updates **any** file, it must resend the **entire** updated file so the tester can copy/paste it directly into VS Code. This applies to:

- Test spec files (`tests/`)
- Page Object files (`pages/`)
- Fixture files (`fixtures/`)
- Utility files (`utils/`)
- Config files (`config/`)
- Any other file that was modified

Partial diffs or snippets are **not** acceptable — always provide the complete file.

---

## 2. Make Minimal Required Changes

When updating existing files:

- Change only what is **necessary** to make the requested feature or fix work.
- Do not refactor, rename, or reorganise unrelated code.
- Do not add helper methods, comments, or logging beyond what is needed.
- Keep the code consistent with the existing style in the file.

This reduces the risk of introducing new bugs and keeps the codebase clean.

---

## 3. No Unrequested Additions

Do **not** add anything that was not explicitly asked for. This includes:

- Extra test cases
- Additional page object methods
- Optional helper utilities
- Bonus assertions or checks
- Commented-out future ideas

If you think something would be useful, **ask the tester first** before implementing it.

---

## 4. Standard Test Pattern

Every test must follow this exact pattern — no more, no less:

1. **Navigate** to the relevant page (expand sidebar groups as needed).
2. **Create** the entity via the UI (fill form, submit).
3. **Verify** the entity appears in the UI table (including paginated search if needed).
4. **Verify** the entity exists in the database using a direct SQL query.
5. **Delete** the entity directly from the database using SQL (clean up related junction table rows first if needed to avoid FK violations).

Do not add extra steps such as editing, deactivating, bulk operations, or error-case scenarios unless explicitly requested.

---

## 5. Follow Existing Conventions

Maintain consistency with the rest of the project:

- Use `Logger.step()`, `Logger.info()`, `Logger.success()`, `Logger.warning()` for logging.
- Use `testConfig.timeouts.*` for all wait timeouts.
- Scope page locators in the constructor and keep test files free of raw selectors.
- Keep test files under ~150 lines where possible.
- Reuse the `findRowByName()` pagination helper pattern (already present in `clients.spec.ts`, `suppliers.spec.ts`, and `supplier-groups.spec.ts`) rather than duplicating logic.
- Always `await` database operations.
- Use `database.query<T>(sql, params)` for direct SQL operations.

---

## 6. Ensure Unique Test Entity Names

Many pages enforce unique names per organisation. Always generate names that are unique per test run using a timestamp and/or short random string. The `TestDataGenerator` utilities are the preferred way to do this. For entities not covered by `TestDataGenerator`, use the pattern:

```typescript
const entityName = `Test <Entity> ${Date.now()}`;
```

Never hardcode static names like `"Test Category"` that would fail on a second run.

---

## 7. Sidebar Navigation

The sidebar contains collapsible groups. Before clicking a sub-item, always check whether the parent group is already expanded. Use `DashboardPage.expandSidebarGroup(groupName)` for this — it checks `data-state` and only clicks if the group is closed. Do not assume the sidebar is in any particular state at the start of a test.

---

## 8. Database Cleanup Order

When deleting an entity that has related records in junction or child tables, always delete the dependent rows first to avoid foreign key constraint violations. Refer to the Drizzle schema files to identify relationships. Example order for SKU Categories:

1. Delete rows from `skuCategory_vs_Suppliers` where `skuCategoryId = <id>`
2. Delete the row from `skuCategory` where `id = <id>`

---

## 9. Page Object Responsibilities

- Page Objects handle **all** UI interactions and locator definitions.
- Test files call Page Object methods — they do not contain raw Playwright locators.
- If a new UI interaction is needed, add a method to the relevant Page Object and resend the full updated Page Object file.

---

## 10. Fixture Usage

- Always use the `authenticatedPage` fixture in `beforeEach` for tests that require a logged-in user.
- Use `database` for direct DB queries.
- Use `testCleanup` only when the cleanup pattern via `testCleanup.register*` is appropriate. For direct SQL deletes within the test body, `testCleanup` is not needed.
- Destructure only the fixtures actually used in a given test.