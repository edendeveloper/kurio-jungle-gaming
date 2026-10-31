import { apiLogin, apiRequest, luna, nova } from './helpers/auth.ts'
import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import type { CheckoutQuote, PurchaseOrder } from '../../src/types/checkout.ts'
import type { CartResponse } from '../../src/types/collector.ts'

const emerald = 'emerald-ape-042'
async function capture(page: Page, name: string) {
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
    path: `docs/screenshots/stage5/${name}.png`,
    fullPage: true,
  })
  await page.screenshot({
    path: `docs/screenshots/stage5/${name}-viewport.png`,
  })
}
async function request<T>(
  page: Page,
  path: string,
  method = 'GET',
  body?: unknown,
  key?: string,
) {
  return page.evaluate(
    async ({ path, method, body, key }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { 'Idempotency-Key': key } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      return { status: response.status, data: (await response.json()) as T }
    },
    { path, method, body, key },
  )
}
async function start(page: Page, quantity = 1) {
  await page.goto('/cart')
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio.' }),
  ).toBeVisible()
  await request(page, '/session/demo', 'POST')
  expect(
    (
      await request(page, '/cart/items', 'POST', {
        nftId: emerald,
        edition: 1,
        quantity,
      })
    ).status,
  ).toBe(201)
  await page.reload()
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
}
async function quoteBody(page: Page) {
  const quote = await request<CheckoutQuote>(page, '/checkout/quote', 'POST', {
    network: 'ethereum',
  })
  expect(quote.status).toBe(200)
  return {
    quoteId: quote.data.id,
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
  }
}
async function confirmed(page: Page, id: string) {
  await expect
    .poll(
      async () =>
        (await request<PurchaseOrder>(page, `/orders/${id}`)).data.status,
    )
    .toBe('confirmed')
  return (await request<PurchaseOrder>(page, `/orders/${id}`)).data
}
async function fill(page: Page) {
  await page.getByLabel('Nome de exibição').fill('Nova Collector')
  await page.getByLabel('Nome de usuário').fill('nova_1')
  await page.getByLabel('E-mail', { exact: true }).fill('nova@example.com')
  await page.getByRole('radio', { name: /Principal · demonstração/ }).check()
  await expect(
    page.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeEnabled()
}

test('fluxo completo: detalhes, carrinho, cupom, checkout e comprovante persistido', async ({
  page,
}, testInfo) => {
  const realtimeLogs: string[] = []
  page.on('console', (message) => realtimeLogs.push(message.text()))
  const mobile = testInfo.project.name.includes('mobile')
  await page.setViewportSize(
    mobile ? { width: 414, height: 896 } : { width: 1440, height: 900 },
  )
  await page.goto(`/nft/${emerald}`)
  await page
    .getByRole('button', { name: 'Aumentar quantidade', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Aumentar quantidade', exact: true })
    .click()
  await page.getByRole('button', { name: 'Comprar NFT', exact: true }).click()
  await expect(page.getByTestId('subtotal')).toHaveText('3.57 ETH')
  await page.getByRole('button', { name: /^Aumentar quantidade de/ }).click()
  await expect(page.getByTestId('subtotal')).toHaveText('4.76 ETH')
  await page.getByRole('button', { name: /^Diminuir quantidade de/ }).click()
  await expect(page.getByTestId('subtotal')).toHaveText('3.57 ETH')
  await page.reload()
  await expect(page.getByText('Quantidade: 3', { exact: true })).toBeVisible()
  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page.getByTestId('discount')).toHaveText('−0.357 ETH')
  await expect(page.getByTestId('network-fee')).toHaveText('0.016 ETH')
  await expect(page.getByTestId('total')).toHaveText('3.229 ETH')
  await capture(page, `cart-${mobile ? 'mobile' : 'desktop'}`)
  await page
    .getByRole('link', { name: 'Conectar e finalizar', exact: true })
    .click()
  await page.getByLabel('E-mail', { exact: true }).fill(nova.email)
  await page.getByLabel('Senha', { exact: true }).fill(nova.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await fill(page)
  await capture(page, `checkout-${mobile ? 'mobile' : 'desktop'}`)
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(page).toHaveURL(/checkout\/success\?orderId=KUR-/)
  await expect(
    page.getByRole('heading', { name: 'Compra confirmada', exact: true }),
  ).toBeVisible()
  await expect.poll(() => realtimeLogs.some((line) => line.includes('[realtime] order.updated applied'))).toBe(true)
  await expect(page.getByTestId('total')).toHaveText('3.229 ETH')
  const url = page.url()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Compra confirmada', exact: true }),
  ).toBeVisible()
  await expect(page).toHaveURL(url)
  expect((await request<CartResponse>(page, '/cart')).data.items).toHaveLength(
    0,
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await expect(page.getByRole('link', { name: /Etherscan/ })).toHaveCount(0)
  await capture(page, `success-${mobile ? 'mobile' : 'desktop'}`)
  await mkdir('docs/screenshots/ux-polish', { recursive: true })
  await page.screenshot({
    path: `docs/screenshots/ux-polish/confirmation-${mobile ? 'mobile' : 'desktop'}.png`,
    fullPage: true,
    scale: 'css',
  })
})

test('bloqueia a cotação anterior e exige aceite explícito após nft.updated', async ({ page }) => {
  await start(page)
  await page.goto('/checkout')
  await fill(page)
  await expect(page.getByTestId('subtotal')).toHaveText('1.19 ETH')

  await page.evaluate(async () => {
    await fetch('/api/__mock/realtime/nfts/emerald-ape-042', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceEth: '1.29', availableQuantity: 5 }),
    })
  })

  await expect(page.getByRole('button', { name: 'Aceitar valores atualizados' })).toBeVisible()
  await expect(page.getByTestId('subtotal')).toHaveText('1.29 ETH')
  const confirm = page.getByRole('button', { name: 'Confirmar compra', exact: true })
  await expect(confirm).toBeDisabled()
  await page.getByRole('button', { name: 'Aceitar valores atualizados' }).click()
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect(page).toHaveURL(/checkout\/success\?orderId=KUR-/)
  await expect(page.getByRole('heading', { name: 'Compra confirmada', exact: true })).toBeVisible()
  await expect(page.getByTestId('subtotal')).toHaveText('1.29 ETH')
})

