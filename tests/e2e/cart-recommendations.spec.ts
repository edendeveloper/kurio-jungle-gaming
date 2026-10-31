import { expect, test, type Page } from '@playwright/test'

const expected = [
  ['Cosmic Bloom #118', '1.29 ETH'],
  ['Violet Nomad #314', '1.39 ETH'],
  ['Ivory Baron #088', '1.79 ETH'],
  ['Golden Beat #207', '0.99 ETH'],
  ['Golden Signal #160', '0.39 ETH'],
]
async function openCart(page: Page, scenario = '') {
  await page.addInitScript((scenario) => {
    localStorage.setItem(
      'kurio:cart',
      JSON.stringify([{ nftId: 'emerald-ape-042', edition: 1, quantity: 2 }]),
    )
    if (scenario) localStorage.setItem('kurio:catalog-scenario', scenario)
  }, scenario)
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
  return page.getByRole('region', {
    name: 'Colecionadores também viram',
    exact: true,
  })
}

test('recomendações reutilizam os registros e mostram cinco cards no desktop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const section = await openCart(page)
  await expect(
    section.getByRole('heading', { name: 'Colecionadores também viram' }),
  ).toBeVisible()
  await expect(section.getByTestId('nft-card')).toHaveCount(8)
  for (const [index, [name, price]] of expected.entries()) {
    const card = section.getByTestId('nft-card').nth(index)
    await expect(card.getByRole('heading')).toHaveText(name)
    await expect(card.locator('.price-label')).toHaveText(`Preço: ${price}`)
    await expect(card.locator('.nft-card-art')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    )
    const box = (await card.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(120)
    expect(box.x + box.width).toBeLessThanOrEqual(1321)
    const first = (await section.getByTestId('nft-card').first().boundingBox())!
    expect(Math.abs(box.y - first.y)).toBeLessThan(1)
  }
  await expect(
    section
      .getByRole('navigation', { name: 'Paginação das recomendações' })
      .getByRole('button'),
  ).toHaveCount(2)
  const positions = await page.evaluate(() => ({
    recommendations: document
      .querySelector('.cart-recommendations')!
      .getBoundingClientRect().top,
    cart: document.querySelector('.commerce-columns')!.getBoundingClientRect()
      .bottom,
    footer: document.querySelector('footer')!.getBoundingClientRect().top,
    end: document
      .querySelector('.cart-recommendations')!
      .getBoundingClientRect().bottom,
  }))
  expect(positions.recommendations - positions.cart).toBeGreaterThanOrEqual(90)
  expect(positions.footer - positions.end).toBeCloseTo(96, 0)
})

test('indicadores funcionam por clique e teclado; cards abrem detalhes', async ({
  page,
}, testInfo) => {
  const section = await openCart(page)
  const second = section.getByRole('button', {
    name: 'Mostrar recomendações, página 2',
  })
  await second.click()
  await expect(second).toHaveAttribute('aria-current', 'page')
  const nextName = testInfo.project.name.includes('mobile')
    ? 'Ivory Baron #088'
    : 'Emerald Ape #042'
  await expect(
    section.getByRole('link', { name: `Ver ${nextName}`, exact: true }),
  ).toBeVisible()
  const first = section.getByRole('button', {
    name: 'Mostrar recomendações, página 1',
  })
  await first.focus()
  await page.keyboard.press('Enter')
  await expect(first).toHaveAttribute('aria-current', 'page')
  await section
    .getByRole('link', { name: 'Ver Cosmic Bloom #118', exact: true })
    .click()
  await expect(page).toHaveURL('/nft/cosmic-bloom-118')
  await expect(
    page.getByRole('heading', { name: 'Cosmic Bloom #118', exact: true }),
  ).toBeVisible()
})

