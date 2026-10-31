import { currentSession } from '../store/session'
import { http, HttpResponse } from 'msw'
import { env } from '@/lib/env'
import type { FavoritesResponse } from '@/types/collector'
import { getNftRecords } from '../data/nft-detail'

const base = env.apiBaseUrl.replace(/\/$/, '')
const error = (message: string, status: number, code: string) =>
  HttpResponse.json({ message, code }, { status })
function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}
function favoriteIds(userId: string): string[] {
  const stored = readStored<unknown>(`kurio:favorites:${userId}`, [])
  return Array.isArray(stored)
    ? stored.filter((id): id is string => typeof id === 'string')
    : []
}
export const collectorHandlers = [
  http.get(`${base}/favorites`, async ({ request }) => {
    const { user } = currentSession(request)
    if (localStorage.getItem('kurio:account-scenario') === 'slow')
      await new Promise((resolve) => setTimeout(resolve, 1400))
    return user
      ? HttpResponse.json<FavoritesResponse>({ nftIds: favoriteIds(user.id) })
      : error(
          'Entre na sua conta para acessar favoritos.',
          401,
          'AUTH_REQUIRED',
        )
  }),
  http.put(`${base}/favorites/:id`, async ({ params, request }) => {
    const { user } = currentSession(request)
    if (!user)
      return error('Entre na sua conta para favoritar.', 401, 'AUTH_REQUIRED')
    if (!getNftRecords().some((nft) => nft.id === params.id))
      return error('NFT não encontrado.', 404, 'NFT_NOT_FOUND')
    const body = (await request.json().catch(() => null)) as {
      favorite?: unknown
    } | null
    if (typeof body?.favorite !== 'boolean')
      return error('Informe o estado do favorito.', 400, 'INVALID_FAVORITE')
    if (localStorage.getItem('kurio:favorite-scenario') === 'error')
      return error(
        'Não foi possível salvar o favorito.',
        503,
        'FAVORITE_UNAVAILABLE',
      )
    const ids = new Set(favoriteIds(user.id))
    if (body.favorite) ids.add(String(params.id))
    else ids.delete(String(params.id))
    localStorage.setItem(`kurio:favorites:${user.id}`, JSON.stringify([...ids]))
    return HttpResponse.json<FavoritesResponse>({ nftIds: [...ids] })
  }),
]
