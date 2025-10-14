import { test, expect } from '@playwright/test'

test('renders a Konva canvas on the page', async ({ page }) => {
  await page.goto('/')
  // react-konva renders a canvas within a wrapper; ensure at least one canvas is present
  const canvases = page.locator('canvas')
  await expect(canvases.first()).toBeVisible()
})


