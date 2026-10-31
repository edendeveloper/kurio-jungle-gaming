import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { Launcher } from 'chrome-launcher'
import { chromium } from 'playwright'

const phase = process.argv[2] ?? 'baseline'
if (!['baseline', 'final', 'diagnostic'].includes(phase)) {
  throw new Error('Use: node scripts/lighthouse-audit.mjs [baseline|final|diagnostic]')
}

const date = new Date().toISOString().slice(0, 10)
const reportDir = path.resolve('docs/reports/lighthouse', date, phase)
const tempDir = path.resolve('.tmp-lighthouse')
await Promise.all([mkdir(reportDir, { recursive: true }), mkdir(tempDir, { recursive: true })])

async function getFreePort() {
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Could not get a free port')
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  return address.port
}

const port = await getFreePort()
const baseUrl = `http://127.0.0.1:${port}`
const viteCli = path.resolve('node_modules/vite/bin/vite.js')
const preview = spawn(
  process.execPath,
  [viteCli, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: process.cwd(), windowsHide: true, stdio: 'ignore' },
)

async function stopPreview() {
  if (preview.exitCode !== null) return
  preview.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => preview.once('exit', resolve)),
    delay(5000),
  ])
}

async function startChrome(chromePath, label) {
  const port = await getFreePort()
  const userDataDir = path.join(tempDir, `profile-${label}-${process.pid}`)
  await rm(userDataDir, { recursive: true, force: true })
  await mkdir(userDataDir, { recursive: true })
  const chrome = spawn(
    chromePath,
    [
      ...Launcher.defaultFlags(),
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--headless=new',
      '--no-sandbox',
      '--remote-allow-origins=*',
      'about:blank',
    ],
    { windowsHide: true, stdio: 'ignore' },
  )
  let debuggerInfo
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (chrome.exitCode !== null) throw new Error(`Chromium exited with ${chrome.exitCode} (${label})`)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) {
        debuggerInfo = await response.json()
        break
      }
    } catch {
      // Chrome has not opened the DevTools endpoint yet.
    }
    await delay(250)
  }
  if (!debuggerInfo?.webSocketDebuggerUrl) {
    chrome.kill()
    throw new Error(`Chromium DevTools did not start (${label})`)
  }
  return { chrome, port, userDataDir, debuggerInfo }
}

async function closeChrome(browser) {
  if (!browser) return
  try {
    const socket = new WebSocket(browser.debuggerInfo.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', reject, { once: true })
    })
    await Promise.race([
      new Promise((resolve) => socket.addEventListener('close', resolve, { once: true })),
      delay(1500),
    ]).then(() => {
      if (socket.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ id: 1, method: 'Browser.close' }))
      socket.close()
    })
  } catch {
    // The browser may already be closing after Browser.close.
  }
  await Promise.race([
    new Promise((resolve) => browser.chrome.once('exit', resolve)),
    delay(5000),
  ])
  if (browser.chrome.exitCode === null) browser.chrome.kill()
  await rm(browser.userDataDir, { recursive: true, force: true }).catch(() => undefined)
}

