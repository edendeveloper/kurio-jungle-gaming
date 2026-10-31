import { walletErrors } from '../wallets/validation.ts'
import type {
  CheckoutPayload,
  CheckoutWallet,
  CollectorData,
} from '../../types/checkout.ts'

export function validateCheckout(input: unknown): {
  data?: CheckoutPayload
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}
  const body = (
    input && typeof input === 'object' ? input : {}
  ) as Partial<CheckoutPayload>
  const collector = (
    body.collector && typeof body.collector === 'object' ? body.collector : {}
  ) as Partial<CollectorData>
  const wallet = (
    body.wallet && typeof body.wallet === 'object' ? body.wallet : {}
  ) as Partial<CheckoutWallet>
  const text = (value: unknown) =>
    typeof value === 'string' ? value.trim() : ''
  const name = text(collector.displayName),
    username = text(collector.username),
    email = text(collector.email)
  if (name.length < 2 || name.length > 80)
    errors.displayName = 'Informe um nome de exibição entre 2 e 80 caracteres.'
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username))
    errors.username = 'Use de 3 a 24 letras, números ou sublinhado.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    errors.email = 'Informe um e-mail válido.'
  if (text(collector.profile).length > 100)
    errors.profile = 'Use até 100 caracteres no perfil.'
  if (text(collector.notes).length > 500)
    errors.notes = 'Use até 500 caracteres nas observações.'
  Object.assign(errors, walletErrors(wallet))
  const network = wallet.network,
    address = text(wallet.address),
    ens = text(wallet.ens)
  if (!text(body.quoteId))
    errors.quoteId = 'Atualize a cotação antes de confirmar.'
  if (Object.keys(errors).length) return { errors }
  return {
    errors,
    data: {
      quoteId: text(body.quoteId),
      collector: {
        displayName: name,
        username,
        email: email.toLowerCase(),
        profile: text(collector.profile),
        notes: text(collector.notes),
      },
      wallet: {
        network: network!,
        provider: wallet.provider!,
        address,
        ens,
        savedWalletId: text(wallet.savedWalletId) || undefined,
      },
    },
  }
}
