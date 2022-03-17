import { test, expect } from '@playwright/test';

test('hello world on console', async ({ page }) => {
  var logs = [];
  page.on("console", message => logs.push(message.text()));
  await page.goto('http://localhost:8000/hello.html');
  const title = page.locator('h2');
  await expect(title).toHaveText('Hello');
  expect(logs).toHaveLength(1)
  expect(logs[0]).toEqual('Hello World')
});