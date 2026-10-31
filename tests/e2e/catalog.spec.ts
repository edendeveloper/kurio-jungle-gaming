import { expect, test, type Page } from '@playwright/test'

const cards = (page: Page) =>
  page.getByTestId('nft-card').filter({ visible: true })
async function filters(page: Page, mobile: boolean) {
  if (mobile) {
    await page.getByRole('button', { name: 'Abrir filtros' }).click()
    return page.getByRole('dialog', { name: 'Filtros do catálogo' })
  }
  return page.getByRole('complementary', { name: 'Filtros do catálogo' })
}
async function closeFilters(page: Page, mobile: boolean) {
  if (mobile)
    await page
      .getByRole('button', { name: 'Ver resultados', exact: true })
      .click()
}

test('listagem via MSW traz metadados e nove registros', async ({ page }) => {
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/nfts',
  )
  await page.goto('/marketplace')
  const result = await response
  expect(result.fromServiceWorker()).toBe(true)
  expect((await result.json()).pagination).toEqual({
    page: 1,
    pageSize: 9,
    totalItems: 20,
    totalPages: 3,
  })
  await expect(cards(page)).toHaveCount(9)
  await expect(cards(page).first()).toContainText('Emerald Ape #042')
  await expect(
    page.getByRole('button', { name: 'Página anterior' }),
  ).toBeDisabled()
})

test('busca com debounce é combinada e ignora maiúsculas', async ({ page }) => {
  await page.goto('/marketplace')
  await expect(cards(page)).toHaveCount(9)
  await page.getByRole('searchbox').fill('EMERALD')
  await expect(page).toHaveURL(/search=EMERALD/)
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first()).toContainText('Emerald Ape #042')
  await page.getByRole('button', { name: 'Limpar pesquisa' }).click()
  await expect(cards(page)).toHaveCount(9)
  await expect(page).toHaveURL('/marketplace')
  await page.getByRole('searchbox').fill('Kurio Origins')
  await expect(cards(page)).toHaveCount(8)
})

test('resultado vazio oferece limpar filtros', async ({ page }) => {
  await page.goto('/marketplace?search=inexistente')
  await expect(
    page.getByRole('heading', { name: 'Nenhum NFT encontrado' }),
  ).toBeVisible()
  await expect(cards(page)).toHaveCount(0)
  await page
    .locator('.catalog-state')
    .getByRole('button', { name: 'Limpar filtros' })
    .click()
  await expect(cards(page)).toHaveCount(9)
})

test('categoria, rede e preço combinam filtros e persistem no refresh', async ({
  page,
  isMobile,
}) => {
  await page.goto('/marketplace')
  const form = await filters(page, isMobile)
  await form.getByRole('radio', { name: 'Arte digital', exact: true }).check()
  await form.getByRole('radio', { name: 'Ethereum', exact: true }).check()
  await form.getByLabel('Mínimo (ETH)', { exact: true }).fill('1')
  await form.getByLabel('Máximo (ETH)', { exact: true }).fill('1.5')
  await form.getByRole('button', { name: 'Aplicar preço' }).click()
  await closeFilters(page, isMobile)
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first()).toContainText('Emerald Ape #042')
  for (const param of [
    'category=digital-art',
    'network=ethereum',
    'minPrice=1',
    'maxPrice=1.5',
  ])
    await expect(page).toHaveURL(new RegExp(param))
  await page.reload()
  await expect(cards(page)).toHaveCount(1)
  const restored = await filters(page, isMobile)
  await expect(
    restored.getByRole('radio', { name: 'Ethereum', exact: true }),
  ).toBeChecked()
  await expect(
    restored.getByLabel('Máximo (ETH)', { exact: true }),
  ).toHaveValue('1.5')
})

test('preço valida negativos, texto e intervalo invertido', async ({
  page,
  isMobile,
}) => {
  await page.goto('/marketplace')
  const form = await filters(page, isMobile)
  for (const value of ['-1', 'abc', '0.1234567891234567891']) {
    await form.getByLabel('Mínimo (ETH)', { exact: true }).fill(value)
    await form.getByRole('button', { name: 'Aplicar preço' }).click()
    await expect(form.getByRole('alert')).toContainText('Use valores positivos')
    await expect(page).not.toHaveURL(/minPrice/)
  }
  await form.getByLabel('Mínimo (ETH)', { exact: true }).fill('2')
  await form.getByLabel('Máximo (ETH)', { exact: true }).fill('1')
  await form.getByRole('button', { name: 'Aplicar preço' }).click()
  await expect(form.getByRole('alert')).toContainText(
    'mínimo não pode ser maior',
  )
  await form
    .getByRole('button', { name: 'Limpar filtros', exact: true })
    .click()
  await expect(form.getByLabel('Mínimo (ETH)', { exact: true })).toHaveValue('')
  await expect(form.getByRole('alert')).toHaveCount(0)
})

