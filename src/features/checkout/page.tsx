import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/api'
import { nftImageSrcSet } from '@/lib/nft-image'
import type { CartResponse } from '@/types/collector'
import type {
  CheckoutPayload,
  CheckoutWallet,
  CollectorData,
  PurchaseOrder,
} from '@/types/checkout'
import { FinancialSummary } from './components/financial-summary'
import {
  SavedWalletPicker,
  WalletProviderPicker,
} from './components/wallet-selection'
import { validateCheckout } from './validation'
import {
  clearAttempt,
  readAttempt,
  saveAttempt,
  useActiveOrder,
  useAttemptOrder,
  useCreateOrder,
  useOrder,
  useQuote,
  useWallets,
  type CheckoutAttempt,
} from './api'
import './styles.css'

function SessionGate() {
  return (
    <div className="commerce-state">
      <h2>Entre para continuar</h2>
      <p>
        Entre ou crie uma conta para finalizar. Seu carrinho está preservado.
      </p>
      <PrimaryButton asChild>
        <Link to="/login" search={{ returnTo: '/checkout', reason: undefined }}>
          Entrar
        </Link>
      </PrimaryButton>
    </div>
  )
}

function CheckoutInput({
  name,
  label,
  value,
  change,
  error,
  type = 'text',
  optional = false,
}: {
  name: string
  label: string
  value: string
  change: (value: string) => void
  error?: string
  type?: 'text' | 'email'
  optional?: boolean
}) {
  return (
    <div className="checkout-field">
      <label htmlFor={`checkout-${name}`}>
        {label}
        {optional && ' (opcional)'}
      </label>
      <input
        id={`checkout-${name}`}
        type={type}
        value={value}
        onChange={(event) => change(event.target.value)}
        aria-required={!optional}
        aria-invalid={!!error}
        aria-describedby={error ? `error-${name}` : undefined}
      />
      <FieldError name={name} error={error} />
    </div>
  )
}
function FieldError({ name, error }: { name: string; error?: string }) {
  return error ? (
    <p id={`error-${name}`} role="alert" className="commerce-error">
      {error}
    </p>
  ) : null
}

function AttemptRecovery({
  attempt,
  review,
}: {
  attempt: CheckoutAttempt
  review: () => void
}) {
  const existing = useAttemptOrder(attempt),
    create = useCreateOrder(),
    navigate = useNavigate()
  return (
    <div className="commerce-state">
      <h2>Retomar tentativa de compra</h2>
      <p>
        A confirmação será consultada na API. Nenhum sucesso é presumido após
        uma falha de comunicação.
      </p>
      {existing.isPending ? (
        <p aria-live="polite">Consultando tentativa…</p>
      ) : existing.data ? (
        <PrimaryButton asChild>
          <Link to="/checkout/success" search={{ orderId: existing.data.id }}>
            Consultar pedido
          </Link>
        </PrimaryButton>
      ) : (
        <>
          <p className="commerce-error" role="alert">
            {existing.error?.message}
          </p>
          <PrimaryButton
            disabled={create.isPending}
            onClick={() =>
              create.mutate(attempt, {
                onSuccess: (order) =>
                  void navigate({
                    to: '/checkout/success',
                    search: { orderId: order.id },
                  }),
              })
            }
          >
            {create.isPending ? 'Recuperando…' : 'Recuperar tentativa'}
          </PrimaryButton>
          <SecondaryButton disabled={create.isPending} onClick={review}>
            Revisar dados e cotação
          </SecondaryButton>
        </>
      )}
      {create.isError && (
        <p className="commerce-error" role="alert">
          {create.error.message}
        </p>
      )}
    </div>
  )
}

