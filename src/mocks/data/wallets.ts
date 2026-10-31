import type { SavedWallet } from '@/types/checkout'

export const savedWallets: readonly SavedWallet[] = [
  {
    id: 'main-ethereum',
    label: 'Principal · demonstração',
    network: 'ethereum',
    address: `0x${'1'.repeat(40)}`,
    provider: 'metamask',
    ens: 'kurio.eth',
  },
  {
    id: 'reserve-polygon',
    label: 'Reserva · demonstração',
    network: 'polygon',
    address: `0x${'2'.repeat(40)}`,
    provider: 'walletconnect',
  },
  {
    id: 'solana-demo',
    label: 'Solana · demonstração',
    network: 'solana',
    address: '7'.repeat(32),
    provider: 'walletconnect',
  },
]