test('quantidade limitada, identidade sem duplicações, badge e remoção', async ({
  page,
}) => {
  await start(page, 4)
  await page.getByRole('button', { name: /^Aumentar quantidade de/ }).click()
  await expect(
    page.getByRole('button', { name: /^Aumentar quantidade de/ }),
  ).toBeDisabled()
  expect(
    (
      await request(page, '/cart/items', 'POST', {
        nftId: emerald,
        edition: 1,
        quantity: 1,
      })
    ).status,
  ).toBe(409)
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
  await expect(page.locator('.desktop-header')).toContainText('5')
  await page
    .getByRole('button', { name: 'Remover Emerald Ape #042', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio.' }),
  ).toBeVisible()
  expect(
    (await request<CartResponse>(page, '/cart')).data.totals.totalEth,
  ).toBe('0')
})
test('cupons inválido, expirado e incompatível; aplicação e remoção', async ({
  page,
}) => {
  await start(page)
  for (const code of ['WRONG', 'EXPIRED', 'POLYGON20']) {
    await page.getByLabel('Código promocional').fill(code)
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByTestId('discount')).toHaveText('−0 ETH')
  }
  await page.getByLabel('Código promocional').fill('LAUNCH5')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page.getByTestId('discount')).toHaveText('−0.05 ETH')
  await page.getByRole('button', { name: 'Remover cupom LAUNCH5' }).click()
  await expect(page.getByTestId('discount')).toHaveText('−0 ETH')
})
test('checkout vazio e confirmação sem pedido não permitem sucesso', async ({
  page,
}) => {
  await page.goto('/cart')
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio.' }),
  ).toBeVisible()
  await request(page, '/session/demo', 'POST')
  await page.goto('/checkout')
  await expect(
    page.getByText('Não é possível finalizar um carrinho vazio.'),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Confirmar compra' }),
  ).toHaveCount(0)
  await page.goto('/checkout/success')
  await expect(page.getByText('Nenhum pedido informado.')).toBeVisible()
  await page.goto('/checkout/success?orderId=KUR-missing')
  await expect(
    page.getByRole('heading', { name: 'Pedido indisponível' }),
  ).toBeVisible()
})
test('valida campos obrigatórios, endereço, rede e provedor', async ({
  page,
}) => {
  await start(page)
  await page.goto('/checkout')
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(page.getByLabel('Nome de exibição')).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page.getByLabel('Endereço da carteira')).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await fill(page)
  await page.getByLabel('Endereço da carteira').fill('invalid')
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(
    page.getByText('Endereço com formato incompatível com a rede selecionada.'),
  ).toBeVisible()
  await page.getByLabel('Rede blockchain').selectOption('polygon')
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'A rede da carteira deve corresponder' }),
  ).toBeVisible()
  expect(
    (
      await request(
        page,
        '/orders',
        'POST',
        {
          ...(await quoteBody(page)),
          wallet: {
            address: '7'.repeat(32),
            network: 'solana',
            provider: 'metamask',
          },
        },
        'invalid-wallet-1',
      )
    ).status,
  ).toBe(422)
})
test('servidor deduplica cliques simultâneos e rejeita reutilização incompatível', async ({
  page,
}) => {
  await start(page, 2)
  const body = await quoteBody(page),
    key = 'same-attempt-123'
  const results = await Promise.all([
    request<PurchaseOrder>(page, '/orders', 'POST', body, key),
    request<PurchaseOrder>(page, '/orders', 'POST', body, key),
  ])
  expect(results[0].data.id).toBe(results[1].data.id)
  expect(
    (
      await request(
        page,
        '/orders',
        'POST',
        { ...body, collector: { ...body.collector, displayName: 'Other' } },
        key,
      )
    ).status,
  ).toBe(409)
  const order = await confirmed(page, results[0].data.id)
  expect(
    (await request<PurchaseOrder>(page, '/orders', 'POST', body, key)).data.id,
  ).toBe(order.id)
  const nft = await request<{ availability: number }>(page, `/nfts/${emerald}`)
  expect(nft.data.availability).toBe(3)
  expect((await request<CartResponse>(page, '/cart')).data.items).toHaveLength(
    0,
  )
})
test('revalida estoque, preço e cupom antes de criar pedido', async ({
  page,
}) => {
  await start(page, 3)
  const body = await quoteBody(page)
  await page.evaluate(() =>
    localStorage.setItem('kurio:nft-scenario', 'sold-out'),
  )
  expect(
    (await request(page, '/orders', 'POST', body, 'stock-attempt-1')).status,
  ).toBe(409)
  await page.evaluate(() =>
    localStorage.setItem('kurio:nft-scenario', 'changed'),
  )
  await request(page, `/cart/items/${emerald}/1`, 'PATCH', { quantity: 1 })
  expect(
    (await request(page, '/orders', 'POST', body, 'price-attempt-1')).status,
  ).toBe(409)
  await request(page, '/cart/coupon', 'POST', { code: 'KURIO10' })
  const couponBody = await quoteBody(page)
  await page.evaluate(() =>
    localStorage.setItem('kurio:coupon-scenario', 'expired'),
  )
  expect(
    (await request(page, '/orders', 'POST', couponBody, 'coupon-attempt-1'))
      .status,
  ).toBe(422)
  expect((await request<CartResponse>(page, '/cart')).data.items).toHaveLength(
    1,
  )
})
test('falha de confirmação preserva carrinho e recuperação reutiliza a tentativa', async ({
  page,
}) => {
  await start(page)
  await page.evaluate(() =>
    localStorage.setItem('kurio:checkout-scenario', 'error'),
  )
  await page.goto('/checkout')
  await fill(page)
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Retomar tentativa de compra' }),
  ).toBeVisible()
  expect((await request<CartResponse>(page, '/cart')).data.items).toHaveLength(
    1,
  )
  await page.evaluate(() => localStorage.removeItem('kurio:checkout-scenario'))
  await page
    .getByRole('button', { name: 'Recuperar tentativa', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Compra confirmada', exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () =>
        Object.keys(JSON.parse(localStorage.getItem('kurio:cart')!).orders)
          .length,
    ),
  ).toBe(1)
})
test('resposta perdida é recuperável após reload sem criar outro pedido', async ({
  page,
}) => {
  await start(page)
  await page.evaluate(() =>
    localStorage.setItem('kurio:checkout-scenario', 'response-lost'),
  )
  await page.goto('/checkout')
  await fill(page)
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Retomar tentativa de compra' }),
  ).toBeVisible()
  await page.reload()
  await page
    .getByRole('link', { name: 'Consultar pedido', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Compra confirmada', exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () =>
        Object.keys(JSON.parse(localStorage.getItem('kurio:cart')!).orders)
          .length,
    ),
  ).toBe(1)
})
test('pedido recusado e estoque alterado durante processamento preservam itens', async ({
  page,
}) => {
  await start(page)
  await page.evaluate(() =>
    localStorage.setItem('kurio:checkout-scenario', 'declined'),
  )
  const result = await request<PurchaseOrder>(
    page,
    '/orders',
    'POST',
    await quoteBody(page),
    'declined-attempt-1',
  )
  await expect
    .poll(
      async () =>
        (await request<PurchaseOrder>(page, `/orders/${result.data.id}`)).data
          .status,
    )
    .toBe('rejected')
  await page.goto(`/checkout/success?orderId=${result.data.id}`)
  await expect(
    page.getByRole('heading', { name: 'Compra não confirmada', exact: true }),
  ).toBeVisible()
  expect((await request<CartResponse>(page, '/cart')).data.items).toHaveLength(
    1,
  )
  await page.evaluate(() =>
    localStorage.setItem('kurio:checkout-scenario', 'slow'),
  )
  const next = await request<PurchaseOrder>(
    page,
    '/orders',
    'POST',
    await quoteBody(page),
    'pending-stock-1',
  )
  await page.evaluate(() =>
    localStorage.setItem('kurio:nft-scenario', 'sold-out'),
  )
  await expect
    .poll(
      async () =>
        (await request<PurchaseOrder>(page, `/orders/${next.data.id}`)).data
          .errorCode,
    )
    .toBe('INSUFFICIENT_STOCK')
  expect((await request<CartResponse>(page, '/cart')).data.items).toHaveLength(
    1,
  )
})
test('confirmação remove apenas quantidades compradas e mantém snapshot e autorização', async ({
  page,
}) => {
  await start(page)
  const order = await request<PurchaseOrder>(
    page,
    '/orders',
    'POST',
    await quoteBody(page),
    'snapshot-attempt-1',
  )
  await request(page, '/cart/items', 'POST', {
    nftId: emerald,
    edition: 1,
    quantity: 1,
  })
  const receipt = await confirmed(page, order.data.id)
  expect(
    (await request<CartResponse>(page, '/cart')).data.items[0].quantity,
  ).toBe(1)
  await page.evaluate(() =>
    localStorage.setItem('kurio:nft-scenario', 'changed'),
  )
  expect(
    (await request<PurchaseOrder>(page, `/orders/${receipt.id}`)).data.totals,
  ).toEqual(receipt.totals)
  await apiLogin(page, luna)
  expect((await request(page, `/orders/${receipt.id}`)).status).toBe(404)
  await apiRequest(page, '/session/logout', 'POST')
  expect(
    (await request(page, '/orders', 'POST', {}, 'unauthorized-1')).status,
  ).toBe(401)
})
test('migra carrinho legado sem perder dados ou duplicar linhas', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'kurio:cart',
      JSON.stringify([
        { nftId: 'emerald-ape-042', edition: 1, quantity: 1 },
        { nftId: 'emerald-ape-042', edition: 1, quantity: 2 },
      ]),
    ),
  )
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
  await expect(page.getByTestId('subtotal')).toHaveText('3.57 ETH')
})