try {
  let browserVersion = 'unknown'
  let ready = false
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (preview.exitCode !== null) throw new Error(`Vite preview exited with ${preview.exitCode}`)
    try {
      const response = await fetch(baseUrl)
      if (response.ok) {
        ready = true
        break
      }
    } catch {
      // The preview has not bound its port yet.
    }
    await delay(500)
  }
  if (!ready) throw new Error(`Vite preview did not start on ${baseUrl}`)

  const browser = await chromium.launch({ headless: true })
  try {
    browserVersion = browser.version()
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const consoleErrors = []
    const pageErrors = []
    const badResponses = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('response', (response) => {
      if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`)
    })
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    const healthResponse = await page.evaluate(async () => {
      const response = await fetch('/api/health')
      return { status: response.status, contentType: response.headers.get('content-type') }
    })
    if (healthResponse.status !== 200 || !healthResponse.contentType?.includes('application/json')) {
      throw new Error(`MSW health preflight failed: ${JSON.stringify(healthResponse)}`)
    }
    await page.getByTestId('socket-status').waitFor({ state: 'attached', timeout: 15000 })
    await page.getByTestId('socket-status').filter({ hasText: 'event-received' }).waitFor({ timeout: 15000 })
    const publicAssets = await page.evaluate(async () => {
      const [favicon, robots] = await Promise.all([
        fetch('/favicon.svg'),
        fetch('/robots.txt'),
      ])
      return {
        favicon: { status: favicon.status, contentType: favicon.headers.get('content-type') },
        robots: { status: robots.status, contentType: robots.headers.get('content-type'), body: await robots.text() },
      }
    })
    if (publicAssets.favicon.status !== 200 || publicAssets.robots.status !== 200 || !publicAssets.robots.body.startsWith('User-agent:')) {
      throw new Error(`SEO assets failed: ${JSON.stringify(publicAssets)}`)
    }
    await page.goto(`${baseUrl}/nft/emerald-ape-042`, { waitUntil: 'networkidle' })
    const preflight = await page.evaluate(async () => {
      await document.fonts.ready
      const mainImage = [...document.images].find((image) => image.alt && image.naturalWidth > 0)
      return {
        title: document.title,
        language: document.documentElement.lang,
        fontReady: document.fonts.check('400 16px "Roboto Mono"'),
        mainImage: mainImage ? { src: mainImage.currentSrc, width: mainImage.naturalWidth } : null,
        workerController: navigator.serviceWorker.controller?.scriptURL ?? null,
      }
    })
    if (!preflight.fontReady || !preflight.mainImage || !preflight.workerController || !preflight.title.includes('Emerald Ape')) {
      throw new Error(`Demo preflight incomplete: ${JSON.stringify(preflight)}`)
    }
    if (consoleErrors.length || pageErrors.length || badResponses.length) {
      throw new Error(`Demo runtime preflight errors: ${JSON.stringify({ consoleErrors, pageErrors, badResponses })}`)
    }
    await writeFile(
      path.join(reportDir, 'preflight.json'),
      `${JSON.stringify({ baseUrl, healthResponse, publicAssets, preflight, socket: 'event-received', consoleErrors, pageErrors, badResponses }, null, 2)}\n`,
    )
  } finally {
    await browser.close()
  }

  const lighthouseCli = path.resolve('node_modules/lighthouse/cli/index.js')
  const configPath = path.resolve('lighthouse.config.json')
  const chromePath = process.env.CHROME_PATH ?? chromium.executablePath()
  const scenarios = [
    { name: 'home', route: '/', profile: 'desktop' },
    { name: 'nft-emerald-ape-042', route: '/nft/emerald-ape-042', profile: 'desktop' },
    { name: 'home', route: '/', profile: 'mobile' },
    { name: 'nft-emerald-ape-042', route: '/nft/emerald-ape-042', profile: 'mobile' },
  ]
  const plan = scenarios.flatMap((scenario) =>
    Array.from({ length: 3 }, (_, index) => ({ ...scenario, run: index + 1 })),
  )
  const requestedLimit = Number.parseInt(process.env.LIGHTHOUSE_RUN_LIMIT ?? '', 10)
  const requestedFilter = process.env.LIGHTHOUSE_RUN_FILTER?.split(',').map((value) => value.trim()).filter(Boolean)
  const filteredPlan = requestedFilter
    ? plan.filter(({ name, profile }) => requestedFilter.includes(`${name}:${profile}`))
    : plan
  const selectedRuns = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? filteredPlan.slice(0, requestedLimit)
    : filteredPlan
  if (!selectedRuns.length) throw new Error('Lighthouse run filter selected no scenarios')
  const records = []

  for (const scenario of selectedRuns) {
      const { run } = scenario
      const label = `${scenario.name}-${scenario.profile}-run-${run}`
      const outputPath = path.join(reportDir, label)
      const browser = await startChrome(chromePath, label)
      const args = [
        lighthouseCli,
        `${baseUrl}${scenario.route}`,
        ...(scenario.profile === 'mobile'
          ? [`--config-path=${configPath}`]
          : ['--preset=desktop']),
        '--output=json',
        '--output=html',
        `--output-path=${outputPath}`,
        '--locale=pt-BR',
        '--quiet',
        `--port=${browser.port}`,
      ]
      if (scenario.profile === 'desktop') {
        args.push(
          '--screenEmulation.mobile=false',
          '--screenEmulation.width=1440',
          '--screenEmulation.height=900',
          '--screenEmulation.deviceScaleFactor=1',
        )
      } else {
        args.push(
          '--form-factor=mobile',
          '--screenEmulation.mobile=true',
          '--screenEmulation.width=414',
          '--screenEmulation.height=896',
          '--screenEmulation.deviceScaleFactor=1.75',
        )
      }
      console.log(`Lighthouse ${label}`)
      try {
        await new Promise((resolve, reject) => {
          const child = spawn(process.execPath, args, {
            cwd: process.cwd(),
            windowsHide: true,
            stdio: 'inherit',
            env: {
              ...process.env,
              CHROME_PATH: chromePath,
              TEMP: tempDir,
              TMP: tempDir,
            },
          })
          child.once('error', reject)
          child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${label} exited with ${code}`))))
        })
      } finally {
        await closeChrome(browser)
      }

      const report = JSON.parse(await readFile(`${outputPath}.report.json`, 'utf8'))
      const screen = report.configSettings.screenEmulation
      const expectedViewport = scenario.profile === 'desktop'
        ? { width: 1440, height: 900, mobile: false }
        : { width: 414, height: 896, mobile: true }
      if (
        report.configSettings.formFactor !== scenario.profile ||
        screen.width !== expectedViewport.width ||
        screen.height !== expectedViewport.height ||
        screen.mobile !== expectedViewport.mobile
      ) {
        throw new Error(
          `Lighthouse profile mismatch for ${label}: ${JSON.stringify({ formFactor: report.configSettings.formFactor, screen, expectedViewport })}`,
        )
      }
      const metric = (id) => report.audits[id]?.numericValue ?? null
      records.push({
        page: scenario.name,
        profile: scenario.profile,
        viewport: expectedViewport,
        run,
        report: `${label}.report.json`,
        scores: Object.fromEntries(
          ['performance', 'accessibility', 'best-practices', 'seo'].map((id) => [
            id,
            report.categories[id]?.score === null ? null : Math.round(report.categories[id].score * 100),
          ]),
        ),
        metrics: {
          lcpMs: metric('largest-contentful-paint'),
          cls: metric('cumulative-layout-shift'),
          tbtMs: metric('total-blocking-time'),
        },
      })
  }

  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  }
  const medians = [...new Map(records.map(({ page, profile }) => [`${page}:${profile}`, { name: page, profile }])).values()].map(({ name, profile }) => {
    const group = records.filter((record) => record.page === name && record.profile === profile)
    return {
      page: name,
      profile,
      scores: Object.fromEntries(
        Object.keys(group[0].scores).map((key) => [key, median(group.map((record) => record.scores[key]))]),
      ),
      metrics: {
        lcpMs: median(group.map((record) => record.metrics.lcpMs)),
        cls: median(group.map((record) => record.metrics.cls)),
        tbtMs: median(group.map((record) => record.metrics.tbtMs)),
      },
    }
  })
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const metadata = {
    phase,
    capturedAt: new Date().toISOString(),
    node: process.version,
    npm: process.env.npm_config_user_agent?.split(' ')[0] ?? 'unknown',
    os: `${os.platform()} ${os.release()} ${os.arch()}`,
    playwright: packageJson.devDependencies['@playwright/test'],
    chromium: browserVersion,
    lighthouse: packageJson.devDependencies.lighthouse,
    chromeLauncher: packageJson.devDependencies['chrome-launcher'],
    lighthouseConfig: 'Mobile: lighthouse.config.json extends lighthouse:default with no overrides. Desktop: built-in Lighthouse desktop preset; config-path is omitted because it would override the preset. Screen viewport only is set to 414x896 mobile and 1440x900 desktop to match design references; throttling and scoring remain the Lighthouse defaults.',
    chromeLaunch: 'ChromeLauncher default flags plus headless and no-sandbox required by this Windows runner; Lighthouse scoring/throttling defaults are unchanged',
    environment: 'optimized Vite demo preview with MSW and Socket.IO active',
    throttling: 'Lighthouse defaults for selected profile',
    runsPerPageAndProfile: selectedRuns.length === 12 ? 3 : 'diagnostic subset',
    runFilter: requestedFilter ?? 'all scenarios',
  }
  await writeFile(path.join(reportDir, 'runs.json'), `${JSON.stringify(records, null, 2)}\n`)
  await writeFile(path.join(reportDir, 'summary.json'), `${JSON.stringify({ metadata, medians }, null, 2)}\n`)
  console.log(JSON.stringify({ metadata, medians }, null, 2))
} finally {
  await stopPreview()
}