test('preço preserva 18 casas decimais na URL e API', async ({
  page,
  isMobile,
}) => {
  await page.goto('/marketplace')
  const form = await filters(page, isMobile)
  const exact = '0.123456789123456789'
  await form.getByLabel('Mínimo (ETH)', { exact: true }).fill(exact)
  await form.getByLabel('Máximo (ETH)', { exact: true }).fill(exact)
  await form.getByRole('button', { name: 'Aplicar preço' }).click()
  await closeFilters(page, isMobile)
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first()).toContainText(exact)
  expect(new URL(page.url()).searchParams.get('minPrice')).toBe(exact)
  await page.reload()
  await expect(cards(page)).toHaveCount(1)
  expect(new URL(page.url()).searchParams.get('maxPrice')).toBe(exact)
})

test('ordenar preço crescente, decrescente e popularidade', async ({
  page,
}) => {
  await page.goto('/marketplace')
  await page
    .getByRole('combobox', { name: 'Ordenar por' })
    .selectOption('price_asc')
  await expect(cards(page).first()).toContainText('Estudo de acesso')
  await page
    .getByRole('combobox', { name: 'Ordenar por' })
    .selectOption('price_desc')
  await expect(cards(page).first()).toContainText('Estudo de movimento')
  await page
    .getByRole('combobox', { name: 'Ordenar por' })
    .selectOption('popular')
  await expect(cards(page).first()).toContainText('Estudo de movimento')
  await expect(page).toHaveURL(/sort=popular/)
})

