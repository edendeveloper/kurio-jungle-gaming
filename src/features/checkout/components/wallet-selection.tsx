import type { SavedWallet, WalletProvider } from '@/types/checkout'

export function SavedWalletPicker({
  items,
  selected,
  onChange,
}: {
  items: readonly SavedWallet[]
  selected?: string
  onChange: (wallet?: SavedWallet) => void
}) {
  return (
    <fieldset className="wallet-picker">
      <legend>Carteira salva</legend>
      <div className="saved-wallet-options">
        {items.map((wallet) => (
          <label
            key={wallet.id}
            className="wallet-choice"
            data-selected={selected === wallet.id}
          >
            <input
              type="radio"
              name="saved-wallet"
              checked={selected === wallet.id}
              onChange={() => onChange(wallet)}
            />
            <span>
              <strong>{wallet.label}</strong>
              <small>
                {wallet.ens ||
                  `${wallet.address.slice(0, 8)}…${wallet.address.slice(-6)}`}
              </small>
              <small>Rede {wallet.network}</small>
            </span>
          </label>
        ))}
        <label className="wallet-choice" data-selected={!selected}>
          <input
            type="radio"
            name="saved-wallet"
            checked={!selected}
            onChange={() => onChange()}
          />
          <span>
            <strong>Informar outra carteira</strong>
            <small>Endereço manual de demonstração</small>
          </span>
        </label>
      </div>
    </fieldset>
  )
}

const providers: readonly {
  id: WalletProvider
  label: string
  mark: string
}[] = [
  { id: 'walletconnect', label: 'WalletConnect', mark: 'W' },
  { id: 'metamask', label: 'MetaMask', mark: 'M' },
  { id: 'coinbase', label: 'Coinbase Wallet', mark: 'C' },
]
export function WalletProviderPicker({
  selected,
  onChange,
  error,
}: {
  selected: WalletProvider
  onChange: (value: WalletProvider) => void
  error?: string
}) {
  return (
    <fieldset
      className="wallet-picker"
      aria-describedby={error ? 'error-provider' : undefined}
    >
      <legend>Provedor da carteira</legend>
      <div className="provider-options">
        {providers.map((provider, index) => (
          <label
            className="provider-choice"
            key={provider.id}
            data-selected={selected === provider.id}
          >
            <span className="provider-mark" aria-hidden="true">
              {provider.mark}
            </span>
            <span>{provider.label}</span>
            <input
              id={index === 0 ? 'checkout-provider' : undefined}
              type="radio"
              name="wallet-provider"
              value={provider.id}
              checked={selected === provider.id}
              onChange={() => onChange(provider.id)}
              aria-invalid={!!error}
            />
          </label>
        ))}
      </div>
      {error && (
        <p id="error-provider" role="alert" className="commerce-error">
          {error}
        </p>
      )}
    </fieldset>
  )
}
