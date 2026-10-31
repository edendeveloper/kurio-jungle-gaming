import { expect, test, type Page } from '@playwright/test'
import {
  apiLogin,
  apiRequest,
  uiLogin,
  logout,
  nova,
  luna,
} from './helpers/auth.ts'

const nft = '/nft/emerald-ape-042'
async function addCart(page: Page, quantity = 1) {
  expect(
    (
      await apiRequest(page, '/cart/items', 'POST', {
        nftId: 'emerald-ape-042',
        edition: 1,
        quantity,
      })
    ).status,
  ).toBe(201)
}
async function newWallet(page: Page, nickname = 'Estúdio') {
  await page
    .getByRole('button', { name: 'Cadastrar carteira', exact: true })
    .click()
  const form = page.locator('.wallet-editor-inline')
  await form.getByLabel('Nome da carteira').fill('Carteira do estúdio')
  await form.getByLabel('Apelido', { exact: true }).fill(nickname)
  await form
    .getByLabel('Endereço', { exact: true })
    .fill(`0x${'9'.repeat(40)}`)
  await form
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(form).not.toBeVisible()
}
test('cadastro valida campos, confirma API, cria sessão e persiste após refresh', async ({
  page,
}) => {
  await page.goto('/register')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(
    page.getByLabel('Nome de usuário', { exact: true }),
  ).toHaveAttribute('aria-invalid', 'true')
  await page
    .getByLabel('Nome de usuário', { exact: true })
    .fill('new_collector')
  await page.getByLabel('E-mail', { exact: true }).fill('new@kurio.demo')
  await page.getByLabel('Senha', { exact: true }).fill('NewCollector123!')
  await page.getByLabel('Confirmar senha', { exact: true }).fill('different')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(page.getByText('As senhas não correspondem.')).toBeVisible()
  await page
    .getByLabel('Confirmar senha', { exact: true })
    .fill('NewCollector123!')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(page).toHaveURL('/profile')
  await expect(page.getByLabel('Nome de usuário', { exact: true })).toHaveValue(
    'new_collector',
  )
  await page.reload()
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue(
    'new@kurio.demo',
  )
  const stored = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  )
  expect(stored).not.toContain('NewCollector123!')
  const session = await apiRequest(page, '/session')
  expect(session.data.contextId).toMatch(/^[\da-f-]{36}$/)
  expect(session.data).not.toHaveProperty('passwordHash')
})
test('cadastro rejeita e-mail e usuário duplicados', async ({ page }) => {
  await page.goto('/register')
  for (const [username, email, message] of [
    ['other', nova.email, 'E-mail já cadastrado.'],
    ['nova', 'other@kurio.demo', 'Nome de usuário já cadastrado.'],
  ]) {
    await page.getByLabel('Nome de usuário', { exact: true }).fill(username)
    await page.getByLabel('E-mail', { exact: true }).fill(email)
    await page.getByLabel('Senha', { exact: true }).fill('Fictional123!')
    await page
      .getByLabel('Confirmar senha', { exact: true })
      .fill('Fictional123!')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText(message)
  }
})
test('login inválido recupera foco, permite mostrar senha e depois autentica', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(nova.email)
  await page.getByLabel('Senha', { exact: true }).fill('WrongPassword123!')
  await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click()
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute(
    'type',
    'text',
  )
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'E-mail ou senha incorretos.',
  )
  await expect(page.getByLabel('Senha', { exact: true })).toBeFocused()
  await page.getByLabel('Senha', { exact: true }).fill(nova.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/profile')
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(
    'Nova Collector',
  )
})
test('logout e identificador arbitrário não autorizam recursos privados', async ({
  page,
}) => {
  await uiLogin(page)
  await logout(page)
  await page.evaluate(() =>
    localStorage.setItem('kurio:session-user', 'collector-demo'),
  )
  for (const path of [
    '/profile',
    '/wallets',
    '/favorites',
    '/orders/KUR-private',
  ])
    expect((await apiRequest(page, path)).status).toBe(401)
  await page.goto('/profile/wallets')
  await expect(page).toHaveURL(/\/login\?returnTo=/)
  await expect(
    page.getByRole('heading', { name: 'Carteiras', exact: true }),
  ).toHaveCount(0)
})
test('rota protegida mantém destino e carrinho visitante após login', async ({
  page,
}) => {
  await page.goto('/cart')
  await expect(
    page.getByRole('heading', { name: 'Carrinho', exact: true }),
  ).toBeVisible()
  await addCart(page, 2)
  await page.goto('/checkout')
  await expect(page).toHaveURL(/login.*returnTo=%2Fcheckout/)
  await page.getByLabel('E-mail', { exact: true }).fill(nova.email)
  await page.getByLabel('Senha', { exact: true }).fill(nova.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/checkout')
  await expect(page.getByTestId('subtotal')).toHaveText('2.38 ETH')
  await page.reload()
  expect((await apiRequest(page, '/cart')).data.items[0].quantity).toBe(2)
})
test('mesclagem é idempotente, respeita estoque e mantém conflitos no visitante', async ({
  page,
}) => {
  await uiLogin(page)
  await addCart(page, 3)
  await logout(page)
  await addCart(page, 4)
  await uiLogin(page)
  const session = await apiRequest(page, '/session')
  expect(session.data.cartMerge).toMatchObject({
    addedQuantity: 2,
    remainingGuestQuantity: 2,
  })
  expect((await apiRequest(page, '/cart')).data.items[0].quantity).toBe(5)
  await expect(
    page.getByRole('status').filter({ hasText: '2 itens continuam' }),
  ).toBeVisible()
  await page.reload()
  expect((await apiRequest(page, '/cart')).data.items[0].quantity).toBe(5)
  await uiLogin(page)
  expect((await apiRequest(page, '/cart')).data.items[0].quantity).toBe(5)
  await logout(page)
  expect((await apiRequest(page, '/cart')).data.items[0].quantity).toBe(2)
})
test('perfil salva dados e rejeita conflito; ENS e apelido pertencem à carteira', async ({
  page,
}) => {
  await uiLogin(page)
  await page.getByLabel('Nome de exibição').fill('Nova Atualizada')
  await page.getByLabel('Nome de usuário', { exact: true }).fill('nova_updated')
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click()
  await expect(
    page.getByText('Perfil atualizado.', { exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(
    'Nova Atualizada',
  )
  await page.getByLabel('E-mail', { exact: true }).fill(luna.email)
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('E-mail já cadastrado.')
  expect((await apiRequest(page, '/profile')).data.email).toBe(nova.email)
  await expect(
    page.getByText('ENS e apelido pertencem à carteira.'),
  ).toBeVisible()
})
test('avatar valida formato e tamanho, mostra preview, salva e remove', async ({
  page,
}) => {
  await uiLogin(page)
  const input = page.getByLabel('Selecionar avatar')
  await input.setInputFiles({
    name: 'bad.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  })
  await expect(page.getByRole('alert')).toContainText('PNG, JPEG ou WebP')
  await input.setInputFiles({
    name: 'large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(256 * 1024 + 1),
  })
  await expect(page.getByRole('alert')).toContainText('256 KB')
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=',
    'base64',
  )
  await input.setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: png,
  })
  await expect(page.getByAltText('Preview do avatar')).toBeVisible()
  await page.getByRole('button', { name: 'Salvar avatar', exact: true }).click()
  await expect(page.getByAltText('Avatar do colecionador')).toBeVisible()
  await page.reload()
  await expect(page.getByAltText('Avatar do colecionador')).toBeVisible()
  await page
    .getByRole('button', { name: 'Remover avatar', exact: true })
    .click()
  await expect(
    page.getByText('Avatar removido.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByAltText('Avatar do colecionador')).toHaveCount(0)
})
test('senha atual incorreta é rejeitada; alteração válida revoga a sessão', async ({
  page,
}) => {
  await uiLogin(page)
  await page.getByLabel('Senha atual', { exact: true }).fill('Incorrect123!')
  await page.getByLabel('Nova senha', { exact: true }).fill('NewFictional123!')
  await page
    .getByLabel('Confirmar nova senha', { exact: true })
    .fill('NewFictional123!')
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Senha atual incorreta.')
  await page.getByLabel('Senha atual', { exact: true }).fill(nova.password)
  await page.getByLabel('Nova senha', { exact: true }).fill('NewFictional123!')
  await page
    .getByLabel('Confirmar nova senha', { exact: true })
    .fill('NewFictional123!')
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click()
  await expect(page).toHaveURL(/\/login/)
  expect((await apiRequest(page, '/profile')).status).toBe(401)
  expect((await apiRequest(page, '/session/login', 'POST', nova)).status).toBe(
    401,
  )
  await uiLogin(page, { ...nova, password: 'NewFictional123!' })
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain('NewFictional123!')
})
test('carteiras: validação, cadastro, edição, duplicação e principal/secundária', async ({
  page,
}) => {
  await uiLogin(page, nova, '/profile/wallets')
  await newWallet(page)
  let wallet = page.getByRole('article', {
    name: 'Carteira Estúdio',
    exact: true,
  })
  await expect(wallet).toContainText('Secundária')
  await wallet
    .getByRole('button', { name: 'Editar Estúdio', exact: true })
    .click()
  const editForm = page.locator('.wallet-editor-inline')
  await editForm.getByLabel('Apelido', { exact: true }).fill('Ateliê')
  await editForm
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  wallet = page.getByRole('article', { name: 'Carteira Ateliê', exact: true })
  await wallet
    .getByRole('button', { name: 'Definir Ateliê como principal', exact: true })
    .click()
  await expect(wallet).toContainText('Principal')
  await page.reload()
  await expect(wallet).toContainText('Principal')
  await page
    .getByRole('button', { name: 'Cadastrar carteira', exact: true })
    .click()
  const form = page.locator('.wallet-editor-inline')
  await form
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(form.getByLabel('Endereço', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await form.getByLabel('Nome da carteira').fill('Duplicada')
  await form.getByLabel('Apelido', { exact: true }).fill('Duplicada')
  await form.getByLabel('Endereço', { exact: true }).fill(`0x${'9'.repeat(40)}`)
  await form
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(form.getByRole('alert')).toContainText('já está cadastrada')
})
test('remoção confirma, protege principal e os diálogos de remoção preservam foco e teclado', async ({
  page,
}) => {
  await uiLogin(page, nova, '/profile/wallets')
  const create = page.getByRole('button', {
    name: 'Cadastrar carteira',
    exact: true,
  })
  await create.click()
  await expect(page.getByLabel('Nome da carteira')).toBeFocused()
  await page
    .locator('.wallet-editor-inline')
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Remover Principal', exact: true })
    .click()
  const removeDialog = page.getByRole('dialog', { name: 'Remover carteira' })
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab')
    expect(
      await removeDialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true)
  }
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar remoção' })
    .click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Defina outra carteira principal',
  )
  await page.keyboard.press('Escape')
  await page
    .getByRole('button', { name: 'Remover Reserva', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click()
  await expect(
    page.getByRole('article', { name: 'Carteira Reserva', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Remover Reserva', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar remoção' })
    .click()
  await expect(
    page.getByRole('article', { name: 'Carteira Reserva', exact: true }),
  ).toHaveCount(0)
})
test('favoritos, carteiras, carrinhos e pedidos ficam isolados ao trocar conta', async ({
  page,
}) => {
  await uiLogin(page, nova, nft)
  await page.getByRole('button', { name: 'Favoritar NFT', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos' }),
  ).toBeEnabled()
  await addCart(page, 2)
  const quote = await apiRequest(page, '/checkout/quote', 'POST', {
    network: 'ethereum',
  })
  const order = await page.evaluate(async (quoteId) => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'private-order-test',
      },
      body: JSON.stringify({
        quoteId,
        collector: {
          displayName: 'Nova',
          username: 'nova',
          email: 'nova@kurio.demo',
        },
        wallet: {
          network: 'ethereum',
          provider: 'metamask',
          address: `0x${'1'.repeat(40)}`,
        },
      }),
    })
    return response.json()
  }, quote.data.id)
  await logout(page)
  await uiLogin(page, luna, nft)
  await expect(
    page.getByRole('button', { name: 'Favoritar NFT', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false')
  expect((await apiRequest(page, '/favorites')).data.nftIds).toEqual([])
  expect(
    (await apiRequest(page, '/wallets')).data.items.map(
      (item: { nickname: string }) => item.nickname,
    ),
  ).toEqual(['Luna'])
  expect((await apiRequest(page, '/cart')).data.items).toEqual([])
  expect((await apiRequest(page, `/orders/${order.id}`)).status).toBe(404)
  await logout(page)
  await uiLogin(page, nova, nft)
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos' }),
  ).toHaveAttribute('aria-pressed', 'true')
})
test('resposta antiga e requisição privada pendente não contaminam conta nova', async ({
  page,
}) => {
  await uiLogin(page)
  await page.evaluate(() =>
    localStorage.setItem('kurio:account-scenario', 'slow-profile'),
  )
  const started = page.waitForRequest((request) =>
    request.url().includes('/profile?delayed=1'),
  )
  const pending = page.evaluate(async () => {
    // Exercise the actual Axios transport and cache cancellation, not a UI setter.
    const modulePath = '/src/lib/api/client.ts'
    const { api } = await import(modulePath)
    return api.get('/profile?delayed=1').then(
      () => 'received',
      () => 'discarded',
    )
  })
  await started
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL('/marketplace')
  expect(await pending).toBe('discarded')
  await page.evaluate(() => localStorage.removeItem('kurio:account-scenario'))
  await uiLogin(page, luna)
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(
    'Luna Collector',
  )
  await page.waitForTimeout(1500)
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(
    'Luna Collector',
  )
})
test('sessão expira durante checkout e login retoma dados, itens e carteira cadastrada', async ({
  page,
}) => {
  await uiLogin(page)
  await addCart(page, 2)
  await page.goto('/checkout')
  await page.getByLabel('Nome de exibição').fill('Colecionador Retomado')
  await page.getByLabel('Nome de usuário', { exact: true }).fill('retomado')
  await page.getByLabel('E-mail', { exact: true }).fill('retomado@kurio.demo')
  await page.getByRole('radio', { name: /Principal · demonstração/ }).check()
  await apiRequest(page, '/session/expire', 'POST')
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(page).toHaveURL(/login.*returnTo=%2Fcheckout/)
  await page.getByLabel('E-mail', { exact: true }).fill(nova.email)
  await page.getByLabel('Senha', { exact: true }).fill(nova.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/checkout')
  const recoverExpired = page.getByRole('button', {
    name: 'Revisar dados e cotação',
  })
  await recoverExpired.click()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(
    'Colecionador Retomado',
  )
  await expect(page.getByTestId('subtotal')).toHaveText('2.38 ETH')
  await page
    .getByRole('link', { name: 'Gerenciar ou cadastrar carteira' })
    .click()
  await expect(page).toHaveURL(/profile\/wallets/)
  await newWallet(page, 'Compra')
  await page.getByRole('link', { name: 'Voltar ao checkout' }).click()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(
    'Colecionador Retomado',
  )
  await page.getByRole('radio', { name: /Compra/ }).check()
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  // An expired attempt was never received; recovery reuses its key and requires a fresh quote.
  const review = page.getByRole('button', { name: 'Revisar dados e cotação' })
  if (await review.isVisible()) {
    await review.click()
    await page
      .getByRole('button', { name: 'Confirmar compra', exact: true })
      .click()
  }
  await expect(
    page.getByRole('heading', { name: 'Compra confirmada', exact: true }),
  ).toBeVisible()
})
test('expiração automática e API indisponível não exibem conteúdo privado', async ({
  page,
}) => {
  await page.goto('/login')
  await page.evaluate(() =>
    localStorage.setItem('kurio:auth-scenario', 'short-session'),
  )
  await uiLogin(page)
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  await expect(page.getByLabel('Nome de exibição')).toHaveCount(0)
  await page.evaluate(() =>
    localStorage.setItem('kurio:auth-scenario', 'error'),
  )
  await page.getByLabel('E-mail', { exact: true }).fill(nova.email)
  await page.getByLabel('Senha', { exact: true }).fill(nova.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'API de conta indisponível',
  )
})
test('telas de conta responsivas e capturas em desktop e mobile', async ({
  page,
}, info) => {
  const mobile = info.project.name.includes('mobile'),
    width = mobile ? 414 : 1440
  await page.setViewportSize({ width, height: mobile ? 896 : 900 })
  for (const path of ['/login', '/register']) {
    await page.goto(path)
    await expect(page.locator('.auth-submit')).toBeVisible()
    await page.screenshot({
      path: `docs/screenshots/stage6/${path.slice(1)}-${width}.png`,
      fullPage: true,
      scale: 'css',
    })
    if (mobile)
      await page.screenshot({
        path: `docs/screenshots/stage8d/after/${path.slice(1)}-mobile.png`,
        fullPage: true,
        scale: 'css',
      })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  }
  await uiLogin(page)
  for (const path of ['/profile', '/profile/wallets']) {
    await page.goto(path)
    await expect(
      page.getByRole('heading', {
        name: path.endsWith('wallets') ? 'Carteiras' : 'Perfil',
        exact: true,
      }),
    ).toBeVisible()
    if (path.endsWith('wallets'))
      await expect(page.getByRole('article')).toHaveCount(3)
    else
      await expect(page.getByLabel('Nome de exibição')).toHaveValue(
        'Nova Collector',
      )
    await page.screenshot({
      path: `docs/screenshots/stage6/${path.endsWith('wallets') ? 'wallets' : 'profile'}-${width}.png`,
      fullPage: true,
      scale: 'css',
    })
    if (path.endsWith('wallets'))
      await page.screenshot({
        path: `docs/screenshots/stage8d/after/wallets-${width}.png`,
        fullPage: true,
        scale: 'css',
      })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  }
})

test('login pelo header retorna ao NFT e destinos externos são recusados', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(nft)
  await page.getByRole('link', { name: 'Entrar', exact: true }).click()
  await page.getByLabel('E-mail', { exact: true }).fill(nova.email)
  await page.getByLabel('Senha', { exact: true }).fill(nova.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(nft)
  await logout(page)
  await page.goto('/login?returnTo=https%3A%2F%2Fevil.test')
  await page.getByLabel('E-mail', { exact: true }).fill(nova.email)
  await page.getByLabel('Senha', { exact: true }).fill(nova.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/profile')
})

test('contexto antigo não pode buscar dados da conta nova antes de revalidar sessão', async ({
  page,
}) => {
  await uiLogin(page)
  const old = (await apiRequest(page, '/session')).data.contextId as string
  await apiLogin(page, luna)
  const result = await page.evaluate(async (context) => {
    const modulePath = '/src/lib/api/client.ts',
      { api } = await import(modulePath)
    return api
      .get('/profile', { headers: { 'X-Kurio-Session': context } })
      .then(
        () => 'received',
        () => 'discarded',
      )
  }, old)
  expect(result).toBe('discarded')
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(
    'Luna Collector',
  )
})

test('perfil inexistente e falha de salvamento têm feedback e retry', async ({
  page,
}) => {
  await uiLogin(page)
  await page.evaluate(() =>
    localStorage.setItem('kurio:account-scenario', 'missing-profile'),
  )
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Perfil não encontrado.')
  await page.evaluate(() => localStorage.removeItem('kurio:account-scenario'))
  await page.getByRole('button', { name: 'Tentar carregar perfil' }).click()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(
    'Nova Collector',
  )
  await page.evaluate(() =>
    localStorage.setItem('kurio:account-scenario', 'error'),
  )
  await page.getByLabel('Nome de exibição').fill('Não salvar em falha')
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'API de conta indisponível',
  )
  await page.evaluate(() => localStorage.removeItem('kurio:account-scenario'))
  expect((await apiRequest(page, '/profile')).data.displayName).toBe(
    'Nova Collector',
  )
})
