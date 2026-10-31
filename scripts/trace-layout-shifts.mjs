import { chromium } from 'playwright'

const target = process.argv[2] ?? 'http://127.0.0.1:4398/nft/emerald-ape-042'
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 1.75 })
  await page.addInitScript(() => {
    window.__layoutShifts = []
    window.__layoutSnapshots = []
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue
        window.__layoutShifts.push({
          time: entry.startTime,
          score: entry.value,
          sources: entry.sources?.map((source) => ({
            selector: source.node instanceof Element ? `${source.node.tagName.toLowerCase()}${source.node.id ? `#${source.node.id}` : ''}.${[...source.node.classList].join('.')}` : null,
            previous: source.previousRect,
            current: source.currentRect,
          })),
        })
      }
    }).observe({ type: 'layout-shift', buffered: true })
    const timer = setInterval(() => {
      const footer = document.querySelector('.desktop-footer')
      const main = document.querySelector('#main')
      const rect = footer?.getBoundingClientRect()
      window.__layoutSnapshots.push({
        time: performance.now(), path: location.pathname,
        shell: document.querySelector('.app-shell')?.className,
        mainHeight: main?.getBoundingClientRect().height,
        mainChild: main?.firstElementChild?.className,
        childMinHeight: main?.firstElementChild ? getComputedStyle(main.firstElementChild).minHeight : null,
        footerDisplay: footer ? getComputedStyle(footer).display : null,
        footerTop: rect?.top, footerHeight: rect?.height,
        scrollY: window.scrollY,
      })
      if (performance.now() > 4000) clearInterval(timer)
    }, 50)
  })
  await page.goto(target, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8000)
  console.log(JSON.stringify(await page.evaluate(() => ({
    shifts: window.__layoutShifts,
    snapshots: window.__layoutSnapshots.filter((item, index, all) => {
      const previous = all[index - 1]
      return !previous || item.mainHeight !== previous.mainHeight || item.footerTop !== previous.footerTop || item.footerDisplay !== previous.footerDisplay
    }),
    dimensions: {
      main: document.querySelector('#main')?.getBoundingClientRect().height,
      footer: document.querySelector('.desktop-footer')?.getBoundingClientRect().top,
      footerHeight: document.querySelector('.desktop-footer')?.getBoundingClientRect().height,
    },
  })), null, 2))
} finally {
  await browser.close()
}
