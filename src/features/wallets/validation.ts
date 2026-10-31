import type { CheckoutWallet } from '../../types/checkout.ts'
export function walletErrors(
  wallet: Partial<CheckoutWallet>,
): Record<string, string> {
  const errors: Record<string, string> = {},
    network = wallet.network
  if (!['ethereum', 'polygon', 'solana'].includes(network ?? ''))
    errors.network = 'Selecione uma rede válida.'
  if (
    !['walletconnect', 'metamask', 'coinbase'].includes(wallet.provider ?? '')
  )
    errors.provider = 'Selecione um provedor.'
  if (network === 'solana' && wallet.provider !== 'walletconnect')
    errors.provider = 'Nesta simulação, Solana utiliza WalletConnect.'
  const address =
    typeof wallet.address === 'string' ? wallet.address.trim() : ''
  if (
    network === 'solana'
      ? !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
      : !/^0x[a-fA-F0-9]{40}$/.test(address)
  )
    errors.address = 'Endereço com formato incompatível com a rede selecionada.'
  const ens = typeof wallet.ens === 'string' ? wallet.ens.trim() : ''
  if (
    ens &&
    (network !== 'ethereum' ||
      ens.length > 255 ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+eth$/i.test(ens))
  )
    errors.ens = 'ENS é opcional e deve terminar em .eth na rede Ethereum.'
  return errors
}
