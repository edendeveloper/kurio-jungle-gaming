import { expect, test, type Page } from '@playwright/test'
import { apiRequest, uiLogin, logout, nova } from './helpers/auth.ts'

const nft = '/nft/emerald-ape-042'
const cards = (page: Page) =>
  page.getByTestId('nft-card').filter({ visible: true })
async function anonymous(page: Page) {
  await expect(page.locator('.app-shell')).toHaveAttribute(
    'data-auth-state',
    'anonymous',
  )
  expect((await apiRequest(page, '/session')).data.user).toBeNull()
  expect(
    (await page.context().cookies()).some(
      (cookie) => cookie.name === 'kurio_session',
    ),
  ).toBe(false)
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
async function loginForm(page: Page) {
  await page.getByLabel('E-mail', { exact: true }).fill(nova.email)
  await page.getByLabel('Senha', { exact: true }).fill(nova.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

test('visitante explora Home, busca, filtros, ordenação, páginas e detalhes sem sessão', async ({
  page,
  isMobile,
}) => {
  await page.goto('/')
  await expect(cards(page).first()).toBeVisible()
  await anonymous(page)
  await page
    .getByRole('link', { name: /^(Mercado|Marketplace)$/ })
    .filter({ visible: true })
    .click()
  await expect(cards(page)).toHaveCount(9)
  await page.getByRole('button', { name: 'Página 2', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await page.getByRole('searchbox').fill('Emerald')
  await expect(cards(page)).toHaveCount(1)
  if (isMobile)
    await page.getByRole('button', { name: 'Abrir filtros' }).click()
  const filters = page.getByRole(isMobile ? 'dialog' : 'complementary', {
    name: 'Filtros do catálogo',
  })
  await filters.getByRole('radio', { name: 'Ethereum', exact: true }).check()
  if (isMobile)
    await filters.getByRole('button', { name: 'Ver resultados' }).click()
  await page
    .getByRole('combobox', { name: /Ordenar/ })
    .selectOption('price_asc')
  await expect(page).toHaveURL(/network=ethereum/)
  await expect(page).toHaveURL(/sort=price_asc/)
  await cards(page).first().getByRole('link').first().click()
  await expect(page).toHaveURL(nft)
  await expect(
    page.getByRole('button', { name: 'Comprar NFT', exact: true }),
  ).toBeVisible()
  await anonymous(page)
})

test('modal fecha por botão e Escape, reabre e permite cadastro sem autenticar ao fechar', async ({
  page,
  isMobile,
}) => {
  await page.goto('/marketplace?search=Emerald')
  if (isMobile)
    await page.getByRole('link', { name: 'Perfil', exact: true }).click()
  else await page.getByRole('link', { name: 'Entrar', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Entrar', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Fechar autenticação' }),
  ).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(
    page.getByRole('button', {
      name: 'Entrar como Nova (conta fictícia de teste)',
    }),
  ).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Fechar autenticação' }),
  ).toBeFocused()
  await page.getByRole('button', { name: 'Fechar autenticação' }).click()
  await expect(page).toHaveURL(
    isMobile ? '/marketplace' : '/marketplace?search=Emerald',
  )
  await anonymous(page)
  await expect(page.locator('#main')).toBeFocused()
  await page.goto('/login?returnTo=/marketplace')
  await page.getByRole('link', { name: 'Crie uma conta', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Criar perfil de colecionador' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL('/marketplace')
  await anonymous(page)
  await page.goto('/login?returnTo=/marketplace')
  await page
    .getByRole('button', { name: 'Continuar explorando sem entrar' })
    .click()
  await expect(cards(page)).toHaveCount(9)
  await anonymous(page)
})

test('favoritar pede login explicitamente e fechar retorna ao NFT público', async ({
  page,
}) => {
  await page.goto(nft)
  await page.getByRole('button', { name: 'Favoritar NFT', exact: true }).click()
  await expect(page).toHaveURL(/login.*returnTo=%2Fnft%2Femerald/)
  await expect(page.getByRole('dialog', { name: 'Entrar', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(nft)
  await anonymous(page)
})

test('carrinho visitante permite quantidades, cupom e refresh; login retoma checkout com mesclagem idempotente', async ({
  page,
}, testInfo) => {
  await page.setViewportSize(
    testInfo.project.name.includes('mobile')
      ? { width: 414, height: 896 }
      : { width: 1440, height: 900 },
  )
  // The authenticated cart already contains one unit, created through the real session API.
  await uiLogin(page)
  expect(
    (
      await apiRequest(page, '/cart/items', 'POST', {
        nftId: 'emerald-ape-042',
        edition: 1,
        quantity: 1,
      })
    ).status,
  ).toBe(201)
  await logout(page)
  await anonymous(page)
  await page.goto(nft)
  await page.getByRole('button', { name: 'Comprar NFT', exact: true }).click()
  await expect(page).toHaveURL('/cart')
  await page.getByRole('button', { name: /^Aumentar quantidade de/ }).click()
  await expect(page.getByTestId('subtotal')).toHaveText('2.38 ETH')
  await page.getByRole('button', { name: /^Diminuir quantidade de/ }).click()
  await expect(page.getByTestId('subtotal')).toHaveText('1.19 ETH')
  await page.getByRole('button', { name: /^Aumentar quantidade de/ }).click()
  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page.getByTestId('discount')).toHaveText('−0.238 ETH')
  await page.reload()
  await expect(page.getByTestId('subtotal')).toHaveText('2.38 ETH')
  await expect(page.getByTestId('discount')).toHaveText('−0.238 ETH')
  await anonymous(page)
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true)
  await page.screenshot({
    path: `docs/screenshots/anonymous/cart-${testInfo.project.name.includes('mobile') ? '414' : '1440'}.png`,
    fullPage: true,
    scale: 'css',
  })
  await page
    .getByRole('link', { name: 'Conectar e finalizar', exact: true })
    .click()
  await expect(page).toHaveURL(/login.*returnTo=%2Fcheckout/)
  await page
    .getByRole('button', { name: 'Continuar explorando sem entrar' })
    .click()
  await expect(page).toHaveURL('/cart')
  await expect(page.getByTestId('subtotal')).toHaveText('2.38 ETH')
  await page
    .getByRole('link', { name: 'Conectar e finalizar', exact: true })
    .click()
  await loginForm(page)
  await expect(page).toHaveURL('/checkout')
  await expect(page.getByTestId('subtotal')).toHaveText('3.57 ETH')
  await page.reload()
  await expect(page.getByTestId('subtotal')).toHaveText('3.57 ETH')
  await logout(page)
  await page.goto('/cart')
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio.' }),
  ).toBeVisible()
  await page.goto(nft)
  await page.getByRole('button', { name: 'Comprar NFT', exact: true }).click()
  await page.getByRole('button', { name: /^Remover Emerald/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio.' }),
  ).toBeVisible()
  await anonymous(page)
})

test('401 na consulta de sessão estabelece anonymous sem loop, bloqueando somente dados privados', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('kurio:auth-scenario', 'anonymous-401'),
  )
  await page.goto('/cart')
  await expect(page.locator('.app-shell')).toHaveAttribute(
    'data-auth-state',
    'anonymous',
  )
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio.' }),
  ).toBeVisible()
  for (const path of [
    '/profile',
    '/wallets',
    '/favorites',
    '/orders/KUR-private',
  ])
    expect((await apiRequest(page, path)).status).toBe(401)
  await page.goto('/profile/wallets')
  await expect(page).toHaveURL(/login.*returnTo=%2Fprofile%2Fwallets/)
  await expect(page.getByRole('dialog', { name: 'Entrar', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL('/marketplace')
  await expect(cards(page)).toHaveCount(9)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('falha de verificação é distinta de anonymous e não bloqueia o catálogo ou carrinho visitante', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('kurio:auth-scenario', 'error'),
  )
  await page.goto('/cart')
  await expect(page.locator('.app-shell')).toHaveAttribute(
    'data-auth-state',
    'unavailable',
  )
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Tentar validar sessão' }),
  ).toBeVisible()
  await page.evaluate(() => localStorage.removeItem('kurio:auth-scenario'))
  await page.getByRole('button', { name: 'Tentar validar sessão' }).click()
  await anonymous(page)
})

test('sessão expirada em rota pública retorna a anonymous sem abrir login ou expor carrinho privado', async ({
  page,
}) => {
  await uiLogin(page)
  await apiRequest(page, '/cart/items', 'POST', {
    nftId: 'emerald-ape-042',
    edition: 1,
    quantity: 1,
  })
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
  expect((await apiRequest(page, '/session/expire', 'POST')).status).toBe(200)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio.' }),
  ).toBeVisible()
  await expect(page).toHaveURL('/cart')
  await anonymous(page)
  await page
    .getByRole('link', { name: 'Continuar explorando', exact: true })
    .click()
  await expect(cards(page)).toHaveCount(9)
})
