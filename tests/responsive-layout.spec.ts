import { expect, test } from '@playwright/test';

const FIXED_NOW = new Date('2026-04-05T12:00:00-07:00').valueOf();

const loadBoard = async (page: Parameters<typeof test>[0]['page']): Promise<void> => {
  await page.addInitScript((fixedNow) => {
    Date.now = () => fixedNow;
  }, FIXED_NOW);

  await page.goto('/');
  await expect(page.locator('.shell')).toBeVisible();
  await expect(page.locator('.asset-toggle').first()).toBeVisible();
};

const expectNoHorizontalOverflow = async (
  page: Parameters<typeof test>[0]['page'],
): Promise<void> => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
};

test('dashboard stays readable across responsive viewports', async ({ page }) => {
  await loadBoard(page);
  await expectNoHorizontalOverflow(page);

  await expect(page).toHaveScreenshot('dashboard.png', {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixels: 600,
  });
});

test('local wire stays above rival desks', async ({ page }) => {
  await loadBoard(page);

  const localWire = page.getByRole('heading', { name: 'Local Wire' });
  const rivals = page.getByRole('heading', { name: 'Rival Desks' });
  const localWireBox = await localWire.boundingBox();
  const rivalsBox = await rivals.boundingBox();

  expect(localWireBox).not.toBeNull();
  expect(rivalsBox).not.toBeNull();
  expect(localWireBox!.y).toBeLessThan(rivalsBox!.y);
});

test('mobile asset rows keep the toggle icon on the first line', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only layout regression');

  await loadBoard(page);
  await expectNoHorizontalOverflow(page);

  const firstToggle = page.locator('.asset-toggle').first();
  const main = firstToggle.locator('.asset-toggle-main');
  const summary = firstToggle.locator('.asset-summary');
  const icon = firstToggle.locator('.asset-toggle-icon');

  const [toggleBox, mainBox, summaryBox, iconBox] = await Promise.all([
    firstToggle.boundingBox(),
    main.boundingBox(),
    summary.boundingBox(),
    icon.boundingBox(),
  ]);

  expect(toggleBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  expect(iconBox).not.toBeNull();
  expect(iconBox!.x + iconBox!.width).toBeLessThanOrEqual(toggleBox!.x + toggleBox!.width + 1);
  expect(iconBox!.y + iconBox!.height).toBeLessThanOrEqual(summaryBox!.y + 1);
  expect(summaryBox!.y).toBeGreaterThanOrEqual(mainBox!.y + mainBox!.height);

  await expect(firstToggle).toHaveScreenshot('mobile-asset-row.png', {
    animations: 'disabled',
  });
});
