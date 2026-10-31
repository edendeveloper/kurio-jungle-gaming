import { apiLogin, luna } from './helpers/auth.ts'
import { expect, test } from '@playwright/test'

const nftPath = '/nft/emerald-ape-042'

test('abre pelo catálogo e mantém identidade após refresh', async ({
  page,
}) => {
  await page.goto('/marketplace')
  await page
    .getByRole('link', { name: 'Ver Emerald Ape #042', exact: true })
    .click()
  await expect(page).toHaveURL(nftPath)
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('ID do token:', { exact: true })).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
  ).toBeVisible()
})

test('galeria altera a arte, mantém proporção e permite ampliação com teclado', async ({
  page,
}) => {
  await page.goto(nftPath)
  const gallery = page.getByRole('region', { name: 'Galeria de imagens' })
  const image = gallery.locator('.nft-main-image img')
  await expect(image).toHaveAttribute('src', '/assets/nfts/emerald-ape.webp')
  const thumbnail = gallery.getByRole('button', { name: /^Ver imagem 2:/ })
  await thumbnail.click()
  await expect(thumbnail).toHaveAttribute('aria-pressed', 'true')
  await expect(image).toHaveAttribute('src', '/assets/nfts/sage-nomad.webp')
  const box = (await image.boundingBox())!
  expect(Math.abs(box.width - box.height)).toBeLessThan(1)
  await page
    .getByRole('button', { name: 'Abrir imagem ampliada', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Imagem ampliada de Emerald Ape #042',
  })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(
    dialog.getByRole('button', { name: 'Fechar imagem ampliada' }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Abrir imagem ampliada', exact: true }),
  ).toBeFocused()
})

test('quantidade respeita mínimo, máximo e total decimal', async ({ page }) => {
  await page.goto(nftPath)
  const down = page.getByRole('button', { name: 'Diminuir quantidade' })
  const up = page.getByRole('button', { name: 'Aumentar quantidade' })
  await expect(down).toBeDisabled()
  await expect(page.getByLabel('Quantidade selecionada')).toHaveText('1')
  for (let index = 0; index < 4; index++) await up.click()
  await expect(page.getByLabel('Quantidade selecionada')).toHaveText('5')
  await expect(up).toBeDisabled()
  await expect(page.locator('.nft-selection-total')).toContainText('5.95 ETH')
  await down.click()
  await expect(page.getByLabel('Quantidade selecionada')).toHaveText('4')
  await expect(page.locator('.nft-selection-total')).toContainText('4.76 ETH')
})

test('preço e disponibilidade atualizados limitam quantidade e invalidam o catálogo', async ({
  page,
}) => {
  await page.goto('/marketplace')
  await page
    .getByRole('link', { name: 'Ver Emerald Ape #042', exact: true })
    .click()
  for (let index = 0; index < 4; index++)
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.evaluate(() =>
    localStorage.setItem('kurio:nft-scenario', 'changed'),
  )
  await page
    .getByRole('button', { name: 'Atualizar dados', exact: true })
    .click()
  await expect(page.getByText('2 disponíveis', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Quantidade selecionada')).toHaveText('2')
  await expect(
    page.getByRole('button', { name: 'Aumentar quantidade' }),
  ).toBeDisabled()
  await expect(page.locator('.nft-selection-total')).toContainText('2.98 ETH')
  await page.goBack()
  await expect(
    page.getByTestId('nft-card').filter({ visible: true }).first(),
  ).toContainText('1.49 ETH')
})

test('esgotado impede compra e incremento sem gerar quantidade zero', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('kurio:nft-scenario', 'sold-out'),
  )
  await page.goto(nftPath)
  await expect(page.getByText('Esgotado', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Indisponível', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Aumentar quantidade' }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Diminuir quantidade' }),
  ).toBeDisabled()
  await expect(page.getByLabel('Quantidade selecionada')).toHaveText('1')
})

test('favorito exige sessão, API rejeita visitante', async ({ page }) => {
  await page.goto(nftPath)
  await page.getByRole('button', { name: 'Favoritar NFT', exact: true }).click()
  await expect(page).toHaveURL(/\/login/)
  const status = await page.evaluate(
    async () =>
      (
        await fetch('/api/favorites/emerald-ape-042', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ favorite: true }),
        })
      ).status,
  )
  expect(status).toBe(401)
})

