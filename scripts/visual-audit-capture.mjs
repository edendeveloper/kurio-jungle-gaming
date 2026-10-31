import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const phase = process.env.KURIO_AUDIT_PHASE ?? 'before'
const baseURL = process.env.KURIO_AUDIT_BASE_URL ?? 'http://127.0.0.1:4377'
const outputDir = path.resolve(`docs/screenshots/stage8/${phase}`)
const viewportByMode = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 414, height: 896 },
}
const collection = [
  ['emerald-ape-042', 1],
  ['neon-vessel-552', 1],
  ['ivory-baron-088', 1],
]
const cartDesktopCollection = [
  ['emerald-ape-042', 1],
  ['violet-nomad-314', 1],
  ['ivory-baron-088', 1],
]
const cartMobileCollection = [
  ...cartDesktopCollection,
  ['golden-beat-207', 1],
]
const errors = []

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })

async function contextFor(mode) {
  const context = await browser.newContext({
    viewport: viewportByMode[mode],
    deviceScaleFactor: 1,
    isMobile: mode === 'mobile',
    hasTouch: mode === 'mobile',
    serviceWorkers: 'allow',
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(`${mode} pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${mode} console: ${message.text()}`)
  })
  return { context, page }
}

async function open(mode, route, setup) {
  const { context, page } = await contextFor(mode)
  page.on('requestfailed', (request) => {
    if (
      request.url().includes('/api/') &&
      !request.failure()?.errorText.includes('ERR_ABORTED')
    ) {
      errors.push(`${mode} API request failed: ${request.method()} ${request.url()}`)
    }
  })
  page.on('response', (response) => {
    if (!response.url().includes('/api/')) return
    const contentType = response.headers()['content-type'] ?? ''
    if (response.status() >= 500 || !contentType.includes('application/json')) {
      errors.push(
        `${mode} API response invalid: ${response.status()} ${response.url()} (${contentType || 'no content-type'})`,
      )
    }
  })
  await page.goto(`${baseURL}/`)
  await page.getByTestId('socket-status').waitFor()
  await page.getByTestId('socket-status').filter({ hasText: 'event-received' }).waitFor({ timeout: 15000 })
  if (setup) await setup(page)
  await page.goto(`${baseURL}${route}`)
  await page.locator('#main').waitFor({ state: 'attached' })
  if (route === '/' || route === '/marketplace') {
    await page
      .locator(mode === 'mobile' ? '.mobile-nft-grid .nft-card' : '.desktop-nft-grid .nft-card')
      .first()
      .waitFor({ state: 'visible' })
  } else if (route.startsWith('/nft/')) {
    await page.locator('.nft-title-block h1').waitFor({ state: 'visible' })
    await page.locator('.nft-related .nft-card').first().waitFor({ state: 'visible' })
  } else if (route === '/cart') {
    await page.locator('.cart-item-subtotal').first().waitFor({ state: 'visible' }).catch(() => undefined)
    await page.locator('.cart-recommendations .nft-card').first().waitFor({ state: 'visible' })
  } else if (route === '/checkout') {
    await page.locator('#checkout-form').waitFor({ state: 'visible' })
    await page.locator('[data-testid="total"]').waitFor({ state: 'visible' })
  } else if (route === '/profile') {
    await page.locator('#profile-displayName').waitFor({ state: 'visible' })
  } else if (route === '/profile/wallets') {
    await page.locator('.wallet-record').first().waitFor({ state: 'visible' })
  } else if ((route.startsWith('/login') || route.startsWith('/register')) && mode === 'desktop') {
    await page.locator('.auth-market-backdrop .desktop-nft-grid .nft-card').first().waitFor({ state: 'visible' })
  }
  await page.evaluate(async () => {
    window.scrollTo(0, 0)
    await document.fonts.ready
    await Promise.all(
      [...document.images]
        .filter((image) => image.getBoundingClientRect().width > 0)
        .map((image) => image.decode().catch(() => undefined)),
    )
  })
  return { context, page }
}

async function login(page) {
  const status = await page.evaluate(async () =>
    (await fetch('/api/session/demo', { method: 'POST' })).status,
  )
  if (status !== 200) throw new Error(`Demo session failed: ${status}`)
}

