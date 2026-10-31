import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const directory = path.resolve('public/assets/nfts')
const filenames = [
  'emerald-ape.png',
  'golden-beat.png',
  'neon-vessel.png',
  'sage-nomad.png',
]
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const results = []
  for (const filename of filenames) {
    const inputPath = path.join(directory, filename)
    const input = await readFile(inputPath)
    const variants = await page.evaluate(async (base64) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const encode = async (width) => {
        const scale = width ? width / image.naturalWidth : 1
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.naturalWidth * scale)
        canvas.height = Math.round(image.naturalHeight * scale)
        canvas.getContext('2d', { alpha: true })?.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height,
        )
        const blob = await new Promise((resolve, reject) =>
          canvas.toBlob(
            (result) =>
              result ? resolve(result) : reject(new Error('WebP encoding failed')),
            'image/webp',
            0.96,
          ),
        )
        const bytes = new Uint8Array(await blob.arrayBuffer())
        let binary = ''
        for (let index = 0; index < bytes.length; index += 8192)
          binary += String.fromCharCode(...bytes.subarray(index, index + 8192))
        return { width: canvas.width, base64: btoa(binary) }
      }
      return await Promise.all([undefined, 256, 512, 768].map(encode))
    }, input.toString('base64'))
    for (const variant of variants) {
      const suffix = variant.width === 1254 ? '' : `-${variant.width}`
      const outputPath = inputPath.replace(/\.png$/, `${suffix}.webp`)
      const output = Buffer.from(variant.base64, 'base64')
      await writeFile(outputPath, output)
      results.push({
        original: filename,
        originalBytes: (await stat(inputPath)).size,
        optimized: path.basename(outputPath),
        dimensions: `${variant.width}x${variant.width}`,
        optimizedBytes: output.length,
      })
    }
  }
  console.log(JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}