function CheckoutForm({
  cart,
  userId,
}: {
  cart: CartResponse
  userId: string
}) {
  const client = useQueryClient(),
    navigate = useNavigate()
  const [form, setForm] = useState<CheckoutPayload>(() => {
    const stored = sessionStorage.getItem(`kurio:checkout-draft:${userId}`)
    if (stored) {
      try {
        const value = JSON.parse(stored)
        if (value.collector && value.wallet) return value as CheckoutPayload
      } catch {
        /* invalid draft */
      }
    }
    return {
      quoteId: '',
      collector: {
        displayName: '',
        username: '',
        email: '',
        profile: '',
        notes: '',
      },
      wallet: {
        address: '',
        network: cart.items[0].nft.network,
        provider: 'walletconnect',
        ens: '',
      },
    }
  })
  useEffect(() => {
    sessionStorage.setItem(
      `kurio:checkout-draft:${userId}`,
      JSON.stringify(form),
    )
  }, [form, userId])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submissionError, setSubmissionError] = useState('')
  const [acceptedQuoteId, setAcceptedQuoteId] = useState('')
  const previousQuoteFingerprint = useRef<string | null>(null)
  const [attempt, setAttempt] = useState<CheckoutAttempt | null>(() => {
    const value = readAttempt(userId)
    return value?.userId === userId ? value : null
  })
  const submitting = useRef(false)
  const quote = useQuote(userId, cart.version, form.wallet.network)
  useEffect(() => {
    if (!quote.data) return
    const fingerprint = JSON.stringify({
      cartVersion: quote.data.cartVersion,
      totals: quote.data.totals,
      coupon: quote.data.coupon,
      network: quote.data.network,
      items: quote.data.items.map((item) => [
        item.nftId,
        item.edition,
        item.quantity,
        item.nft.priceEth,
        item.nft.availability,
      ]),
    })
    if (
      previousQuoteFingerprint.current === null ||
      previousQuoteFingerprint.current === fingerprint
    )
      setAcceptedQuoteId(quote.data.id)
    else setAcceptedQuoteId('')
    previousQuoteFingerprint.current = fingerprint
  }, [quote.data])
  const wallets = useWallets(userId),
    create = useCreateOrder(),
    active = useActiveOrder(userId)
  const changeCollector = (key: keyof CollectorData, value: string) =>
    setForm((previous) => ({
      ...previous,
      collector: { ...previous.collector, [key]: value },
    }))
  const changeWallet = (key: keyof CheckoutWallet, value: string) =>
    setForm((previous) => ({
      ...previous,
      wallet: { ...previous.wallet, savedWalletId: undefined, [key]: value },
    }))
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const validated = validateCheckout({
      ...form,
      quoteId: quote.data?.id ?? '',
    })
    setErrors(validated.errors)
    setSubmissionError('')
    if (!validated.data) {
      document
        .getElementById(`checkout-${Object.keys(validated.errors)[0]}`)
        ?.focus()
      return
    }
    if (!quote.data || quote.isFetching) return
    if (acceptedQuoteId !== quote.data.id) {
      setSubmissionError('Os valores foram atualizados. Revise e aceite a nova cotaÃ§Ã£o antes de confirmar.')
      return
    }
    submitting.current = true
    const next = { key: crypto.randomUUID(), userId, body: validated.data }
    saveAttempt(next)
    try {
      const order = await create.mutateAsync(next)
      await navigate({ to: '/checkout/success', search: { orderId: order.id } })
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status &&
        error.status !== 401 &&
        error.status >= 400 &&
        error.status < 500
      ) {
        clearAttempt(userId)
        setSubmissionError(error.message)
        await client.invalidateQueries({ queryKey: ['cart'] })
        await quote.refetch()
        await active.refetch()
      } else {
        setAttempt(next)
      }
    } finally {
      submitting.current = false
    }
  }
  if (attempt)
    return (
      <AttemptRecovery
        attempt={attempt}
        review={() => {
          clearAttempt(userId)
          setAttempt(null)
          void quote.refetch()
        }}
      />
    )
  if (active.data?.order)
    return (
      <div className="commerce-state">
        <h2>
          {active.data.order.status === 'processing'
            ? 'Você tem um pedido em processamento'
            : active.data.order.status === 'confirmed'
              ? 'Seu pedido já foi confirmado'
              : 'Sua última tentativa não foi confirmada'}
        </h2>
        <PrimaryButton asChild>
          <Link
            to="/checkout/success"
            search={{ orderId: active.data.order.id }}
          >
            Retomar pedido
          </Link>
        </PrimaryButton>
      </div>
    )
  return (
    <>
      {submissionError && (
        <p className="commerce-error" role="alert">
          {submissionError} Confirme novamente somente após revisar os valores.
        </p>
      )}
      <div className="commerce-columns checkout-columns">
        <form
          id="checkout-form"
          noValidate
          onSubmit={(event) => void submit(event)}
        >
          <fieldset className="checkout-section">
            <legend>Dados do colecionador</legend>
            <div className="checkout-fields">
              <CheckoutInput
                name="displayName"
                label="Nome de exibição"
                value={form.collector.displayName}
                change={(value) => changeCollector('displayName', value)}
                error={errors.displayName}
              />
              <CheckoutInput
                name="username"
                label="Nome de usuário"
                value={form.collector.username}
                change={(value) => changeCollector('username', value)}
                error={errors.username}
              />
              <CheckoutInput
                name="email"
                label="E-mail"
                type="email"
                value={form.collector.email}
                change={(value) => changeCollector('email', value)}
                error={errors.email}
              />
              <CheckoutInput
                name="profile"
                label="Perfil"
                value={form.collector.profile ?? ''}
                change={(value) => changeCollector('profile', value)}
                error={errors.profile}
                optional
              />
            </div>
          </fieldset>
          <fieldset className="checkout-section">
            <legend>Rede e carteira</legend>
            <Link to="/profile/wallets" search={{ returnTo: '/checkout' }}>
              Gerenciar ou cadastrar carteira
            </Link>
            <p className="commerce-hint">
              Validação de formato apenas. Nunca informe seed phrase ou chave
              privada.
            </p>
            <div className="checkout-fields">
              <div className="checkout-field">
                <label htmlFor="checkout-network">Rede blockchain</label>
                <select
                  id="checkout-network"
                  value={form.wallet.network}
                  onChange={(event) =>
                    changeWallet('network', event.target.value)
                  }
                  aria-invalid={!!errors.network}
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="polygon">Polygon</option>
                  <option value="solana">Solana</option>
                </select>
                <FieldError name="network" error={errors.network} />
              </div>
              <div className="wallet-selection-fields">
                {wallets.isPending && (
                  <p aria-live="polite">Carregando carteiras…</p>
                )}
                <SavedWalletPicker
                  items={wallets.data?.items ?? []}
                  selected={form.wallet.savedWalletId}
                  onChange={(saved) =>
                    setForm((previous) => ({
                      ...previous,
                      wallet: saved
                        ? {
                            address: saved.address,
                            provider: saved.provider,
                            network: saved.network,
                            ens: saved.ens ?? '',
                            savedWalletId: saved.id,
                          }
                        : { ...previous.wallet, savedWalletId: undefined },
                    }))
                  }
                />
                {wallets.isError && (
                  <p className="commerce-error">
                    Não foi possível consultar carteiras salvas. Informe uma
                    carteira ou{' '}
                    <button
                      type="button"
                      onClick={() => void wallets.refetch()}
                    >
                      tente novamente
                    </button>
                    .
                  </p>
                )}
                <WalletProviderPicker
                  selected={form.wallet.provider}
                  onChange={(value) => changeWallet('provider', value)}
                  error={errors.provider}
                />
              </div>
              <CheckoutInput
                name="address"
                label="Endereço da carteira"
                value={form.wallet.address}
                change={(value) => changeWallet('address', value)}
                error={errors.address}
              />
              <CheckoutInput
                name="ens"
                label="ENS"
                value={form.wallet.ens ?? ''}
                change={(value) => changeWallet('ens', value)}
                error={errors.ens}
                optional
              />
            </div>
            <p className="commerce-hint">
              Origem:{' '}
              {form.wallet.savedWalletId
                ? 'carteira salva selecionada'
                : 'endereço informado manualmente'}{' '}
              · {form.wallet.network}
            </p>
          </fieldset>
          <div className="checkout-field">
            <label htmlFor="checkout-notes">Observações (opcional)</label>
            <textarea
              id="checkout-notes"
              value={form.collector.notes ?? ''}
              maxLength={500}
              onChange={(event) => changeCollector('notes', event.target.value)}
            />
            <FieldError name="notes" error={errors.notes} />
          </div>
          <Link to="/cart" className="continue-exploring">
            ← Revisar carrinho
          </Link>
        </form>
        <aside>
          <div className="checkout-item-list">
            <h2>Seus NFTs</h2>
            {cart.items.map((item) => (
              <div key={`${item.nftId}:${item.edition}`}>
                <img
                  src={item.nft.imageUrl}
                  srcSet={nftImageSrcSet(item.nft.imageUrl)}
                  sizes="56px"
                  alt={item.nft.imageAlt}
                  width="56"
                  height="56"
                />
                <p>
                  {item.nft.name}
                  <small>
                    Quantidade: {item.quantity} · Edição {item.edition}/
                    {item.nft.totalEditions}
                  </small>
                </p>
                <strong>{item.subtotalEth} ETH</strong>
              </div>
            ))}
          </div>
          {quote.isPending ? (
            <div className="commerce-loading" aria-live="polite">
              Calculando cotação…
            </div>
          ) : quote.isError ? (
            <div className="commerce-state" role="alert">
              <p>{quote.error.message}</p>
              <SecondaryButton onClick={() => void quote.refetch()}>
                Atualizar cotação
              </SecondaryButton>
            </div>
          ) : (
            <FinancialSummary
              totals={quote.data.totals}
              coupon={quote.data.coupon}
            >
              <p className="commerce-hint">
                Cotação válida por dois minutos. O servidor revalida tudo antes
                de confirmar.
              </p>
              {acceptedQuoteId !== quote.data.id && (
                <div role="alert" className="commerce-error">
                  <p>O preÃ§o ou a disponibilidade mudou. Revise os valores atualizados.</p>
                  <SecondaryButton onClick={() => setAcceptedQuoteId(quote.data.id)}>
                    Aceitar valores atualizados
                  </SecondaryButton>
                </div>
              )}
              <PrimaryButton
                className="commerce-primary-action"
                type="submit"
                form="checkout-form"
                disabled={create.isPending || quote.isFetching || acceptedQuoteId !== quote.data.id}
              >
                {create.isPending ? 'Enviando pedido…' : 'Confirmar compra'}
              </PrimaryButton>
            </FinancialSummary>
          )}
        </aside>
      </div>
    </>
  )
}

