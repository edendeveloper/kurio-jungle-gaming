import { mergeGuestCart } from '@/features/cart/merge-guest'
import { http, HttpResponse } from 'msw'
import { env } from '@/lib/env'
import { validateCredentials, validPassword } from '@/features/auth/validation'
import { validateProfile, validAvatar } from '@/features/profile/validation'
import { walletErrors } from '@/features/wallets/validation'
import type { CollectorProfile, CartMerge, WalletRecord } from '@/types/account'
import type { CheckoutWallet } from '@/types/checkout'
import { CommerceError } from '../store/errors'
import {
  beginSession,
  cookieToken,
  passwordDigest,
  profileOf,
  readAccounts,
  requestToken,
  requireAccount,
  revokeSession,
  sessionByToken,
  sessionCookie,
  writeAccounts,
} from '../store/accounts'
import {
  commerceTransaction,
  readCommerce,
  writeCommerce,
} from '../store/persistence'
import { getNftRecords } from '../data/nft-detail'

const base = env.apiBaseUrl.replace(/\/$/, '')
const text = (body: Record<string, unknown>, key: string) =>
  typeof body[key] === 'string' ? (body[key] as string) : ''
const bodyOf = async (request: Request): Promise<Record<string, unknown>> => {
  const raw = await request.json().catch(() => ({}))
  return raw && typeof raw === 'object' ? raw : {}
}
async function run(action: () => Response | Promise<Response>) {
  try {
    return await commerceTransaction(action)
  } catch (error) {
    if (error instanceof CommerceError)
      return HttpResponse.json(
        { message: error.message, code: error.code },
        { status: error.status },
      )
    return HttpResponse.json(
      {
        message: 'Não foi possível salvar os dados. Tente novamente.',
        code: 'ACCOUNT_UNAVAILABLE',
      },
      { status: 503 },
    )
  }
}
function unavailable() {
  if (
    localStorage.getItem('kurio:account-scenario') === 'error' ||
    localStorage.getItem('kurio:auth-scenario') === 'error'
  )
    throw new CommerceError(
      'API de conta indisponível. Tente novamente.',
      503,
      'ACCOUNT_UNAVAILABLE',
    )
}
function conflict(
  profile: Pick<CollectorProfile, 'username' | 'email'>,
  except?: string,
) {
  const users = Object.values(readAccounts().users).filter(
    (user) => user.id !== except,
  )
  if (
    users.some(
      (user) => user.email.toLowerCase() === profile.email.toLowerCase(),
    )
  )
    throw new CommerceError('E-mail já cadastrado.', 409, 'EMAIL_TAKEN')
  if (
    users.some(
      (user) => user.username.toLowerCase() === profile.username.toLowerCase(),
    )
  )
    throw new CommerceError(
      'Nome de usuário já cadastrado.',
      409,
      'USERNAME_TAKEN',
    )
}
function mergeGuest(userId: string): CartMerge {
  const state = readCommerce(userId),
    guest = readCommerce('guest'),
    records = getNftRecords()
  const result = mergeGuestCart(guest.items, state.items, records)
  state.items = result.items
  state.carts.guest = { items: result.guestItems, couponCode: guest.couponCode }
  if (!state.couponCode && result.addedQuantity)
    state.couponCode = guest.couponCode
  if (!state.carts.guest.items.length) state.carts.guest.couponCode = null
  writeCommerce(state)
  return {
    addedQuantity: result.addedQuantity,
    remainingGuestQuantity: result.remainingGuestQuantity,
    conflicts: result.conflicts,
  }
}
function signedIn(userId: string) {
  const before = localStorage.getItem('kurio:cart')
  try {
    return HttpResponse.json(beginSession(userId, mergeGuest(userId)))
  } catch (error) {
    if (before === null) localStorage.removeItem('kurio:cart')
    else localStorage.setItem('kurio:cart', before)
    throw error
  }
}
async function latency() {
  if (localStorage.getItem('kurio:account-scenario') === 'slow')
    await new Promise((resolve) => setTimeout(resolve, 1400))
}

