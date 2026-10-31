import { chromium, devices } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
await mkdir('docs/screenshots/stage3', { recursive: true })
const browser = await chromium.launch()
for (const width of [414, 768, 1024, 1440]) {
  const context = await browser.newContext(width === 414 ? { ...devices['Pixel 7'], viewport: {width, height:896} } : { viewport:{width, height:900} })
  const page = await context.newPage()
  for (const route of ['/', '/marketplace']) {
    await page.goto(`http://127.0.0.1:4174${route}`)
    await page.getByTestId('nft-card').filter({ visible: true }).first().waitFor()
    await page.locator('#nft-results[aria-busy="false"]').waitFor()
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.images].filter(image => image.getBoundingClientRect().width > 0).map(image => { image.loading = 'eager'; return image.decode() }))
    })
    const name = route === '/' ? 'home' : 'marketplace'
    await page.screenshot({ path:`docs/screenshots/stage3/${name}-${width}.png`, scale:'css' })
    console.log(`${name} ${width}px: overflow=${await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)}`)
  }
  if (width === 414) {
    await page.getByRole('button', {name:'Abrir filtros'}).click()
    await page.screenshot({path:'docs/screenshots/stage3/filters-414.png', scale:'css'})
  }
  await context.close()
}
await browser.close()
