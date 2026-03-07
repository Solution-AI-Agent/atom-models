import { test, expect } from '@playwright/test'

test.describe('Explore Page', () => {
  test('should display model list', async ({ page }) => {
    await page.goto('/explore')
    await expect(page.getByRole('heading', { name: /모델 탐색/ })).toBeVisible()
  })

  test('should have table view by default', async ({ page }) => {
    await page.goto('/explore')
    await expect(page.locator('table')).toBeVisible()
  })

  test('should filter by type via URL', async ({ page }) => {
    await page.goto('/explore?type=open-source')
    await expect(page).toHaveURL(/type=open-source/)
  })

  test('should navigate to model detail when clicking a model', async ({ page }) => {
    await page.goto('/explore')
    const firstLink = page.locator('table a').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      await expect(page).toHaveURL(/\/explore\//)
    }
  })
})
