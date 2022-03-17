import { test, expect } from '@playwright/test';

test('months on console', async ({ page }) => {
  var logs = [];
  page.on("console", message => logs.push(message.text()));
  await page.goto('http://localhost:8000/month.html');
  const title = page.locator('h2');
  await expect(title).toHaveText('Month');
  expect(logs).toHaveLength(3)
  expect(logs[0]).toEqual('Initialized months')
  expect(logs[2]).toEqual('March')
});