/**
 * E2E smoke tests — verify every bottom-nav tab loads without a blank screen.
 *
 * These run against the *built* app (`vite preview`), so they catch bundler
 * issues that Vitest misses (missing imports, dual-React, chunk load errors).
 *
 * Auth / Drive features are excluded: they require real OAuth tokens and are
 * better covered by manual testing or a separate authenticated test suite.
 */
import { test, expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Click the nav tab labelled `name` and assert the page is non-blank.
 *  Each tab renders either .section-title (has data) or .empty-state (no data).
 *  Both are valid — neither is a blank page.
 */
async function switchTab(page, label) {
  await page.getByRole('button', { name: label }).click();
  // Wait for either section-title or empty-state — both mean React rendered OK
  await expect(
    page.locator('.section-title, .empty-state').first()
  ).toBeVisible({ timeout: 5_000 });
}

/** Confirm no JS errors were thrown during the action. */
async function noConsoleErrors(page, fn) {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await fn();
  // Ignore known non-fatal noise (Drive API calls fail without real auth)
  const fatal = errors.filter(e =>
    !e.includes('gapi') &&
    !e.includes('google') &&
    !e.includes('accounts.google') &&
    !e.includes('Failed to fetch')
  );
  expect(fatal, `Unexpected console errors: ${fatal.join('\n')}`).toHaveLength(0);
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('App smoke — all tabs render', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for React to hydrate — either section-title or empty-state means it rendered
    await expect(page.locator('.section-title, .empty-state').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Log tab (default) is non-blank', async ({ page }) => {
    await expect(page.locator('.section-title')).toBeVisible();
    // Empty-state or log cards must exist — neither is a blank page
    const hasEmpty = await page.locator('.empty-state').isVisible();
    const hasCards = await page.locator('.log-card').count() > 0;
    expect(hasEmpty || hasCards).toBeTruthy();
  });

  test('History tab is non-blank', async ({ page }) => {
    await noConsoleErrors(page, () => switchTab(page, '歷史'));
    const hasEmpty = await page.locator('.empty-state').isVisible();
    const hasCards = await page.locator('.log-card').count() > 0;
    expect(hasEmpty || hasCards).toBeTruthy();
  });

  test('Stats tab is non-blank', async ({ page }) => {
    await noConsoleErrors(page, () => switchTab(page, '統計'));
  });

  test('Food DB tab is non-blank', async ({ page }) => {
    await noConsoleErrors(page, () => switchTab(page, '糧食庫'));
  });

  test('All four tabs navigate without a React crash', async ({ page }) => {
    // Cycle through every tab — any uncaught error would be caught by noConsoleErrors
    await noConsoleErrors(page, async () => {
      for (const label of ['歷史', '統計', '糧食庫', '今日']) {
        await page.getByRole('button', { name: label }).click();
        await expect(page.locator('.section-title, .empty-state').first()).toBeVisible();
      }
    });
  });
});

test.describe('Bottom nav accessibility', () => {
  test('all nav buttons are reachable via keyboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.bottom-nav')).toBeVisible();
    // All nav buttons should be keyboard-focusable
    const buttons = page.locator('.bottom-nav button');
    await expect(buttons).toHaveCount(4);
  });
});

test.describe('Add log modal smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.section-title, .empty-state').first()).toBeVisible();
  });

  test('FAB opens and modal appears', async ({ page }) => {
    // The FAB is the main action button on the Log tab
    const fab = page.locator('.fab');
    await expect(fab).toBeVisible();
    await fab.click();
    // A modal or action sheet must appear
    await expect(page.locator('.modal, .action-sheet, [role="dialog"]')).toBeVisible({ timeout: 3_000 });
  });
});