test('abas mudam os resultados e suportam teclado', async ({ page }) => {
  await page.goto('/marketplace')
  await page.getByRole('tab', { name: 'Novos lançamentos' }).click()
  await expect(cards(page)).toHaveCount(5)
  await expect(page).toHaveURL(/tab=new/)
  await page.getByRole('tab', { name: 'Novos lançamentos' }).press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Em alta' })).toBeFocused()
  await expect(page.getByRole('tab', { name: 'Em alta' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(cards(page)).toHaveCount(7)
  await expect(page).toHaveURL(/tab=trending/)
})

test('paginação mantém filtros e alterações reiniciam página', async ({
  page,
}) => {
  await page.goto('/marketplace?search=estudo&pageSize=3')
  await expect(cards(page)).toHaveCount(3)
  const first = await cards(page).first().textContent()
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(cards(page).first()).not.toHaveText(first!)
  await expect(page).toHaveURL(/search=estudo/)
  await page.getByRole('button', { name: 'Página 4', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Próxima página' }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Página anterior' }).click()
  await expect(page).toHaveURL(/page=3/)
  await page
    .getByRole('combobox', { name: 'Ordenar por' })
    .selectOption('price_asc')
  await expect(page).not.toHaveURL(/page=/)
  await expect(
    page.getByRole('button', { name: 'Página 1', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
})

test('Back e Forward restauram filtros e pesquisa', async ({ page }) => {
  await page.goto('/marketplace')
  await page.getByRole('searchbox').fill('emerald')
  await expect(cards(page)).toHaveCount(1)
  await page.getByRole('searchbox').fill('sage')
  await expect(cards(page).first()).toContainText('Sage Nomad')
  await page.goBack()
  await expect(page.getByRole('searchbox')).toHaveValue('emerald')
  await expect(cards(page).first()).toContainText('Emerald Ape')
  await page.goForward()
  await expect(page.getByRole('searchbox')).toHaveValue('sage')
  await expect(cards(page).first()).toContainText('Sage Nomad')
})

test('URL inválida é saneada e página excessiva é corrigida', async ({
  page,
}) => {
  await page.goto(
    '/marketplace?network=moon&category=invalid&minPrice=-2&maxPrice=no&sort=wrong&tab=invalid&page=-1&pageSize=0&unknown=yes',
  )
  await expect(cards(page)).toHaveCount(9)
  await expect(page).toHaveURL('/marketplace')
  await page.goto('/marketplace?page=999')
  await expect(cards(page)).toHaveCount(2)
  await expect(page).toHaveURL('/marketplace?page=3')
})

test('drawer mantém foco, fecha com Escape e não causa overflow', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Drawer exclusivo do mobile')
  await page.setViewportSize({ width: 414, height: 896 })
  await page.goto('/marketplace')
  const drawer = await filters(page, true)
  await expect(drawer).toBeVisible()
  await drawer.getByRole('radio', { name: 'Solana', exact: true }).check()
  await expect(
    drawer.getByRole('radio', { name: 'Solana', exact: true }),
  ).toBeFocused()
  await drawer.getByRole('button', { name: 'Ver resultados' }).focus()
  await page.keyboard.press('Tab')
  expect(
    await drawer.evaluate((dialog) => dialog.contains(document.activeElement)),
  ).toBe(true)
  await page.keyboard.press('Escape')
  await expect(drawer).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Abrir filtros' }),
  ).toBeFocused()
  await expect(cards(page)).toHaveCount(5)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('erro MSW não usa fallback e retry recupera', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('kurio:catalog-scenario', 'error'),
  )
  await page.goto('/marketplace')
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar os NFTs' }),
  ).toBeVisible()
  await expect(cards(page)).toHaveCount(0)
  await page.evaluate(() => localStorage.removeItem('kurio:catalog-scenario'))
  await page
    .getByRole('button', { name: 'Tentar novamente', exact: true })
    .click()
  await expect(cards(page)).toHaveCount(9)
})

test('loading e respostas fora de ordem não sobrescrevem a busca atual', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('kurio:catalog-scenario', 'out-of-order'),
  )
  await page.goto('/marketplace')
  await expect(cards(page)).toHaveCount(9)
  const slow = page.waitForRequest(
    (r) => new URL(r.url()).searchParams.get('search') === 'sage',
  )
  await page.getByRole('searchbox').fill('sage')
  await slow
  await expect(
    page.getByLabel('Carregando NFTs', { exact: true }),
  ).toBeVisible()
  await page.getByRole('searchbox').fill('emerald')
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first()).toContainText('Emerald Ape')
  // Observe the obsolete response passing its deterministic delay, not just the fast response.
  await expect(page.locator('#nft-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await page.waitForTimeout(1100)
  await expect(cards(page).first()).toContainText('Emerald Ape')
})

test('paginação lenta preserva os cards e informa atualização', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('kurio:catalog-scenario', 'slow'),
  )
  await page.goto('/marketplace')
  await expect(
    page.getByLabel('Carregando NFTs', { exact: true }),
  ).toBeVisible()
  await expect(cards(page)).toHaveCount(9)
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(
    page.getByText('Atualizando catálogo…', { exact: true }),
  ).toBeVisible()
  await expect(cards(page)).toHaveCount(9)
  await expect(cards(page).first()).toContainText('Emerald Ape')
  await expect(cards(page).first()).toContainText('Estudo de ritmo')
})

test('API rejeita filtros inválidos e ordena preços sem perda de precisão', async ({
  page,
}) => {
  await page.goto('/marketplace')
  await expect(cards(page)).toHaveCount(9)
  const statuses = await page.evaluate(async () => {
    const queries = [
      'network=invalid',
      'minPrice=-1',
      'minPrice=3&maxPrice=1',
      'minPrice=abc',
      'pageSize=100',
      'page=0',
      'sort=wrong',
      'tab=bad',
      'network=ethereum&network=solana',
    ]
    return Promise.all(
      queries.map((query) => fetch(`/api/nfts?${query}`).then((r) => r.status)),
    )
  })
  expect(statuses.every((status) => status === 400)).toBe(true)
  const result = await page.evaluate(async () =>
    fetch('/api/nfts?sort=price_asc&pageSize=36').then((r) => r.json()),
  )
  const units = (s: string) => {
    const [a, b = ''] = s.split('.')
    return BigInt(a) * 10n ** 18n + BigInt(b.padEnd(18, '0'))
  }
  const values = result.items.map((nft: { priceEth: string }) =>
    units(nft.priceEth),
  ) as bigint[]
  expect(
    values.every((value, index) => index === 0 || value >= values[index - 1]),
  ).toBe(true)
  const tied = result.items
    .filter((nft: { priceEth: string }) => nft.priceEth === '0.45')
    .map((nft: { id: string }) => nft.id)
  expect(tied).toEqual(['study-rhythm-02', 'study-stage-11'])
})
