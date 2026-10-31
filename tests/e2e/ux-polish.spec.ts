import { mkdir } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { apiLogin, apiRequest, nova } from './helpers/auth.ts'
import type { CartResponse } from '../../src/types/collector.ts'

const output = 'docs/screenshots/ux-polish'
const emerald = 'emerald-ape-042'

async function capture(page: Page, name: string) {
  await mkdir(output, { recursive: true })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images).filter((image) => image.complete).map((image) =>
        image.decode().catch(() => undefined),
      ),
    )
    window.scrollTo(0, 0)
  })
  await page.screenshot({
    path: `${output}/${name}.png`,
    fullPage: true,
    scale: 'css',
  })
}

test('destaque usa dados do NFT e abre a página correspondente', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.includes('mobile')
  await page.setViewportSize(
    mobile ? { width: 414, height: 896 } : { width: 1440, height: 900 },
  )
  await page.goto('/')
  const featured = page.locator('.featured-banner')
  await expect(page.getByRole('heading', { name: 'Início', exact: true })).toBeVisible()
  if (!mobile) {
    await expect(featured.getByRole('heading', { name: /NFT EM DESTAQUE/ })).toBeVisible()
    await expect(featured).toContainText('Sage Nomad #009')
    await expect(featured).toContainText('1.69 ETH')
    await expect(featured.getByText(/oferta limitada/i)).toHaveCount(0)
  }
  await capture(page, `home-${mobile ? 'mobile' : 'desktop'}`)
  if (!mobile) {
    await featured.getByRole('link', { name: 'Ver NFT' }).click()
    await expect(page).toHaveURL('/nft/sage-nomad-009')
  }
})

test('adicionar ao carrinho mantém detalhes e permite seguir para o carrinho', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.includes('mobile')
  await page.setViewportSize(
    mobile ? { width: 414, height: 896 } : { width: 1440, height: 900 },
  )
  await page.goto(`/nft/${emerald}`)
  await page
    .getByRole('button', { name: 'Aumentar quantidade', exact: true })
    .click()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page).toHaveURL(`/nft/${emerald}`)
  const notice = page.locator('.nft-cart-notice')
  await expect(notice).toContainText('2 itens adicionados')
  await expect(notice.getByRole('link', { name: 'Ver carrinho' })).toBeVisible()
  if (!mobile)
    await expect(page.getByRole('link', { name: 'Carrinho, 2 itens' })).toBeVisible()
  await capture(page, `details-${mobile ? 'mobile' : 'desktop'}`)
  await notice.getByRole('link', { name: 'Ver carrinho' }).click()
  await expect(page).toHaveURL('/cart')
  await expect(page.getByText('Quantidade: 2', { exact: true })).toBeVisible()
  const cart = await apiRequest(page, '/cart')
  expect((cart.data as CartResponse).items[0].quantity).toBe(2)
})

test('lista de interesse persiste, sincroniza coração e remove NFT', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.includes('mobile')
  await page.setViewportSize(
    mobile ? { width: 414, height: 896 } : { width: 1440, height: 900 },
  )
  await page.goto('/')
  await page.locator('#main').waitFor({ state: 'attached' })
  await apiLogin(page, nova)
  const favorite = await apiRequest(
    page,
    `/favorites/${'sage-nomad-009'}`,
    'PUT',
    { favorite: true },
  )
  expect(favorite.status).toBe(200)
  await page.goto('/profile/favorites')
  const card = page.getByTestId('nft-card')
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('Sage Nomad')
  await expect(
    card.getByRole('button', {
      name: 'Remover Sage Nomad #009 da lista de interesse',
    }),
  ).toHaveAttribute('aria-pressed', 'true')
  await capture(page, `favorites-${mobile ? 'mobile' : 'desktop'}`)
  await page
    .getByRole('button', {
      name: 'Remover Sage Nomad #009 da lista de interesse',
    })
    .click()
  await expect(page.getByRole('heading', { name: 'Sua lista de interesse está vazia.' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sua lista de interesse está vazia.' })).toBeVisible()
})

test('visitante solicita login ao abrir Lista de interesse na navegação mobile', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Fluxo específico da navegação mobile')
  await page.setViewportSize({ width: 414, height: 896 })
  await page.goto('/')
  await page
    .getByRole('navigation', { name: 'Navegação mobile' })
    .getByRole('link', { name: 'Lista de interesse' })
    .click()
  await expect(page).toHaveURL(/login\?.*returnTo=%2Fprofile%2Ffavorites/)
})
