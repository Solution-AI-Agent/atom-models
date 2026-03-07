import { test, expect } from '@playwright/test'

test.describe('Compare Page', () => {
  test('should load compare page', async ({ page }) => {
    await page.goto('/compare')
    await expect(page.getByRole('heading', { name: /모델 비교/ })).toBeVisible()
  })

  test('should show empty state when no models selected', async ({ page }) => {
    await page.goto('/compare')
    await expect(page.getByText(/비교할 모델을 선택/)).toBeVisible()
  })

  test('should load models from URL params', async ({ page }) => {
    await page.goto('/compare?models=claude-sonnet-4-5,gpt-4o')
    await expect(page).toHaveURL(/models=/)
  })
})
