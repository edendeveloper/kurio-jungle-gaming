import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { uiLogin } from './helpers/auth.ts'

const publicRoutes = [
  { path: '/', label: 'home' },
  { path: '/nft/emerald-ape-042', label: 'detalhes' },
  { path: '/cart', label: 'carrinho' },
  { path: '/login', label: 'login' },
  { path: '/register', label: 'cadastro' },
]

for (const route of publicRoutes) {
  test(`axe: ${route.label} sem violações WCAG`, async ({ page }) => {
    await page.goto(route.path)
    await page.locator('#main').waitFor()
    await page.evaluate(() => document.fonts.ready)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}

test('skip link e página de NFT são operáveis pelo teclado', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Início', exact: true })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
  const nft = page.getByRole('link', { name: /Ver Emerald Ape #042/ }).first()
  await nft.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/nft\/emerald-ape-042$/)
  await expect(page).toHaveTitle(/Emerald Ape #042 \| Kurio/)
})

test('layout equivalente a 200% de zoom não cria overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 })
  await page.goto('/')
  await page.locator('#main').waitFor()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(720)
})

test('axe: checkout, perfil e carteiras sem violações WCAG', async ({ page }) => {
  await uiLogin(page)
  for (const path of ['/checkout', '/profile', '/profile/wallets']) {
    await page.goto(path)
    await page.locator('#main').waitFor()
    await expect(page.locator('#main')).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations, `${path}: ${JSON.stringify(results.violations, null, 2)}`).toEqual([])
  }
})