export const accountHandlers = [
  http.get(`${base}/session`, async ({ request }) => {
    const token = requestToken(request)
    await latency()
    return run(() => {
      unavailable()
      const session = sessionByToken(token)
      if (!session.user && cookieToken() === token)
        document.cookie = `${sessionCookie}=; Path=/; Max-Age=0; SameSite=Strict`
      if (
        !session.user &&
        localStorage.getItem('kurio:auth-scenario') === 'anonymous-401'
      )
        return HttpResponse.json(
          { message: 'Sessão ausente.', code: 'UNAUTHENTICATED' },
          { status: 401 },
        )
      return HttpResponse.json(session)
    })
  }),
  http.post(`${base}/session/login`, async ({ request }) => {
    const body = await bodyOf(request),
      email = text(body, 'email').trim().toLowerCase(),
      password = text(body, 'password')
    const validation = validateCredentials({ email, password })
    if (Object.keys(validation).length)
      return HttpResponse.json(
        {
          message: Object.values(validation).join(' '),
          code: 'INVALID_CREDENTIALS',
        },
        { status: 422 },
      )
    const user = Object.values(readAccounts().users).find(
      (user) => user.email === email,
    )
    const digest = await passwordDigest(
      password,
      user?.salt ?? 'nonexistent-account',
    )
    return run(() => {
      unavailable()
      if (!user || digest !== readAccounts().users[user.id]?.passwordHash)
        throw new CommerceError(
          'E-mail ou senha incorretos.',
          401,
          'INVALID_CREDENTIALS',
        )
      return signedIn(user.id)
    })
  }),
  http.post(`${base}/session/register`, async ({ request }) => {
    const body = await bodyOf(request),
      email = text(body, 'email').trim().toLowerCase(),
      username = text(body, 'username').trim(),
      password = text(body, 'password')
    const validation = validateCredentials(
      { email, username, password, confirmation: text(body, 'confirmation') },
      true,
    )
    if (Object.keys(validation).length)
      return HttpResponse.json(
        {
          message: Object.values(validation).join(' '),
          code: 'INVALID_REGISTRATION',
        },
        { status: 422 },
      )
    const salt = crypto.randomUUID(),
      passwordHash = await passwordDigest(password, salt)
    return run(() => {
      unavailable()
      conflict({ email, username })
      const state = readAccounts(),
        id = `collector-${crypto.randomUUID()}`
      state.users[id] = {
        id,
        displayName: username,
        username,
        email,
        avatarUrl: null,
        salt,
        passwordHash,
        wallets: [],
      }
      writeAccounts(state)
      return signedIn(id)
    })
  }),
  http.post(`${base}/session/demo`, () =>
    run(() => {
      unavailable()
      return signedIn('collector-demo')
    }),
  ),
  http.post(`${base}/session/logout`, ({ request }) =>
    run(() => {
      revokeSession(requestToken(request))
      return HttpResponse.json({ user: null, contextId: null, expiresAt: null })
    }),
  ),
  http.post(`${base}/session/expire`, ({ request }) =>
    run(() => {
      const session = requireAccount(request),
        state = readAccounts()
      state.sessions[session.contextId!].expiresAt = Date.now() - 1
      writeAccounts(state)
      return HttpResponse.json({ expired: true })
    }),
  ),
  http.get(`${base}/profile`, async ({ request }) => {
    const token = requestToken(request)
    if (localStorage.getItem('kurio:account-scenario') === 'slow-profile')
      await new Promise((resolve) => setTimeout(resolve, 5000))
    await latency()
    return run(() => {
      unavailable()
      const session = sessionByToken(token)
      if (!session.user)
        throw new CommerceError(
          'Entre novamente para consultar o perfil.',
          401,
          'AUTH_REQUIRED',
        )
      if (localStorage.getItem('kurio:account-scenario') === 'missing-profile')
        throw new CommerceError(
          'Perfil não encontrado.',
          404,
          'PROFILE_NOT_FOUND',
        )
      return HttpResponse.json(profileOf(readAccounts().users[session.user.id]))
    })
  }),
  http.patch(`${base}/profile`, async ({ request }) => {
    const body = await bodyOf(request)
    return run(() => {
      unavailable()
      const session = requireAccount(request),
        state = readAccounts()
      const data = {
        displayName: text(body, 'displayName').trim(),
        username: text(body, 'username').trim(),
        email: text(body, 'email').trim().toLowerCase(),
      }
      const errors = validateProfile(data)
      if (Object.keys(errors).length)
        throw new CommerceError(
          Object.values(errors).join(' '),
          422,
          'INVALID_PROFILE',
        )
      conflict(data, session.user.id)
      Object.assign(state.users[session.user.id], data)
      writeAccounts(state)
      return HttpResponse.json(profileOf(state.users[session.user.id]))
    })
  }),
  http.put(`${base}/profile/avatar`, async ({ request }) => {
    const body = await bodyOf(request)
    return run(() => {
      unavailable()
      const session = requireAccount(request)
      if (!validAvatar(body.dataUrl))
        throw new CommerceError(
          'Envie PNG, JPEG ou WebP válido de até 256 KB.',
          422,
          'INVALID_AVATAR',
        )
      const state = readAccounts()
      state.users[session.user.id].avatarUrl = body.dataUrl
      writeAccounts(state)
      return HttpResponse.json(profileOf(state.users[session.user.id]))
    })
  }),
  http.delete(`${base}/profile/avatar`, ({ request }) =>
    run(() => {
      unavailable()
      const session = requireAccount(request),
        state = readAccounts()
      state.users[session.user.id].avatarUrl = null
      writeAccounts(state)
      return HttpResponse.json(profileOf(state.users[session.user.id]))
    }),
  ),
  http.put(`${base}/profile/password`, async ({ request }) => {
    const body = await bodyOf(request)
    const initial = sessionByToken(requestToken(request)),
      user = initial.user && readAccounts().users[initial.user.id]
    if (!user)
      return HttpResponse.json(
        { message: 'Entre novamente.', code: 'AUTH_REQUIRED' },
        { status: 401 },
      )
    const current = await passwordDigest(
      text(body, 'currentPassword'),
      user.salt,
    )
    if (
      !validPassword(text(body, 'password')) ||
      text(body, 'password') !== text(body, 'confirmation')
    )
      return HttpResponse.json(
        {
          message: 'Nova senha inválida ou confirmação divergente.',
          code: 'INVALID_PASSWORD',
        },
        { status: 422 },
      )
    const salt = crypto.randomUUID(),
      passwordHash = await passwordDigest(text(body, 'password'), salt)
    return run(() => {
      unavailable()
      const session = requireAccount(request),
        state = readAccounts()
      if (current !== state.users[session.user.id].passwordHash)
        throw new CommerceError(
          'Senha atual incorreta.',
          422,
          'CURRENT_PASSWORD_INVALID',
        )
      Object.assign(state.users[session.user.id], { salt, passwordHash })
      for (const [token, value] of Object.entries(state.sessions))
        if (value.userId === session.user.id) delete state.sessions[token]
      writeAccounts(state)
      if (cookieToken() === requestToken(request))
        document.cookie = `${sessionCookie}=; Path=/; Max-Age=0; SameSite=Strict`
      return HttpResponse.json({ changed: true, requiresLogin: true })
    })
  }),
  http.get(`${base}/wallets`, async ({ request }) => {
    const token = requestToken(request)
    await latency()
    return run(() => {
      unavailable()
      const session = sessionByToken(token)
      if (!session.user)
        throw new CommerceError('Entre novamente.', 401, 'AUTH_REQUIRED')
      return HttpResponse.json({
        items: readAccounts().users[session.user.id].wallets,
      })
    })
  }),
  http.post(`${base}/wallets`, async ({ request }) => walletMutation(request)),
  http.patch(`${base}/wallets/:id`, async ({ request, params }) =>
    walletMutation(request, String(params.id)),
  ),
  http.put(`${base}/wallets/:id/primary`, ({ request, params }) =>
    run(() => {
      unavailable()
      const session = requireAccount(request),
        state = readAccounts(),
        wallets = state.users[session.user.id].wallets
      if (!wallets.some((wallet) => wallet.id === params.id))
        throw new CommerceError(
          'Carteira não encontrada.',
          404,
          'WALLET_NOT_FOUND',
        )
      for (const wallet of wallets) wallet.isPrimary = wallet.id === params.id
      writeAccounts(state)
      return HttpResponse.json({ items: wallets })
    }),
  ),
  http.delete(`${base}/wallets/:id`, ({ request, params }) =>
    run(() => {
      unavailable()
      const session = requireAccount(request),
        state = readAccounts(),
        wallets = state.users[session.user.id].wallets
      const wallet = wallets.find((wallet) => wallet.id === params.id)
      if (!wallet)
        throw new CommerceError(
          'Carteira não encontrada.',
          404,
          'WALLET_NOT_FOUND',
        )
      if (wallet.isPrimary && wallets.length > 1)
        throw new CommerceError(
          'Defina outra carteira principal antes de remover esta.',
          409,
          'PRIMARY_WALLET_REQUIRED',
        )
      assertWalletUnused(session.user.id, wallet.id)
      state.users[session.user.id].wallets = wallets.filter(
        (item) => item.id !== wallet.id,
      )
      writeAccounts(state)
      return HttpResponse.json({ items: state.users[session.user.id].wallets })
    }),
  ),
]
function assertWalletUnused(userId: string, id: string) {
  if (
    Object.values(readCommerce(userId).orders).some(
      (order) =>
        order.userId === userId &&
        order.status === 'processing' &&
        order.wallet.savedWalletId === id,
    )
  )
    throw new CommerceError(
      'Esta carteira está em um pedido em processamento. Aguarde a conclusão.',
      409,
      'WALLET_IN_USE',
    )
}
async function walletMutation(request: Request, id?: string) {
  const body = await bodyOf(request)
  return run(() => {
    unavailable()
    const session = requireAccount(request),
      state = readAccounts(),
      wallets = state.users[session.user.id].wallets
    const displayName = text(body, 'displayName').trim(),
      nickname = text(body, 'nickname').trim()
    const wallet = {
      network: text(body, 'network'),
      address: text(body, 'address').trim(),
      provider: text(body, 'provider'),
      ens: text(body, 'ens').trim(),
    } as CheckoutWallet
    const errors = walletErrors(wallet)
    if (displayName.length < 2 || displayName.length > 60)
      errors.displayName = 'Nome da carteira deve ter de 2 a 60 caracteres.'
    if (nickname.length < 2 || nickname.length > 40)
      errors.nickname = 'Apelido deve ter de 2 a 40 caracteres.'
    if (Object.keys(errors).length)
      throw new CommerceError(
        Object.values(errors).join(' '),
        422,
        'INVALID_WALLET',
      )
    if (id && !wallets.some((wallet) => wallet.id === id))
      throw new CommerceError(
        'Carteira não encontrada.',
        404,
        'WALLET_NOT_FOUND',
      )
    if (id) assertWalletUnused(session.user.id, id)
    const addressKey =
      wallet.network === 'solana'
        ? wallet.address
        : wallet.address.toLowerCase()
    if (
      wallets.some(
        (item) =>
          item.id !== id &&
          item.network === wallet.network &&
          (item.network === 'solana'
            ? item.address
            : item.address.toLowerCase()) === addressKey,
      )
    )
      throw new CommerceError(
        'Esta carteira já está cadastrada nesta rede.',
        409,
        'WALLET_DUPLICATE',
      )
    const old = wallets.find((item) => item.id === id)
    const next: WalletRecord = {
      ...wallet,
      id: id ?? crypto.randomUUID(),
      displayName,
      nickname,
      label: nickname,
      isPrimary: old?.isPrimary ?? wallets.length === 0,
    }
    state.users[session.user.id].wallets = id
      ? wallets.map((item) => (item.id === id ? next : item))
      : [...wallets, next]
    writeAccounts(state)
    return HttpResponse.json(
      { items: state.users[session.user.id].wallets },
      { status: id ? 200 : 201 },
    )
  })
}