test('mobile permite scroll horizontal local sem overflow da página', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 414, height: 896 })
  const section = await openCart(page)
  await expect(section.getByTestId('nft-card')).toHaveCount(8)
  await expect(section.getByRole('navigation').getByRole('button')).toHaveCount(
    4,
  )
  const viewport = section.locator('.recommendation-viewport')
  await viewport.evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: Math.max(0, top - 140), behavior: 'instant' })
  })
  await expect(viewport).toBeInViewport()
  if (testInfo.project.name.includes('mobile')) {
    const box = (await viewport.boundingBox())!
    const session = await page.context().newCDPSession(page)
    const y = box.y + 50
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width - 25, y }],
    })
    for (let step = 1; step <= 8; step++)
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: box.x + box.width - 25 - step * 37, y }],
      })
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await session.detach()
  } else {
    await viewport.focus()
    await page.keyboard.press('ArrowRight')
  }
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0)
  const last = section.getByRole('button', {
    name: 'Mostrar recomendações, página 4',
  })
  await last.click()
  await expect(last).toHaveAttribute('aria-current', 'page')
  await expect(
    section.getByRole('link', { name: 'Ver Neon Vessel #552', exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('loading possui skeleton e não bloqueia quantidades e totais', async ({
  page,
}) => {
  const section = await openCart(page, 'slow')
  await expect(
    section.getByRole('status', { name: 'Carregando recomendações' }),
  ).toBeVisible()
  await page.getByRole('button', { name: /^Aumentar quantidade de/ }).click()
  await expect(page.getByTestId('subtotal')).toHaveText('3.57 ETH')
  await expect(section.getByTestId('nft-card')).toHaveCount(8)
})

test('erro das recomendações é isolado do carrinho e permite retry', async ({
  page,
}) => {
  const section = await openCart(page, 'error')
  await expect(section.getByRole('alert')).toContainText(
    'Seu carrinho continua disponível',
  )
  await page.getByRole('button', { name: /^Diminuir quantidade de/ }).click()
  await expect(page.getByTestId('subtotal')).toHaveText('1.19 ETH')
  await expect(page.getByTestId('total')).toHaveText('1.206 ETH')
  await page.evaluate(() => localStorage.removeItem('kurio:catalog-scenario'))
  await section
    .getByRole('button', { name: 'Tentar carregar recomendações' })
    .click()
  await expect(section.getByTestId('nft-card')).toHaveCount(8)
  await page
    .getByRole('link', { name: 'Conectar e finalizar', exact: true })
    .click()
  await expect(page).toHaveURL(/login.*returnTo=%2Fcheckout/)
  await page.getByLabel('E-mail', { exact: true }).fill('nova@kurio.demo')
  await page.getByLabel('Senha', { exact: true }).fill('KurioDemo123!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Checkout', exact: true }),
  ).toBeVisible()
  await expect(page.getByTestId('subtotal')).toHaveText('1.19 ETH')
})

test('recomendações vazias mantêm carrinho e layout', async ({ page }) => {
  const section = await openCart(page, 'empty')
  await expect(
    section.getByText('Nenhuma recomendação disponível no momento.'),
  ).toBeVisible()
  await expect(page.getByTestId('subtotal')).toHaveText('2.38 ETH')
  await expect(section.getByRole('button')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('capturas de carrinho completo em 1440 e 414 pixels', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.includes('mobile')
  await page.setViewportSize({
    width: mobile ? 414 : 1440,
    height: mobile ? 896 : 900,
  })
  await page.addInitScript(() =>
    localStorage.setItem(
      'kurio:cart',
      JSON.stringify([
        { nftId: 'emerald-ape-042', edition: 1, quantity: 1 },
        { nftId: 'sage-nomad-009', edition: 1, quantity: 1 },
        { nftId: 'neon-vessel-552', edition: 1, quantity: 2 },
      ]),
    ),
  )
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(3)
  await expect(
    page.locator('.cart-recommendations').getByTestId('nft-card'),
  ).toHaveCount(8)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images, (image) =>
        image.decode().catch(() => undefined),
      ),
    )
    window.scrollTo(0, 0)
  })
  await page.screenshot({
    path: `docs/screenshots/stage5-1/cart-${mobile ? '414' : '1440'}-full.png`,
    fullPage: true,
  })
  await page.screenshot({
    path: `docs/screenshots/stage5-1/cart-${mobile ? '414' : '1440'}.png`,
  })
  await page
    .getByRole('region', { name: 'Colecionadores também viram', exact: true })
    .screenshot({
      path: `docs/screenshots/stage5-1/recommendations-${mobile ? '414' : '1440'}.png`,
    })
})