export function CheckoutPage() {
  const cart = useCart(),
    session = useSession()
  return (
    <section className="commerce-page checkout-page">
      <Breadcrumbs
        items={[
          { label: 'Início', to: '/' },
          { label: 'Carrinho', to: '/cart' },
          { label: 'Pagamento' },
        ]}
      />
      <h1>Checkout</h1>
      {cart.isPending || session.isPending ? (
        <p aria-live="polite">Carregando checkout…</p>
      ) : cart.isError || session.isError ? (
        <div className="commerce-state" role="alert">
          <p>Não foi possível preparar o checkout.</p>
          <PrimaryButton
            onClick={() => {
              void cart.refetch()
              void session.refetch()
            }}
          >
            Tentar novamente
          </PrimaryButton>
        </div>
      ) : !session.data.user ? (
        <SessionGate />
      ) : !cart.data.items.length && !readAttempt(session.data?.user?.id) ? (
        <div className="commerce-state">
          <h2>Não é possível finalizar um carrinho vazio.</h2>
          <Link to="/marketplace">Explorar NFTs</Link>
        </div>
      ) : cart.data.items.length ? (
        <CheckoutForm cart={cart.data} userId={session.data.user.id} />
      ) : readAttempt(session.data?.user?.id)?.userId ===
        session.data.user.id ? (
        <AttemptRecovery
          attempt={readAttempt(session.data?.user?.id)!}
          review={() => {
            clearAttempt(session.data?.user?.id)
            void cart.refetch()
          }}
        />
      ) : (
        <div className="commerce-state">
          <p>Seu carrinho está vazio.</p>
          <Link to="/marketplace">Explorar NFTs</Link>
        </div>
      )}
    </section>
  )
}

