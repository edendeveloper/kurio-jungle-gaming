import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve('docs')
const output = path.join(root, 'screenshots/stage8/diffs')
const screens = [
  ['home-desktop', 'design/references/desktop/home.png', 'screenshots/stage8/after/home-desktop.png'],
  ['home-mobile', 'design/references/mobile/home.png', 'screenshots/stage8/after/home-mobile.png'],
  ['nft-details-desktop', 'design/references/desktop/nft-details.png', 'screenshots/stage8/after/nft-details-desktop.png'],
  ['nft-details-mobile', 'design/references/mobile/nft-details.png', 'screenshots/stage8/after/nft-details-mobile.png'],
  ['cart-desktop', 'design/references/desktop/cart.png', 'screenshots/stage8/after/cart-desktop.png'],
  ['cart-mobile', 'design/references/mobile/cart.png', 'screenshots/stage8/after/cart-mobile.png'],
  ['checkout-desktop', 'design/references/desktop/checkout.png', 'screenshots/stage8/after/checkout-desktop.png'],
  ['checkout-mobile', 'design/references/mobile/checkout.png', 'screenshots/stage8/after/checkout-mobile.png'],
  ['confirmation-desktop', 'design/references/desktop/order-success.png', 'screenshots/stage8/after/confirmation-desktop.png'],
  ['login-desktop', 'design/references/desktop/login.png', 'screenshots/stage8/after/login-desktop.png'],
  ['login-mobile', 'design/references/mobile/login.png', 'screenshots/stage8/after/login-mobile.png'],
  ['register-desktop', 'design/references/desktop/register.png', 'screenshots/stage8/after/register-desktop.png'],
  ['register-mobile', 'design/references/mobile/register.png', 'screenshots/stage8/after/register-mobile.png'],
  ['profile-desktop', 'design/references/desktop/pprfile.png', 'screenshots/stage8/after/profile-desktop.png'],
  ['wallets-desktop', 'design/references/desktop/wallets.png', 'screenshots/stage8/after/wallets-desktop.png'],
]

await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const metrics = []
for (const [name, referencePath, implementationPath] of screens) {
  const [reference, implementation] = await Promise.all([
    readFile(path.join(root, referencePath)),
    readFile(path.join(root, implementationPath)),
  ])
  const result = await page.evaluate(async ({ reference, implementation }) => {
    const load = (source) => new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = `data:image/png;base64,${source}`
    })
    const [left, right] = await Promise.all([load(reference), load(implementation)])
    const width = Math.min(left.width, right.width)
    const height = Math.min(left.height, right.height)
    const leftCanvas = document.createElement('canvas')
    const rightCanvas = document.createElement('canvas')
    for (const canvas of [leftCanvas, rightCanvas]) {
      canvas.width = width
      canvas.height = height
    }
    leftCanvas.getContext('2d').drawImage(left, 0, 0, width, height, 0, 0, width, height)
    rightCanvas.getContext('2d').drawImage(right, 0, 0, width, height, 0, 0, width, height)
    const a = leftCanvas.getContext('2d').getImageData(0, 0, width, height).data
    const b = rightCanvas.getContext('2d').getImageData(0, 0, width, height).data
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    const diff = context.createImageData(width, height)
    let changed = 0
    for (let index = 0; index < a.length; index += 4) {
      const delta = Math.max(Math.abs(a[index] - b[index]), Math.abs(a[index + 1] - b[index + 1]), Math.abs(a[index + 2] - b[index + 2]))
      if (delta > 28) {
        diff.data[index] = 255
        diff.data[index + 1] = 35
        diff.data[index + 2] = 170
        diff.data[index + 3] = 230
        changed++
      } else {
        const shade = Math.round((a[index] + a[index + 1] + a[index + 2]) / 9)
        diff.data[index] = shade
        diff.data[index + 1] = shade
        diff.data[index + 2] = shade
        diff.data[index + 3] = 150
      }
    }
    context.putImageData(diff, 0, 0)
    return {
      width,
      height,
      referenceWidth: left.width,
      referenceHeight: left.height,
      implementationWidth: right.width,
      implementationHeight: right.height,
      changedPixels: changed,
      comparedPixels: width * height,
      diff: canvas.toDataURL('image/png').split(',')[1],
    }
  }, {
    reference: reference.toString('base64'),
    implementation: implementation.toString('base64'),
  })
  const { diff, ...summary } = result
  await writeFile(path.join(output, `${name}.png`), Buffer.from(diff, 'base64'))
  metrics.push({ name, ...summary, changedRatio: summary.changedPixels / summary.comparedPixels })
}
await writeFile(path.join(output, 'metrics.json'), JSON.stringify(metrics, null, 2))
await browser.close()
console.log(`Generated ${screens.length} reference diffs in ${output}`)
