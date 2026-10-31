import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { apiLogin } from './helpers/auth.ts'

const cartItems = {
  desktop: [
    ['emerald-ape-042', 1],
    ['violet-nomad-314', 1],
    ['ivory-baron-088', 1],
  ],
  mobile: [
    ['emerald-ape-042', 1],
    ['violet-nomad-314', 1],
    ['ivory-baron-088', 1],
    ['golden-beat-207', 1],
  ],
} as const
const checkoutItems = [
  ['emerald-ape-042', 1],
  ['neon-vessel-552', 1],
  ['ivory-baron-088', 1],
] as const

async function setupPage(page: Page, testInfo: TestInfo, mode: 'desktop' | 'mobile') {
  test.skip(
    !testInfo.project.name.includes(mode),
    `Screenshot baseline is defined for ${mode}.`,
  )
  await page.setViewportSize(
    mode === 'desktop'
      ? { width: 1440, height: 900 }
      : { width: 414, height: 896 },
  )
  await page.goto('/')
  await expect(page.getByTestId('socket-status')).toHaveText('event-received', {
    timeout: 15000,
  })
}

async function addCartItems(page: Page, items: readonly (readonly [string, number])[]) {
  const statuses = await page.evaluate(async (rows) => {
    const results: number[] = []
    for (const [nftId, quantity] of rows) {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftId, edition: 1, quantity }),
      })
      results.push(response.status)
    }
    return results
  }, items)
  expect(statuses.every((status) => status === 201)).toBe(true)
}

async function settleVisuals(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      [...document.images]
        .filter((image) => image.getBoundingClientRect().width > 0)
        .map((image) => image.decode().catch(() => undefined)),
    )
  })
}

async function compare(page: Page, name: string) {
  await settleVisuals(page)
  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: 'disabled',
    caret: 'hide',
    fullPage: false,
    scale: 'css',
    // Reviewed clean-checkout diffs contain only 5–34 rasterized edge pixels.
    // Keep the approved image unchanged while tolerating that browser noise.
    maxDiffPixels: 40,
  })
}

test('visual: Home desktop', async ({ page }, testInfo) => {
  await setupPage(page, testInfo, 'desktop')
  await page.locator('.desktop-nft-grid .nft-card').first().waitFor({ state: 'visible' })
  await compare(page, 'home-desktop')
})

test('visual: Home mobile', async ({ page }, testInfo) => {
  await setupPage(page, testInfo, 'mobile')
  await page.locator('.mobile-nft-grid .nft-card').first().waitFor({ state: 'visible' })
  if (testInfo.project.name.includes('mobile'))
    await page.screenshot({
      path: 'docs/screenshots/stage8d/after/home-mobile.png',
      fullPage: false,
      scale: 'css',
    })
  await compare(page, 'home-mobile')
})

test('visual: Detalhes desktop', async ({ page }, testInfo) => {
  await setupPage(page, testInfo, 'desktop')
  await page.goto('/nft/emerald-ape-042')
  await page.locator('.nft-title-block h1').waitFor({ state: 'visible' })
  await compare(page, 'nft-details-desktop')
})

test('visual: Detalhes mobile', async ({ page }, testInfo) => {
  await setupPage(page, testInfo, 'mobile')
  await page.goto('/nft/emerald-ape-042')
  await page.locator('.nft-title-block h1').waitFor({ state: 'visible' })
  await compare(page, 'nft-details-mobile')
})

test('visual: Carrinho desktop', async ({ page }, testInfo) => {
  await setupPage(page, testInfo, 'desktop')
  await addCartItems(page, cartItems.desktop)
  await page.goto('/cart')
  await page.getByTestId('cart-item').nth(2).waitFor({ state: 'visible' })
  await page.locator('.cart-recommendations .nft-card').first().waitFor({ state: 'visible' })
  await compare(page, 'cart-desktop')
})

test('visual: Carrinho mobile', async ({ page }, testInfo) => {
  await setupPage(page, testInfo, 'mobile')
  await addCartItems(page, cartItems.mobile)
  await page.goto('/cart')
  await page.getByTestId('cart-item').nth(3).waitFor({ state: 'visible' })
  await page.locator('.cart-recommendations .nft-card').first().waitFor({ state: 'visible' })
  await expect(page.locator('.cart-page .financial-summary')).toBeInViewport()
  await expect(
    page.getByRole('link', { name: 'Conectar e finalizar' }),
  ).toBeInViewport()
  await expect(page.locator('.mobile-navigation')).toBeInViewport()
  if (testInfo.project.name.includes('mobile'))
    await page.screenshot({
      path: 'docs/screenshots/stage8d/after/cart-mobile.png',
      fullPage: false,
      scale: 'css',
    })
  await compare(page, 'cart-mobile')
})

test('carrinho responsivo sem overflow em larguras mobile e intermediárias', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Executado no projeto mobile.')
  await setupPage(page, testInfo, 'mobile')
  await addCartItems(page, cartItems.mobile)
  await page.goto('/cart')
  await page.getByTestId('cart-item').nth(3).waitFor({ state: 'visible' })
  for (const width of [390, 414, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 896 })
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
    if (width <= 639) {
      await expect(
        page.getByRole('link', { name: 'Conectar e finalizar' }),
      ).toBeInViewport()
    }
  }
})

test('visual: Checkout desktop', async ({ page }, testInfo) => {
  await setupPage(page, testInfo, 'desktop')
  await apiLogin(page)
  await addCartItems(page, checkoutItems)
  await page.goto('/checkout')
  await page.locator('[data-testid="total"]').waitFor({ state: 'visible' })
  await compare(page, 'checkout-desktop')
})

test('visual: Checkout mobile', async ({ page }, testInfo) => {
  await setupPage(page, testInfo, 'mobile')
  await apiLogin(page)
  await addCartItems(page, checkoutItems)
  await page.goto('/checkout')
  await page.locator('[data-testid="total"]').waitFor({ state: 'visible' })
  await expect(
    page.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeInViewport()
  await expect(page.locator('.provider-options .provider-choice')).toHaveCount(3)
  await expect(page.locator('.mobile-navigation')).toBeHidden()
  await compare(page, 'checkout-mobile')
})
