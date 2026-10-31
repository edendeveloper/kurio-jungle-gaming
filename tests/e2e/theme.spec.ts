import { mkdir } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { apiLogin, apiRequest, nova } from './helpers/auth.ts'

const screenshots = 'docs/screenshots/themes'

async function capture(page: import('@playwright/test').Page, name: string) {
  await mkdir(screenshots, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: `${screenshots}/${name}.png`,
    fullPage: true,
    scale: 'css',
  })
}

test('dark é padrão; alterna por teclado, persiste e gera capturas dos dois temas', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.includes('mobile')
  await page.setViewportSize(
    mobile ? { width: 414, height: 896 } : { width: 1440, height: 900 },
  )
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Início', exact: true })).toBeVisible()
  const toggle = page.getByRole('button', {
    name: 'Alternar tema. Tema atual: escuro',
  })
  await expect(toggle).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await capture(page, `home-${mobile ? 'mobile' : 'desktop'}-dark`)

  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 241, 231)')
  await expect(page.getByRole('button', {
    name: 'Alternar tema. Tema atual: claro',
  })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => localStorage.getItem('kurio:theme'))).toBe('light')
  await capture(page, `home-${mobile ? 'mobile' : 'desktop'}-light`)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', {
    name: 'Alternar tema. Tema atual: claro',
  }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => localStorage.getItem('kurio:theme'))).toBe('dark')
})

test('navbar mobile preserva contorno e geometria nos dois temas', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Validação da navbar mobile.')
  await page.addInitScript(() => localStorage.setItem('kurio:theme', 'dark'))
  await page.goto('/')

  const navigation = page.locator('.mobile-navigation')
  const surface = page.locator('.mobile-navigation-surface')
  const discover = page.locator('.mobile-discover')

  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [414, 896],
  ]) {
    await page.setViewportSize({ width, height })
    await expect(navigation).toBeInViewport()
    await expect(discover).toBeVisible()
    await expect(page.locator('.mobile-navigation a[href="/"]')).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    const darkGeometry = await Promise.all([
      navigation.boundingBox(),
      discover.boundingBox(),
      page.getByRole('button', { name: 'Alternar tema. Tema atual: escuro' }).boundingBox(),
    ])
    await page.screenshot({
      path: `${screenshots}/mobile-nav-${width}-dark.png`,
      fullPage: false,
      scale: 'css',
    })

    await page.getByRole('button', { name: 'Alternar tema. Tema atual: escuro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(surface).toHaveCSS('background-color', 'rgb(234, 218, 204)')
    await expect(surface).toHaveCSS('mask-image', /navigation-mobile\.svg/)
    await expect(surface).toHaveCSS('filter', /drop-shadow/)
    const lightGeometry = await Promise.all([
      navigation.boundingBox(),
      discover.boundingBox(),
      page.getByRole('button', { name: 'Alternar tema. Tema atual: claro' }).boundingBox(),
    ])
    expect(lightGeometry).toEqual(darkGeometry)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `${screenshots}/mobile-nav-${width}-light.png`,
      fullPage: false,
      scale: 'css',
    })
    await page.getByRole('button', { name: 'Alternar tema. Tema atual: claro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  }
})

test('tema light é aplicado antes do primeiro conteúdo e independe de autenticação', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('kurio:theme', 'light')
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        const windowWithProbe = window as typeof window & {
          __kurioThemeAtDOMContentLoaded?: string
          __kurioBackgroundAtDOMContentLoaded?: string
        }
        windowWithProbe.__kurioThemeAtDOMContentLoaded =
          document.documentElement.dataset.theme
        windowWithProbe.__kurioBackgroundAtDOMContentLoaded =
          getComputedStyle(document.documentElement).backgroundColor
      },
      { once: true },
    )
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Início', exact: true })).toBeVisible()
  const boot = await page.evaluate(() => {
    const probe = window as typeof window & {
      __kurioThemeAtDOMContentLoaded?: string
      __kurioBackgroundAtDOMContentLoaded?: string
    }
    return [probe.__kurioThemeAtDOMContentLoaded, probe.__kurioBackgroundAtDOMContentLoaded]
  })
  expect(boot).toEqual(['light', 'rgb(247, 241, 231)'])
  expect(await page.evaluate(() => localStorage.getItem('kurio:theme'))).toBe('light')
})

test('storage indisponível mantém a aplicação no tema escuro sem falhar', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalSet = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'kurio:theme') throw new DOMException('Storage bloqueado', 'SecurityError')
      originalSet.call(this, key, value)
    }
  })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: /Alternar tema/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('heading', { name: 'Início', exact: true })).toBeVisible()
})

test('tema claro mantém rotas e formulários utilizáveis sem overflow', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.includes('mobile')
  const sizes = mobile ? [375, 414] : [768, 1440]
  await page.goto('/')
  await page.getByRole('button', { name: /Alternar tema/ }).click()
  for (const width of sizes) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 896 })
    for (const path of ['/marketplace', '/nft/emerald-ape-042', '/cart', '/login']) {
      await page.goto(path)
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${path} deve caber na viewport de ${width}px`,
      ).toBe(true)
      await expect(page.locator('body')).toHaveCSS('color', 'rgb(54, 38, 29)')
    }
  }
})

test('perfil, favoritos, carteiras e checkout continuam legíveis no tema claro', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Alternar tema/ }).click()
  await page.locator('#main').waitFor({ state: 'attached' })
  await apiLogin(page, nova)
  for (const [path, heading] of [
    ['/profile', 'Perfil'],
    ['/profile/favorites', 'Lista de interesse'],
    ['/profile/wallets', 'Carteiras'],
    ['/cart', 'Seu carrinho está vazio.'],
    ['/checkout', 'Checkout'],
  ]) {
    await page.goto(path)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('tema claro mantém contraste WCAG AA na Home', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Alternar tema/ }).click()
  await page.locator('#main').waitFor({ state: 'attached' })
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])

  for (const path of ['/marketplace', '/nft/emerald-ape-042', '/cart', '/login', '/register']) {
    await page.goto(path)
    await page.locator('#main').waitFor({ state: 'attached' })
    const routeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(routeResults.violations, `${path}: ${JSON.stringify(routeResults.violations, null, 2)}`).toEqual([])
  }

  await page.goto('/')
  await page.locator('#main').waitFor({ state: 'attached' })
  await apiLogin(page, nova)
  await apiRequest(page, '/cart/items', 'POST', {
    nftId: 'emerald-ape-042',
    edition: 1,
    quantity: 1,
  })
  for (const path of ['/checkout', '/profile', '/profile/favorites', '/profile/wallets']) {
    await page.goto(path)
    await page.locator('#main').waitFor({ state: 'attached' })
    const routeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(routeResults.violations, `${path}: ${JSON.stringify(routeResults.violations, null, 2)}`).toEqual([])
  }
})