async function addItems(page, items) {
  const statuses = await page.evaluate(async (rows) => {
    const results = []
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
  if (statuses.some((status) => status !== 201)) {
    throw new Error(`Cart fixture failed: ${statuses.join(', ')}`)
  }
}

async function capture(name, mode, route, { fullPage = mode === 'desktop', setup } = {}) {
  const { context, page } = await open(mode, route, setup)
  if (name === 'wallets' && mode === 'desktop') {
    await page.getByRole('button', { name: 'Cadastrar carteira', exact: true }).click()
    await page.locator('.wallet-editor-inline').waitFor({ state: 'visible' })
    await page.evaluate(() => window.scrollTo(0, 0))
  }
  const file = path.join(outputDir, `${name}-${mode}.png`)
  await page.screenshot({ path: file, fullPage, animations: 'disabled' })
  if (mode === 'desktop' && fullPage) {
    await page.screenshot({
      path: path.join(outputDir, `${name}-desktop-viewport.png`),
      fullPage: false,
      animations: 'disabled',
    })
  }
  if (mode === 'mobile') {
    await page.screenshot({
      path: path.join(outputDir, `${name}-mobile-full.png`),
      fullPage: true,
      animations: 'disabled',
    })
  }
  await context.close()
}

async function seedCartAndLogin(page, items) {
  await login(page)
  await addItems(page, items)
}

await capture('home', 'desktop', '/', { fullPage: true })
await capture('home', 'mobile', '/', { fullPage: false })
await capture('nft-details', 'desktop', '/nft/emerald-ape-042', { fullPage: true })
await capture('nft-details', 'mobile', '/nft/emerald-ape-042', { fullPage: false })
await capture('cart', 'desktop', '/cart', {
  fullPage: true,
  setup: (page) => addItems(page, cartDesktopCollection),
})
await capture('cart', 'mobile', '/cart', {
  fullPage: false,
  setup: (page) => addItems(page, cartMobileCollection),
})
await capture('checkout', 'desktop', '/checkout', {
  fullPage: true,
  setup: (page) => seedCartAndLogin(page, collection),
})
await capture('checkout', 'mobile', '/checkout', {
  fullPage: false,
  setup: (page) => seedCartAndLogin(page, collection),
})

async function createConfirmedOrder(page) {
  await seedCartAndLogin(page, collection)
  const created = await page.evaluate(async () => {
    const quoteResponse = await fetch('/api/checkout/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ network: 'ethereum' }),
    })
    const quote = await quoteResponse.json()
    if (!quoteResponse.ok) return { error: `quote ${quoteResponse.status}` }
    const orderResponse = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'visual-audit-order-2026',
      },
      body: JSON.stringify({
        quoteId: quote.id,
        collector: {
          displayName: 'Nova Collector',
          username: 'nova_1',
          email: 'nova@example.com',
        },
        wallet: {
          address: `0x${'1'.repeat(40)}`,
          network: 'ethereum',
          provider: 'metamask',
        },
      }),
    })
    const order = await orderResponse.json()
    if (!orderResponse.ok) return { error: `order ${orderResponse.status}` }
    await fetch(`/api/orders/${order.id}`)
    return { orderId: order.id }
  })
  if (!created.orderId) throw new Error(`Order fixture failed: ${created.error}`)
  return `/checkout/success?orderId=${created.orderId}`
}

for (const mode of ['desktop', 'mobile']) {
  const { context, page } = await open(mode, '/')
  const successRoute = await createConfirmedOrder(page)
  await page.goto(`${baseURL}${successRoute}`)
  await page.getByRole('heading', { name: /Compra confirmada/ }).waitFor({ timeout: 15000 })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)))
    window.scrollTo(0, 0)
  })
  await page.screenshot({
    path: path.join(outputDir, `confirmation-${mode}.png`),
    fullPage: mode === 'desktop',
    animations: 'disabled',
  })
  if (mode === 'desktop') {
    await page.screenshot({
      path: path.join(outputDir, 'confirmation-desktop-viewport.png'),
      fullPage: false,
      animations: 'disabled',
    })
  } else {
    await page.screenshot({
      path: path.join(outputDir, 'confirmation-mobile-full.png'),
      fullPage: true,
      animations: 'disabled',
    })
  }
  await context.close()
}

await capture('login', 'desktop', '/login?returnTo=%2F', { fullPage: true })
await capture('login', 'mobile', '/login?returnTo=%2F', { fullPage: false })
await capture('register', 'desktop', '/register?returnTo=%2F', { fullPage: true })
await capture('register', 'mobile', '/register?returnTo=%2F', { fullPage: false })
await capture('profile', 'desktop', '/profile', { fullPage: true, setup: login })
await capture('wallets', 'desktop', '/profile/wallets', { fullPage: true, setup: login })
await capture('profile', 'mobile', '/profile', { fullPage: false, setup: login })
await capture('wallets', 'mobile', '/profile/wallets', { fullPage: false, setup: login })

await writeFile(path.join(outputDir, 'runtime-errors.json'), JSON.stringify(errors, null, 2))
await browser.close()
if (errors.length) {
  throw new Error(`Visual capture reported runtime errors:\n${errors.join('\n')}`)
}
console.log(`Saved visual audit captures to ${outputDir}`)