test('redução de estoque permite corrigir quantidade e erro de API não altera carrinho', async ({
  page,
}) => {
  await start(page, 5)
  await page.evaluate(() =>
    localStorage.setItem('kurio:nft-scenario', 'changed'),
  )
  await page.reload()
  await expect(
    page.getByText('Ajuste a quantidade ao estoque atual.'),
  ).toBeVisible()
  await page.getByRole('button', { name: /^Diminuir quantidade de/ }).click()
  await expect(page.getByText('Quantidade: 2', { exact: true })).toBeVisible()
  await expect(page.getByTestId('subtotal')).toHaveText('2.98 ETH')
  await page.evaluate(() =>
    localStorage.setItem('kurio:cart-scenario', 'error'),
  )
  await page.getByRole('button', { name: /^Diminuir quantidade de/ }).click()
  await expect(
    page.getByText('Não foi possível carregar o carrinho.'),
  ).toBeVisible()
  await page.evaluate(() => localStorage.removeItem('kurio:cart-scenario'))
  await page
    .getByRole('button', { name: 'Tentar novamente', exact: true })
    .click()
  await expect(page.getByText('Quantidade: 2', { exact: true })).toBeVisible()
})

test('cotação expirada, quantidades inválidas, redes mistas e totais enviados não são aceitos', async ({
  page,
}) => {
  await start(page)
  for (const quantity of [0, -1, 0.5, 6]) {
    expect(
      (await request(page, `/cart/items/${emerald}/1`, 'PATCH', { quantity }))
        .status,
    ).toBe(quantity === 6 ? 409 : 400)
  }
  const expired = await quoteBody(page)
  await page.evaluate((id) => {
    const state = JSON.parse(localStorage.getItem('kurio:cart')!)
    state.quotes[id].expiresAt = 0
    localStorage.setItem('kurio:cart', JSON.stringify(state))
  }, expired.quoteId)
  expect(
    (await request(page, '/orders', 'POST', expired, 'expired-quote-1')).status,
  ).toBe(409)
  const body = await quoteBody(page)
  const order = await request<PurchaseOrder>(
    page,
    '/orders',
    'POST',
    { ...body, totals: { totalEth: '0' }, priceEth: '0' },
    'server-total-1',
  )
  expect(order.data.totals.totalEth).toBe('1.206')
  await confirmed(page, order.data.id)
  await request(page, '/cart/items', 'POST', {
    nftId: emerald,
    edition: 1,
    quantity: 1,
  })
  const records = await request<{
    items: { id: string; edition: number; network: string }[]
  }>(page, '/nfts?pageSize=24')
  const polygon = records.data.items.find((item) => item.network === 'polygon')!
  await request(page, '/cart/items', 'POST', {
    nftId: polygon.id,
    edition: polygon.edition,
    quantity: 1,
  })
  expect(
    (await request(page, '/checkout/quote', 'POST', { network: 'ethereum' }))
      .status,
  ).toBe(422)
})

test('layout sem overflow em 414, 768, 1024 e 1440 com valores de 18 casas', async ({
  page,
}) => {
  await start(page)
  await request(page, '/cart/items', 'POST', {
    nftId: 'study-color-09',
    edition: 1,
    quantity: 1,
  })
  for (const width of [414, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.reload()
    await expect(page.getByTestId('cart-item')).toHaveCount(2)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.goto('/checkout')
    await expect(
      page.getByRole('heading', { name: 'Checkout', exact: true }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.goto('/cart')
  }
})
