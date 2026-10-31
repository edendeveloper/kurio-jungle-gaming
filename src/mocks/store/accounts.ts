import type {
  CollectorProfile,
  AccountSession,
  CartMerge,
  WalletRecord,
} from '@/types/account'
import { savedWallets } from '../data/wallets'
import { CommerceError } from './errors'

interface StoredUser extends CollectorProfile {
  salt: string
  passwordHash: string
  wallets: WalletRecord[]
}
interface SessionRecord {
  userId: string
  expiresAt: number
  cartMerge?: CartMerge
}
interface AccountsState {
  users: Record<string, StoredUser>
  sessions: Record<string, SessionRecord>
}
const storageKey = 'kurio:accounts'
export const sessionCookie = 'kurio_session'
export function readAccounts(): AccountsState {
  const existing = localStorage.getItem(storageKey)
  if (existing) return JSON.parse(existing) as AccountsState
  const users: StoredUser[] = [
    {
      id: 'collector-demo',
      displayName: 'Nova Collector',
      username: 'nova',
      email: 'nova@kurio.demo',
      avatarUrl: null,
      salt: 'kurio-fixture-nova',
      passwordHash:
        'ef8457d0909e945d5c8b2185c7756519dd59fc13754d6fb5bed62a0b37f97f8a',
      wallets: savedWallets.map((wallet, index) => ({
        ...wallet,
        displayName: `Carteira ${wallet.network}`,
        nickname:
          index === 0 ? 'Principal' : index === 1 ? 'Reserva' : 'Solana',
        isPrimary: index === 0,
      })),
    },
    {
      id: 'collector-alt',
      displayName: 'Luna Collector',
      username: 'luna',
      email: 'luna@kurio.demo',
      avatarUrl: null,
      salt: 'kurio-fixture-luna',
      passwordHash:
        '994fc9366f48113927cab5a169dfa9ecaa14ecf4a316f4ffd8d08190bfc65cf2',
      wallets: [
        {
          id: 'luna-polygon',
          label: 'Luna · Polygon',
          displayName: 'Carteira de Luna',
          nickname: 'Luna',
          isPrimary: true,
          network: 'polygon',
          provider: 'walletconnect',
          address: `0x${'3'.repeat(40)}`,
        },
      ],
    },
  ]
  const state = {
    users: Object.fromEntries(users.map((user) => [user.id, user])),
    sessions: {},
  }
  writeAccounts(state)
  return state
}
export function writeAccounts(state: AccountsState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    throw new CommerceError(
      'Não foi possível salvar os dados de demonstração. Verifique o espaço do navegador.',
      503,
      'STORAGE_UNAVAILABLE',
    )
  }
}
export function cookieToken(): string {
  return (
    document.cookie
      .split('; ')
      .find((value) => value.startsWith(`${sessionCookie}=`))
      ?.split('=')[1] ?? ''
  )
}
export function requestToken(request?: Request): string {
  const header = request?.headers.get('X-Kurio-Session')
  return header === 'guest' ? '' : (header ?? cookieToken())
}
export function sessionByToken(token: string): AccountSession {
  const state = readAccounts(),
    session = state.sessions[token],
    user = session && state.users[session.userId]
  if (!session || !user)
    return {
      user: null,
      contextId: null,
      expiresAt: null,
      ...(token ? { reason: 'invalid' as const } : {}),
    }
  if (session.expiresAt <= Date.now())
    return { user: null, contextId: null, expiresAt: null, reason: 'expired' }
  return {
    user: {
      id: user.id,
      name: user.displayName,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
    contextId: token,
    expiresAt: session.expiresAt,
    cartMerge: session.cartMerge,
  }
}
export function requireAccount(request: Request) {
  const session = sessionByToken(requestToken(request))
  if (!session.user)
    throw new CommerceError(
      'Sua sessão expirou ou não é válida. Entre novamente para continuar.',
      401,
      'AUTH_REQUIRED',
    )
  return { ...session, user: session.user }
}
export function cartOwner(request: Request) {
  return requestToken(request) ? requireAccount(request).user.id : 'guest'
}
export function profileOf(user: StoredUser): CollectorProfile {
  const { id, displayName, username, email, avatarUrl } = user
  return { id, displayName, username, email, avatarUrl }
}
export async function passwordDigest(password: string, salt: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: encoder.encode(salt),
      iterations: 100000,
    },
    key,
    256,
  )
  return Array.from(new Uint8Array(bits), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
export function beginSession(userId: string, cartMerge: CartMerge) {
  const state = readAccounts(),
    previous = cookieToken(),
    token = crypto.randomUUID()
  if (previous) delete state.sessions[previous]
  const ttl =
    localStorage.getItem('kurio:auth-scenario') === 'short-session'
      ? 4000
      : 30 * 60 * 1000
  state.sessions[token] = { userId, expiresAt: Date.now() + ttl, cartMerge }
  writeAccounts(state)
  document.cookie = `${sessionCookie}=${token}; Path=/; SameSite=Strict`
  return sessionByToken(token)
}
export function revokeSession(token: string) {
  const state = readAccounts()
  delete state.sessions[token]
  writeAccounts(state)
  if (cookieToken() === token)
    document.cookie = `${sessionCookie}=; Path=/; Max-Age=0; SameSite=Strict`
}
