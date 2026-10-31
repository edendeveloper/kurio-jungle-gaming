import axios from 'axios'
import { env } from '@/lib/env'
import type { ApiErrorBody } from '@/types/api'
import { authVersion, sessionToken, trackPrivateRequest } from './auth-context'

export class ApiError extends Error {
  readonly status?: number
  readonly code?: string
  constructor(
    message: string,
    status?: number,
    code?: string,
    cause?: unknown,
  ) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export const api = axios.create({ baseURL: env.apiBaseUrl, timeout: 10_000 })
const contexts = new WeakMap<object, { version: number; release: () => void }>()
function isCartContract(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  if (!Array.isArray(body.items) || typeof body.version !== 'string') return false
  if (typeof body.totals !== 'object' || body.totals === null) return false
  const totals = body.totals as Record<string, unknown>
  if (!['subtotalEth', 'discountEth', 'networkFeeEth', 'totalEth'].every((key) => typeof totals[key] === 'string')) return false
  return body.items.every((item: unknown) => {
    if (typeof item !== 'object' || item === null) return false
    const row = item as Record<string, unknown>
    return typeof row.nftId === 'string' && Number.isSafeInteger(row.edition) && Number.isSafeInteger(row.quantity) && typeof row.subtotalEth === 'string' && typeof row.nft === 'object' && row.nft !== null
  })
}
api.interceptors.request.use((config) => {
  const expected = config.headers.get('X-Kurio-Session')
  if (expected && expected !== sessionToken()) {
    window.dispatchEvent(new Event('kurio:unauthorized'))
    throw new axios.CanceledError('O contexto da sessão mudou.')
  }
  if (!expected) config.headers.set('X-Kurio-Session', sessionToken())
  const pathname = (config.url ?? '').split(/[?#]/)[0]
  if (
    /^\/(cart|favorites|profile|wallets|orders|checkout|session)(\/|$)/.test(
      pathname,
    ) &&
    !/^\/session\/(login|register|logout|demo)$/.test(pathname)
  ) {
    const controller = new AbortController()
    config.signal = config.signal
      ? AbortSignal.any([config.signal as AbortSignal, controller.signal])
      : controller.signal
    contexts.set(config, {
      version: authVersion(),
      release: trackPrivateRequest(controller),
    })
  }
  return config
})
api.interceptors.response.use(
  (response) => {
    const context = contexts.get(response.config)
    context?.release()
    if (context && context.version !== authVersion())
      throw new axios.CanceledError('Sessão anterior descartada.')
    const requestPath = (response.config.url ?? '').split(/[?#]/)[0]
    if (/^\/cart(?:\/|$)/.test(requestPath)) {
      const contentType = String(response.headers['content-type'] ?? '')
      if (!contentType.toLowerCase().includes('application/json') || !isCartContract(response.data)) {
        if (import.meta.env.DEV)
          console.error('[api] Invalid cart response contract', {
            requestPath,
            status: response.status,
            contentType,
            bodyType: typeof response.data,
          })
        throw new ApiError(
          'A API retornou uma resposta incompatível com o contrato do carrinho.',
          response.status,
          'INVALID_CART_RESPONSE',
        )
      }
    }
    return response
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const context = error.config && contexts.get(error.config)
      context?.release()
      if (context && context.version !== authVersion())
        return Promise.reject(
          new axios.CanceledError('Sessão anterior descartada.'),
        )
      if (
        error.response?.status === 401 &&
        error.config?.url !== '/session' &&
        !/^\/session\/(login|register)/.test(error.config?.url ?? '')
      )
        window.dispatchEvent(new Event('kurio:unauthorized'))
    }
    return Promise.reject(error)
  },
)
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Preserve cancellation so Query can discard obsolete requests.
    if (axios.isCancel(error)) return Promise.reject(error)
    if (axios.isAxiosError<ApiErrorBody>(error)) {
      const body = error.response?.data
      const message =
        typeof body?.message === 'string'
          ? body.message
          : error.code === 'ECONNABORTED'
            ? 'A requisição excedeu o tempo limite.'
            : error.response
              ? `A API respondeu com erro ${error.response.status}.`
              : 'Não foi possível conectar à API.'
      return Promise.reject(
        new ApiError(
          message,
          error.response?.status,
          typeof body?.code === 'string' ? body.code : error.code,
          error,
        ),
      )
    }
    return Promise.reject(
      new ApiError(
        'Erro inesperado na comunicação com a API.',
        undefined,
        undefined,
        error,
      ),
    )
  },
)
