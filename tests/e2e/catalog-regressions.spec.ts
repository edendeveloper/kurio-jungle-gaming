import { expect, test } from '@playwright/test'

for (const route of ['/', '/marketplace']) {
  const name = route === '/' ? 'Home' : 'Marketplace'
  test(`${name}: busca mantém input, foco e edição depois do debounce`, async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem('kurio:catalog-scenario', 'slow'),
    )
    await page.goto(route)
    const cards = page.getByTestId('nft-card').filter({ visible: true })
    await expect(cards).toHaveCount(9)
    const input = page.getByRole('searchbox')
    const originalInput = await input.elementHandle()
    const expectSearch = async (value: string | null) => {
      await expect
        .poll(() => new URL(page.url()).searchParams.get('search'))
        .toBe(value)
      await expect(input).toBeFocused()
      expect(
        await originalInput!.evaluate((element) => element.isConnected),
      ).toBe(true)
    }

    await input.fill('Emerald')
    await expectSearch('Emerald')
    await expect(cards).toHaveCount(1)
    await expect(input).toBeFocused()
    await input.click()
    await input.press('End')
    await input.pressSequentially(' Ape')
    await expectSearch('Emerald Ape')
    await expect(page.locator('#nft-results')).toHaveAttribute(
      'aria-busy',
      'true',
    )
    await input.press('Backspace')
    await expect(input).toHaveValue('Emerald Ap')
    await expectSearch('Emerald Ap')

    await input.press('Home')
    for (let index = 0; index < 7; index++)
      await input.press('Shift+ArrowRight')
    await page.keyboard.insertText('Sage')
    await expect(input).toHaveValue('Sage Ap')
    await expectSearch('Sage Ap')

    await input.press('ControlOrMeta+A')
    await input.pressSequentially('Sage')
    await expectSearch('Sage')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('Sage Nomad')
    await input.press('ControlOrMeta+A')
    await input.press('Backspace')
    await expectSearch(null)
    await expect(input).toHaveValue('')
    await expect(cards).toHaveCount(9)

    await input.pressSequentially('Golden')
    await expectSearch('Golden')
    await expect(cards).toHaveCount(2)
    await page.getByRole('button', { name: 'Limpar pesquisa' }).click()
    await expect(input).toHaveValue('')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('search'))
      .toBe(null)
    await input.click()
    await input.pressSequentially('Emerald')
    await expectSearch('Emerald')
    await page.reload()
    await expect(input).toHaveValue('Emerald')
    await expect(cards).toHaveCount(1)
    await input.click()
    await input.press('End')
    await input.pressSequentially(' Ape')
    await expect(input).toBeFocused()
    await expect
      .poll(() => new URL(page.url()).searchParams.get('search'))
      .toBe('Emerald Ape')
    await input.press('Tab')
    await expect(
      page.getByRole('button', { name: 'Limpar pesquisa' }),
    ).toBeFocused()
  })

  test(`${name}: cards sem superfície externa preservam recorte e proporção`, async ({
    page,
    isMobile,
  }) => {
    await page.setViewportSize({
      width: isMobile ? 414 : 1440,
      height: isMobile ? 896 : 900,
    })
    await page.goto(route)
    const cards = page.getByTestId('nft-card').filter({ visible: true })
    await expect(cards).toHaveCount(9)
    const surfaces = await cards.evaluateAll((elements) =>
      elements.flatMap((card) =>
        [
          card,
          card.querySelector('.nft-card-art')!,
          card.querySelector('.nft-art-link')!,
        ].map((element) => {
          const style = getComputedStyle(element)
          return {
            background: style.backgroundColor,
            image: style.backgroundImage,
          }
        }),
      ),
    )
    for (const surface of surfaces) {
      expect(surface.background).toBe('rgba(0, 0, 0, 0)')
      expect(surface.image).toBe('none')
    }
    const image = cards.first().locator('.nft-art-link img')
    await expect(image).toHaveCSS('object-fit', 'cover')
    await expect(image).toHaveCSS('border-radius', isMobile ? '16px' : '15px')
    const imageBox = (await image.boundingBox())!
    expect(Math.abs(imageBox.width - imageBox.height)).toBeLessThan(1)
    const area = (await cards.first().locator('.nft-card-art').boundingBox())!
    expect(area.width / area.height).toBeCloseTo(
      isMobile ? 175 / 200 : 258 / 300,
      2,
    )
    await expect(page.locator('.filters-panel').first()).toHaveCSS(
      'background-color',
      'rgb(36, 22, 18)',
    )
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
    const file = route === '/' ? 'home' : 'marketplace'
    await page.screenshot({
      path: `docs/screenshots/stage3-fixes/${file}-${isMobile ? 414 : 1440}.png`,
      scale: 'css',
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}
