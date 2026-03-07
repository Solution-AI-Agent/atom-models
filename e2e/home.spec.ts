import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load and display main heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('should display navigation sidebar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Atom Models')).toBeVisible()
  })

  test('should navigate to explore page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /모델 탐색/ }).click()
    await expect(page).toHaveURL(/\/explore/)
  })

  test('should navigate to recommendations page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /산업별 추천/ }).click()
    await expect(page).toHaveURL(/\/recommendations/)
  })
})
