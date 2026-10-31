import { useEffect, useState } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { AccountLayout } from '@/features/profile/layout'
import { AccountField } from '@/components/ui/account-field'
import { AccountDialog } from '@/components/ui/account-dialog'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import type { WalletRecord } from '@/types/account'
import type { CheckoutWallet } from '@/types/checkout'
import { safeReturnTo } from '@/features/auth/validation'
import { useWalletMutation, useWallets } from './api'
import { walletErrors } from './validation'

function WalletEditor({
  wallet,
  close,
  inline = false,
}: {
  wallet?: WalletRecord
  close: () => void
  inline?: boolean
}) {
  const update = useWalletMutation(),
    [fields, setFields] = useState({
      displayName: wallet?.displayName ?? '',
      nickname: wallet?.nickname ?? '',
      network: wallet?.network ?? 'ethereum',
      address: wallet?.address ?? '',
      provider: wallet?.provider ?? 'walletconnect',
      ens: wallet?.ens ?? '',
    }),
    [errors, setErrors] = useState<Record<string, string>>({})
  useEffect(() => {
    if (inline) document.getElementById('wallet-displayName')?.focus()
  }, [inline])
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (update.isPending) return
    const next = walletErrors(fields as CheckoutWallet)
    if (
      fields.displayName.trim().length < 2 ||
      fields.displayName.trim().length > 60
    )
      next.displayName = 'Use de 2 a 60 caracteres.'
    if (fields.nickname.trim().length < 2 || fields.nickname.trim().length > 40)
      next.nickname = 'Use de 2 a 40 caracteres.'
    setErrors(next)
    if (Object.keys(next).length) {
      document.getElementById(`wallet-${Object.keys(next)[0]}`)?.focus()
      return
    }
    update.mutate(
      { action: 'save', id: wallet?.id, data: fields as Partial<WalletRecord> },
      { onSuccess: close },
    )
  }
  const change = (key: keyof typeof fields, value: string) =>
    setFields((previous) => ({ ...previous, [key]: value }))
  const form = (
    <form className={inline ? 'wallet-inline-form' : undefined} onSubmit={submit} noValidate>
        <div className="account-fields">
          <AccountField
            id="wallet-displayName"
            label="Nome da carteira"
            value={fields.displayName}
            onChange={(value) => change('displayName', value)}
            error={errors.displayName}
          />
          <AccountField
            id="wallet-nickname"
            label="Apelido"
            value={fields.nickname}
            onChange={(value) => change('nickname', value)}
            error={errors.nickname}
          />
          <div className="account-field">
            <label htmlFor="wallet-network">Rede</label>
            <select
              id="wallet-network"
              value={fields.network}
              onChange={(event) => change('network', event.target.value)}
              aria-invalid={!!errors.network}
            >
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
              <option value="solana">Solana</option>
            </select>
            {errors.network && <p role="alert">{errors.network}</p>}
          </div>
          <div className="account-field">
            <label htmlFor="wallet-provider">Provedor</label>
            <select
              id="wallet-provider"
              value={fields.provider}
              onChange={(event) => change('provider', event.target.value)}
              aria-invalid={!!errors.provider}
            >
              <option value="walletconnect">WalletConnect</option>
              <option value="metamask">MetaMask</option>
              <option value="coinbase">Coinbase Wallet</option>
            </select>
            {errors.provider && <p role="alert">{errors.provider}</p>}
          </div>
          <AccountField
            id="wallet-address"
            label="Endereço"
            value={fields.address}
            onChange={(value) => change('address', value)}
            error={errors.address}
          />
          <AccountField
            id="wallet-ens"
            label="ENS"
            value={fields.ens}
            onChange={(value) => change('ens', value)}
            error={errors.ens}
            optional
          />
        </div>
        <p className="account-help">
          Validação de formato. Nenhuma conexão ou transação blockchain.
        </p>
        {update.isError && (
          <p role="alert" className="account-error">
            {update.error.message}
          </p>
        )}
        <div className="account-actions">
          <SecondaryButton
            type="button"
            disabled={update.isPending}
            onClick={close}
          >
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={update.isPending}>
            {update.isPending ? 'Salvando…' : 'Salvar carteira'}
          </PrimaryButton>
        </div>
      </form>
  )
  if (inline)
    return (
      <section className="wallet-editor-inline" aria-labelledby="wallet-editor-title">
        <div className="wallet-editor-heading">
          <div>
            <h2 id="wallet-editor-title">
              {wallet ? 'Editar carteira' : 'Carteira principal ou secundária'}
            </h2>
            <p>Cadastre um endereço compatível com a rede selecionada.</p>
          </div>
          <span>{wallet?.isPrimary ? 'Principal' : 'Nova carteira'}</span>
        </div>
        {form}
      </section>
    )
  return (
    <AccountDialog
      title={wallet ? 'Editar carteira' : 'Cadastrar carteira'}
      close={close}
      busy={update.isPending}
    >
      {form}
    </AccountDialog>
  )
}
export function WalletsPage() {
  const query = useWallets(),
    update = useWalletMutation(),
    [editing, setEditing] = useState<WalletRecord | 'new' | null>(null),
    [removing, setRemoving] = useState<WalletRecord | null>(null),
    search = useSearch({ strict: false }) as { returnTo?: string }
  return (
    <AccountLayout title="Carteiras">
      <p className="account-help">
        Gerencie suas carteiras principal e secundárias. Não informe chaves
        privadas ou seed phrases.
      </p>
      <PrimaryButton data-account-focus onClick={() => setEditing('new')}>
        Cadastrar carteira
      </PrimaryButton>
      {search.returnTo && (
        <Link className="return-checkout" to={safeReturnTo(search.returnTo)}>
          Voltar ao checkout
        </Link>
      )}
      {editing === 'new' && (
        <WalletEditor inline close={() => setEditing(null)} />
      )}
      {query.isPending ? (
        <p role="status">Carregando carteiras…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <SecondaryButton onClick={() => void query.refetch()}>
            Tentar carregar carteiras
          </SecondaryButton>
        </div>
      ) : query.data.items.length ? (
        <div className="wallet-records">
          {query.data.items.map((wallet) => (
            <article
              className="wallet-record"
              key={wallet.id}
              aria-label={`Carteira ${wallet.nickname}`}
            >
              <div className="wallet-record-title">
                <h2>{wallet.displayName}</h2>
                <span>{wallet.isPrimary ? 'Principal' : 'Secundária'}</span>
              </div>
              <dl className="wallet-meta">
                <div>
                  <dt>Apelido</dt>
                  <dd>{wallet.nickname}</dd>
                </div>
                <div>
                  <dt>Rede / provedor</dt>
                  <dd>
                    {wallet.network} / {wallet.provider}
                  </dd>
                </div>
                <div>
                  <dt>Endereço</dt>
                  <dd>{wallet.address}</dd>
                </div>
                {wallet.ens && (
                  <div>
                    <dt>ENS</dt>
                    <dd>{wallet.ens}</dd>
                  </div>
                )}
              </dl>
              <div className="account-actions">
                <SecondaryButton onClick={() => setEditing(wallet)}>
                  Editar {wallet.nickname}
                </SecondaryButton>
                {!wallet.isPrimary && (
                  <SecondaryButton
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({ action: 'primary', id: wallet.id })
                    }
                  >
                    Definir {wallet.nickname} como principal
                  </SecondaryButton>
                )}
                <SecondaryButton
                  onClick={() => {
                    update.reset()
                    setRemoving(wallet)
                  }}
                >
                  Remover {wallet.nickname}
                </SecondaryButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="account-section">
          Você ainda não tem carteiras cadastradas.
        </p>
      )}
      {update.isError && !removing && (
        <p role="alert" className="account-error">
          {update.error.message}
        </p>
      )}
      {update.isSuccess && <p role="status">Carteiras atualizadas.</p>}
      {editing && editing !== 'new' && (
        <WalletEditor
          wallet={editing}
          inline
          close={() => setEditing(null)}
        />
      )}
      {removing && (
        <AccountDialog
          title="Remover carteira"
          close={() => setRemoving(null)}
          busy={update.isPending}
        >
          <p>
            Remover a carteira {removing.nickname}? Os comprovantes anteriores
            serão preservados.
          </p>
          {update.isError && (
            <p role="alert" className="account-error">
              {update.error.message}
            </p>
          )}
          <div className="account-actions">
            <SecondaryButton
              disabled={update.isPending}
              onClick={() => setRemoving(null)}
            >
              Cancelar
            </SecondaryButton>
            <PrimaryButton
              disabled={update.isPending}
              onClick={() =>
                update.mutate(
                  { action: 'remove', id: removing.id },
                  { onSuccess: () => setRemoving(null) },
                )
              }
            >
              Confirmar remoção
            </PrimaryButton>
          </div>
        </AccountDialog>
      )}
    </AccountLayout>
  )
}