test('favoritar alterna, persiste após reload e desfaz em falha', async ({
  page,
}) => {
  await page.goto('/login')
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
  await apiLogin(page)
  await page.goto(nftPath)
  await page.getByRole('button', { name: 'Favoritar NFT', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos' }),
  ).toBeEnabled()
  await page.reload()
  const selected = page.getByRole('button', { name: 'Remover dos favoritos' })
  await expect(selected).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() =>
    localStorage.setItem('kurio:favorite-scenario', 'error'),
  )
  await selected.click()
  await expect(
    page.getByText(/Seu favorito anterior foi preservado/),
  ).toBeVisible()
  await expect(selected).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => localStorage.removeItem('kurio:favorite-scenario'))
  await selected.click()
  await expect(
    page.getByRole('button', { name: 'Favoritar NFT', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false')
})

test('favoritos ficam isolados por usuário na API', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
  await apiLogin(page)
  await page.goto(nftPath)
  await page.getByRole('button', { name: 'Favoritar NFT', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos' }),
  ).toBeEnabled()
  await apiLogin(page, luna)
  const other = await page.evaluate(async () =>
    (await fetch('/api/favorites')).json(),
  )
  expect(other.nftIds).toEqual([])
})

test('abas mostram avaliações consistentes e vazio para NFT sem avaliações', async ({
  page,
}) => {
  await page.goto(nftPath)
  await page
    .getByRole('tab', { name: 'Avaliações de colecionadores (19)' })
    .click()
  await expect(page.locator('.nft-reviews article')).toHaveCount(19)
  await expect(page.locator('.nft-reviews')).toContainText('média 4.8/5')
  await page
    .getByRole('tab', { name: 'Avaliações de colecionadores (19)' })
    .press('Home')
  await expect(
    page.getByRole('tab', { name: 'Detalhes do NFT' }),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.nft-description')).toContainText(
    'Contrato de demonstração',
  )
  await page.goto('/nft/sage-nomad-009')
  await page
    .getByRole('tab', { name: 'Avaliações de colecionadores (0)' })
    .click()
  await expect(
    page.getByText('Ainda não há avaliações para este NFT.'),
  ).toBeVisible()
})

test('relacionados são da coleção, excluem o atual e permitem navegação', async ({
  page,
}) => {
  await page.goto(nftPath)
  const related = page.getByRole('region', { name: 'Mais desta coleção' })
  await expect(related.getByTestId('nft-card')).toHaveCount(5)
  await expect(
    related.getByRole('link', { name: 'Ver Emerald Ape #042', exact: true }),
  ).toHaveCount(0)
  await related
    .getByRole('link', { name: 'Ver Cosmic Bloom #118', exact: true })
    .click()
  await expect(page).toHaveURL('/nft/cosmic-bloom-118')
  await expect(
    page.getByRole('heading', { name: 'Cosmic Bloom #118', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Quantidade selecionada')).toHaveText('1')
})

test('comprar adiciona a quantidade na API e abre carrinho mínimo persistente', async ({
  page,
}) => {
  await page.goto(nftPath)
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/api/cart/items' &&
      r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Comprar NFT', exact: true }).click()
  const result = await response
  expect(result.fromServiceWorker()).toBe(true)
  expect(result.status()).toBe(201)
  const data = await result.json()
  expect(data.items[0]).toMatchObject({
    nftId: 'emerald-ape-042',
    edition: 1,
    quantity: 3,
  })
  await expect(page).toHaveURL('/cart')
  await expect(
    page.getByRole('heading', { name: 'Carrinho', exact: true }),
  ).toBeVisible()
  await expect(page.getByText(/Quantidade: 3/)).toBeVisible()
  await page.reload()
  await expect(page.getByText(/Quantidade: 3/)).toBeVisible()
})

test('falha na compra não navega nem adiciona e estoque é revalidado', async ({
  page,
}) => {
  await page.goto(nftPath)
  for (let index = 0; index < 4; index++)
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.evaluate(() =>
    localStorage.setItem('kurio:nft-scenario', 'changed'),
  )
  await page.getByRole('button', { name: 'Comprar NFT', exact: true }).click()
  await expect(
    page.getByText('A quantidade solicitada excede a disponibilidade atual.'),
  ).toBeVisible()
  await expect(page).toHaveURL(nftPath)
  await expect(page.getByLabel('Quantidade selecionada')).toHaveText('2')
  expect(
    await page.evaluate(async () => (await fetch('/api/cart')).json()),
  ).toMatchObject({ items: [], totals: { totalEth: '0' } })
})

test('404, loading e retry são estados reais da API', async ({ page }) => {
  await page.goto('/nft/inexistente')
  await expect(
    page.getByRole('heading', { name: 'NFT não encontrado' }),
  ).toBeVisible()
  await page.evaluate(() => localStorage.setItem('kurio:nft-scenario', 'error'))
  await page.goto(nftPath)
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar este NFT' }),
  ).toBeVisible()
  await page.evaluate(() => localStorage.setItem('kurio:nft-scenario', 'slow'))
  await page
    .getByRole('button', { name: 'Tentar novamente', exact: true })
    .click()
  await expect(page.getByLabel('Carregando detalhes do NFT')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
  ).toBeVisible()
})

for (const width of [414, 768, 1024, 1440]) {
  test(`detalhes sem overflow em ${width}px e captura de referência`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 414 ? 896 : 900 })
    await page.goto(nftPath)
    await expect(
      page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('region', { name: 'Mais desta coleção' })
        .getByTestId('nft-card'),
    ).toHaveCount(5)
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all(
        [...document.images]
          .filter((image) => image.getBoundingClientRect().width > 0)
          .map((image) => {
            image.loading = 'eager'
            return image.decode()
          }),
      )
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await expect(page.locator('.nft-main-image')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    )
    if (width === 414) {
      // Playwright boundingBox coordinates are relative to the viewport. The
      // realtime live region must stay out of normal flow above the app shell.
      const shell = (await page.locator('.app-shell').boundingBox())!
      const gallery = (await page.locator('.nft-gallery').boundingBox())!
      expect(shell.y).toBe(0)
      expect(gallery.x).toBe(0)
      expect(gallery.y).toBe(0)
      expect(gallery.width).toBe(414)
      const sheet = (await page.locator('.nft-summary').boundingBox())!
      expect(sheet.x).toBe(0)
      expect(sheet.y).toBe(392)
    }
    if (
      (width === 414 && testInfo.project.name === 'chromium-mobile') ||
      (width === 1440 && testInfo.project.name === 'chromium-desktop')
    ) {
      await page.screenshot({
        path: `docs/screenshots/stage4/nft-${width}.png`,
        scale: 'css',
      })
      await page.screenshot({
        path: `docs/screenshots/stage4/nft-${width}-full.png`,
        scale: 'css',
        fullPage: true,
      })
    }
  })
}