function compactReceiptId(value: string) {
  if (value.length <= 18) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function OrderReceipt({ order }: { order: PurchaseOrder }) {
  return (
    <div className="order-card">
      <div className={`order-state-icon ${order.status}`}>
        {order.status === 'confirmed' ? (
          <CheckCircle2 size={52} />
        ) : order.status === 'rejected' ? (
          <XCircle size={52} />
        ) : (
          <Clock3 size={52} />
        )}
      </div>
      <h2>
        {order.status === 'confirmed'
          ? 'Compra confirmada'
          : order.status === 'rejected'
            ? 'Compra não confirmada'
            : 'Pedido em processamento'}
      </h2>
      <p aria-live="polite">
        {order.status === 'confirmed'
          ? 'Seus NFTs foram confirmados nesta simulação.'
          : order.status === 'rejected'
            ? order.reason
            : 'Aguardando a confirmação da API. Você pode recarregar esta página.'}
      </p>
      <dl className="order-info">
        <div>
          <dt>Pedido</dt>
          <dd aria-label={order.id} title={order.id}>
            {compactReceiptId(order.id)}
          </dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{order.status}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>
            {new Date(order.confirmedAt ?? order.createdAt).toLocaleString(
              'pt-BR',
              { timeZone: 'UTC' },
            )}{' '}
            UTC
          </dd>
        </div>
        <div>
          <dt>Carteira</dt>
          <dd aria-label={order.wallet.address} title={order.wallet.address}>
            {compactReceiptId(order.wallet.address)}
          </dd>
        </div>
        <div>
          <dt>Rede / provedor</dt>
          <dd>
            {order.wallet.network} / {order.wallet.provider}
          </dd>
        </div>
        {order.simulatedTransactionId && (
          <div>
            <dt>Transação simulada</dt>
            <dd
              aria-label={order.simulatedTransactionId}
              title={order.simulatedTransactionId}
            >
              {compactReceiptId(order.simulatedTransactionId)}
            </dd>
          </div>
        )}
      </dl>
      <div className="receipt-items">
        {order.items.map((item) => (
          <article key={`${item.nftId}:${item.edition}`}>
            <img
              src={item.nft.imageUrl}
              srcSet={nftImageSrcSet(item.nft.imageUrl)}
              sizes="64px"
              alt={item.nft.imageAlt}
              width="64"
              height="64"
            />
            <div>
              <h3>{item.nft.name}</h3>
              <p>
                Token #{item.nft.tokenId} · Edição {item.edition}/
                {item.nft.totalEditions}
              </p>
              <p>
                Quantidade: {item.quantity} · Unitário: {item.nft.priceEth} ETH
              </p>
              <p>Subtotal: {item.subtotalEth} ETH</p>
            </div>
          </article>
        ))}
      </div>
      <FinancialSummary totals={order.totals} coupon={order.coupon} />
      <p className="commerce-hint">
        Comprovante de demonstração. Não há transação real ou link de explorador
        blockchain.
      </p>
      <SecondaryButton asChild>
        <Link to={order.status === 'rejected' ? '/cart' : '/marketplace'}>
          {order.status === 'rejected'
            ? 'Revisar carrinho'
            : 'Continuar explorando'}
        </Link>
      </SecondaryButton>
    </div>
  )
}

export function CheckoutSuccessPage({ orderId }: { orderId?: string }) {
  const session = useSession(),
    client = useQueryClient()
  const order = useOrder(orderId, session.data?.user?.id)
  useEffect(() => {
    if (order.data && order.data.status !== 'processing') {
      if (
        readAttempt(session.data?.user?.id)?.key === order.data.idempotencyKey
      )
        clearAttempt(session.data?.user?.id)
      void client.invalidateQueries({ queryKey: ['cart'] })
      void client.invalidateQueries({ queryKey: ['nfts'] })
      void client.invalidateQueries({ queryKey: ['nft'] })
      void client.invalidateQueries({ queryKey: ['nft-related'] })
    }
  }, [order.data, client, session.data?.user?.id])
  return (
    <section className="commerce-page confirmation-page">
      <h1>Confirmação de pedido</h1>
      {!orderId ? (
        <div className="commerce-state">
          <h2>Nenhum pedido informado.</h2>
          <Link to="/cart">Voltar ao carrinho</Link>
        </div>
      ) : session.isPending ? (
        <p>Consultando sessão…</p>
      ) : session.isError ? (
        <div role="alert">
          <p>Não foi possível consultar a sessão.</p>
          <PrimaryButton onClick={() => void session.refetch()}>
            Tentar novamente
          </PrimaryButton>
        </div>
      ) : !session.data.user ? (
        <SessionGate />
      ) : order.isPending ? (
        <p aria-live="polite">Consultando pedido…</p>
      ) : order.isError ? (
        <div className="commerce-state" role="alert">
          <h2>Pedido indisponível</h2>
          <p>{order.error.message}</p>
          <SecondaryButton onClick={() => void order.refetch()}>
            Consultar novamente
          </SecondaryButton>
          <Link to="/cart">Voltar ao carrinho</Link>
        </div>
      ) : order.data ? (
        <OrderReceipt order={order.data} />
      ) : null}
    </section>
  )
}
