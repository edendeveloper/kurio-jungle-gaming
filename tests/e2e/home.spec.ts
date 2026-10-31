import { expect, test } from '@playwright/test'

test('Home mostra o catálogo e preserva a navegação real', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Início', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Diário da Cunhagem', exact: true }),
  ).toBeVisible()
  const cards = page.getByTestId('nft-card').filter({ visible: true })
  await expect(cards).toHaveCount(9)
  await expect(cards.first()).toContainText('Emerald Ape #042')
  await expect(cards.first()).toContainText('1.19 ETH')
  await cards
    .first()
    .getByRole('link', { name: 'Ver Emerald Ape #042', exact: true })
    .click()
  await expect(page).toHaveURL('/nft/emerald-ape-042')
  await page.goBack()
  await expect(
    page.getByRole('heading', { name: 'Início', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: /^(Mercado|Marketplace)$/ }).click()
  await expect(page).toHaveURL('/marketplace')
  await expect(
    page.getByRole('heading', { name: 'Marketplace', exact: true }),
  ).toBeVisible()
})

test('ações futuras são explícitas e não simulam sucesso', async ({
  page,
  isMobile,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('tab', { name: 'Novos lançamentos' }),
  ).not.toHaveAttribute('aria-disabled', 'true')
  if (isMobile) {
    await expect(page.getByRole('searchbox')).not.toHaveAttribute(
      'readonly',
      '',
    )
    await expect(
      page.getByRole('button', { name: 'Abrir filtros', exact: true }),
    ).not.toHaveAttribute('aria-disabled', 'true')
  } else {
    await expect(
      page.getByRole('link', { name: 'Entrar', exact: true }),
    ).toHaveAttribute('href', /login/)
    await expect(
      page.getByRole('link', { name: 'Carrinho, 0 itens' }),
    ).toBeVisible()
  }
  await expect(
    page.getByText('Inscrições em breve.', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Enviar', exact: true }),
  ).toHaveAttribute('aria-disabled', 'true')
})

test('link de pular conteúdo funciona por teclado', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Início', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Pular para o conteúdo' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).not.toHaveCount(0)
  await expect(focused).toHaveCSS('outline-style', 'solid')
})

test('navegação mobile permanece acessível ao rolar', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Navegação específica do mobile')
  await page.goto('/')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  const navigation = page.getByRole('navigation', { name: 'Navegação mobile' })
  await expect(navigation).toBeInViewport()
  await navigation.getByRole('link', { name: 'Carrinho', exact: true }).click()
  await expect(page).toHaveURL('/cart')
  await navigation.getByRole('link', { name: 'Perfil', exact: true }).click()
  await expect(page).toHaveURL(/\/login.*returnTo/)
})

for (const width of [414, 768, 1024, 1440]) {
  test(`Home responsiva em ${width}px, imagens locais e sem overflow`, async ({
    page,
  }, testInfo) => {
    const height = width === 414 ? 896 : 900
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    const cards = page.getByTestId('nft-card').filter({ visible: true })
    await expect(cards).toHaveCount(9)
    await page.evaluate(async () => {
      const images = [...document.images].filter(
        (image) => image.getBoundingClientRect().width > 0,
      )
      await Promise.all(
        images.map((image) => {
          image.loading = 'eager'
          return image.decode()
        }),
      )
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    expect(
      await page
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              new URL(image.getAttribute('src') ?? '', window.location.href)
                .origin === window.location.origin,
          ),
        ),
    ).toBe(true)
    const firstImage = cards.first().locator('.nft-art-link img')
    await expect(firstImage).toHaveCSS('object-fit', 'cover')
    const imageBox = await firstImage.boundingBox()
    expect(imageBox).not.toBeNull()
    expect(Math.abs(imageBox!.width - imageBox!.height)).toBeLessThan(1)
    if (
      (width === 1440 && testInfo.project.name === 'chromium-desktop') ||
      (width === 414 && testInfo.project.name === 'chromium-mobile')
    ) {
      await page.screenshot({
        path: `test-results/screenshots/home-${width}x${height}.png`,
        fullPage: false,
        scale: 'css',
      })
      await page.screenshot({
        path: `test-results/screenshots/home-${width}-full.png`,
        fullPage: true,
        scale: 'css',
      })
    }
  })
}
