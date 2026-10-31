import { apiLogin } from './helpers/auth.ts'
import { expect, test } from '@playwright/test'

test('carrega KURIO, consulta MSW e navega ao marketplace', async ({
  page,
}) => {
  const healthResponse = page.waitForResponse((response) =>
    response.url().endsWith('/api/health'),
  )
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'KURIO — início' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Início', exact: true }),
  ).toBeVisible()
  const response = await healthResponse
  expect(response.fromServiceWorker()).toBe(true)
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({
    status: 'ok',
    service: 'kurio-mock-api',
  })
  await expect(page.getByRole('status')).toHaveText('API mock: ok')
  await page.getByRole('link', { name: /^(Mercado|Marketplace)$/ }).click()
  await expect(page).toHaveURL('/marketplace')
  await expect(
    page.getByRole('heading', { name: 'Marketplace', exact: true }),
  ).toBeVisible()
})

const routes = [
  ['/', 'Início'],
  ['/marketplace', 'Marketplace'],
  ['/nft/emerald-ape-042', 'Emerald Ape #042'],
  ['/nft/exemplo', 'NFT não encontrado'],
  ['/cart', 'Carrinho'],
  ['/checkout', 'Checkout'],
  ['/checkout/success', 'Confirmação de pedido'],
  ['/profile', 'Perfil'],
  ['/profile/wallets', 'Carteiras'],
  ['/rota-inexistente', 'Página não encontrada'],
] as const

for (const [path, heading] of routes) {
  test(`acesso direto e refresh: ${path}`, async ({ page }) => {
    if (path.startsWith('/profile') || path.startsWith('/checkout')) {
      await page.goto('/login')
      await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
      await apiLogin(page)
    }
    await page.goto(path)
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible()
    await page.reload()
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  })
}
