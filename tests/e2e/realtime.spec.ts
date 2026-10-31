import { expect, test } from '@playwright/test'

test('MSW completes Socket.IO handshake and returns pong over the WebSocket transport', async ({ page }) => {
  const frames: string[] = []
  const logs: string[] = []
  page.on('console', (message) => logs.push(message.text()))
  page.on('pageerror', (error) => logs.push(`pageerror:${error.message}`))
  page.on('websocket', (socket) => {
    socket.on('framesent', (frame) => frames.push(String(frame.payload)))
    socket.on('framereceived', (frame) => frames.push(String(frame.payload)))
  })
  await page.goto('/')
  await expect(page.getByTestId('socket-status')).toBeVisible()
  await expect.poll(() => logs.includes('[realtime] MSW initialized')).toBe(true)
  const cartResponse = await page.evaluate(async () => {
    const response = await fetch('/api/cart', { headers: { 'X-Kurio-Session': 'guest' } })
    const text = await response.text()
    return {
      status: response.status,
      contentType: response.headers.get('content-type'),
      body: text.startsWith('{') ? JSON.parse(text) as { items?: unknown } : text.slice(0, 80),
    }
  })
  expect(cartResponse.contentType, `MSW logs: ${logs.join(' | ')}`).toContain('application/json')
  expect(cartResponse.status).toBe(200)
  expect(cartResponse.contentType).toContain('application/json')
  expect(typeof cartResponse.body).toBe('object')
  expect(Array.isArray((cartResponse.body as { items?: unknown[] }).items)).toBe(true)
  await expect(page.getByRole('link', { name: /Carrinho/ })).toBeVisible()
  await expect(page.getByTestId('socket-status')).toHaveText('event-received', { timeout: 15000 }).catch(() => {
    throw new Error(`Socket proof failed. WebSocket frames: ${frames.join(' | ')}; console: ${logs.join(' | ')}`)
  })
  expect(logs).toContain('[realtime] MSW initialized')
  expect(logs).toContain('[realtime] native WebSocket probe intercepted')
  expect(logs).toContain('[realtime] intercepted Socket.IO connection')
  expect(logs).toContain('[realtime] Socket.IO client connected')
  expect(logs).toContain('[realtime] ping-test received')
  expect(logs).toContain('[realtime] pong-test sent')
  expect(logs).toContain('[realtime] pong-test received')
  expect(logs.some((line) => line.startsWith('pageerror:'))).toBe(false)
  // MSW's in-memory WebSocket transport is not exposed as Chromium's network
  // WebSocket event, so assert the decoded client and server callbacks above.
  expect(logs).toContain('[realtime] ping-test received')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByTestId('socket-status')).toHaveText('event-received')
})

test('nft.updated reconciles catalog and cart, rejects stale duplicates, and recovers after reconnect', async ({ page }) => {
  const logs: string[] = []
  page.on('console', (message) => logs.push(message.text()))
  page.on('pageerror', (error) => logs.push(`pageerror:${error.message}`))
  await page.goto('/marketplace')
  await expect(page.getByTestId('socket-status')).toHaveText('event-received', { timeout: 15000 })
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' }).first()).toBeVisible()

  const addAndUpdate = await page.evaluate(async () => {
    const headers = { 'Content-Type': 'application/json', 'X-Kurio-Session': 'guest' }
    const add = await fetch('/api/cart/items', {
      method: 'POST', headers,
      body: JSON.stringify({ nftId: 'emerald-ape-042', edition: 1, quantity: 2 }),
    })
    const added = await add.json()
    const update = await fetch('/api/__mock/realtime/nfts/emerald-ape-042', {
      method: 'POST', headers,
      body: JSON.stringify({ priceEth: '1.49', availableQuantity: 1 }),
    })
    return { addStatus: add.status, added, updateStatus: update.status }
  })
  expect(addAndUpdate.addStatus).toBe(201)
  expect(addAndUpdate.updateStatus).toBe(200)
  await expect.poll(async () =>
    (await page.locator('.price-label:visible').allInnerTexts()).some((text) => text.includes('1.49 ETH')),
  ).toBe(true)
  await expect.poll(() => logs.some((line) => line.includes('[realtime] nft.updated applied'))).toBe(true)

  await page.getByRole('link', { name: /Carrinho/ }).click()
  const cartItem = page.getByTestId('cart-item').filter({ hasText: 'Emerald Ape #042' })
  await expect(cartItem.getByText('1.49 ETH')).toBeVisible()
  await expect(cartItem.locator('.cart-item-subtotal')).toContainText('2.98 ETH')
  await expect(cartItem).toContainText(/1.*dispon/)
  await expect(page.getByText(/Ajuste a quantidade ao estoque atual/)).toBeVisible()

  await page.evaluate(async () => {
    await fetch('/api/__mock/realtime/events/nft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nftId: 'emerald-ape-042', version: 'old', priceEth: '0.01', duplicate: true }),
    })
  })
  await expect(cartItem.getByText('1.49 ETH')).toBeVisible()
  await expect.poll(() => logs.filter((line) => line.includes('[realtime] nft.updated applied')).length).toBe(1)

  await page.evaluate(async () => {
    await fetch('/api/__mock/realtime/disconnect', { method: 'POST' })
  })
  await expect(page.getByTestId('socket-status')).toHaveText('disconnected')
  await page.evaluate(async () => {
    await fetch('/api/__mock/realtime/nfts/emerald-ape-042', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceEth: '1.59', availableQuantity: 4 }),
    })
  })
  await expect(page.getByTestId('socket-status')).toHaveText('event-received', { timeout: 15000 })
  await expect(cartItem.getByText('1.59 ETH')).toBeVisible({ timeout: 10000 })
  expect(logs.some((line) => line.startsWith('pageerror:'))).toBe(false)
})

test('preview rejects an HTML cart response without crashing and recovers on retry', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.addInitScript(() => localStorage.setItem('kurio:cart-scenario', 'html'))
  await page.goto('/cart')
  await expect(page.getByRole('alert')).toContainText(/carrinho/)
  await expect(page.getByRole('link', { name: /Carrinho/ }).first()).toBeVisible()
  expect(pageErrors.some((message) => message.includes("reading 'reduce'"))).toBe(false)
  await page.evaluate(() => localStorage.removeItem('kurio:cart-scenario'))
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: /vazio/ })).toBeVisible()
  expect(pageErrors).toEqual([])
})
