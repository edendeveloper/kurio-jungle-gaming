import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { AccountField } from '@/components/ui/account-field'
import { keepDialogFocus } from '@/components/ui/dialog-focus'
import { HomePage } from '@/features/marketplace/home-page'
import { ApiError } from '@/lib/api/client'
import { useAuthAction } from './session'
import { validateCredentials, safeReturnTo, publicReturnTo } from './validation'
import '../profile/styles.css'

function AuthBackdrop() {
  return (
    <div className="auth-market-backdrop" aria-hidden="true" inert>
      <HomePage />
    </div>
  )
}

export function AuthPage({
  mode,
  returnTo,
  reason,
}: {
  mode: 'login' | 'register'
  returnTo: string
  reason?: string
}) {
  return <AuthForm key={mode} mode={mode} returnTo={returnTo} reason={reason} />
}
function AuthForm({
  mode,
  returnTo,
  reason,
}: {
  mode: 'login' | 'register'
  returnTo: string
  reason?: string
}) {
  const register = mode === 'register',
    navigate = useNavigate(),
    action = useAuthAction(mode),
    demo = useAuthAction('demo')
  const [input, setInput] = useState({
      email: '',
      username: '',
      password: '',
      confirmation: '',
    }),
    [errors, setErrors] = useState<Record<string, string>>({})
  const submitting = useRef(false)
  const change = (key: keyof typeof input, value: string) =>
    setInput((previous) => ({ ...previous, [key]: value }))
  const busy = action.isPending || demo.isPending
  const dialog = useRef<HTMLDialogElement>(null)
  const dismiss = () => {
    if (!busy)
      void navigate({ to: publicReturnTo(returnTo), replace: true }).then(
        () => {
          document.getElementById('main')?.focus()
        },
      )
  }
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const validation = validateCredentials(input, register)
    setErrors(validation)
    if (Object.keys(validation).length) {
      document.getElementById(`auth-${Object.keys(validation)[0]}`)?.focus()
      return
    }
    submitting.current = true
    try {
      await action.mutateAsync(input)
      setInput({ email: '', username: '', password: '', confirmation: '' })
      await navigate({ to: safeReturnTo(returnTo), replace: true })
    } catch (error) {
      if (
        error instanceof ApiError &&
        ['EMAIL_TAKEN', 'USERNAME_TAKEN', 'INVALID_CREDENTIALS'].includes(
          error.code ?? '',
        )
      ) {
        setErrors({
          [error.code === 'EMAIL_TAKEN'
            ? 'email'
            : error.code === 'USERNAME_TAKEN'
              ? 'username'
              : 'password']: error.message,
        })
      }
      setInput((previous) => ({ ...previous, password: '', confirmation: '' }))
      document.getElementById('auth-password')?.focus()
    } finally {
      submitting.current = false
    }
  }
  return (
    <section className={`auth-page ${register ? 'auth-register' : ''}`}>
      <AuthBackdrop />
      <dialog
        ref={dialog}
        className="auth-panel"
        aria-labelledby="auth-title"
        onKeyDown={keepDialogFocus}
        onCancel={(event) => {
          event.preventDefault()
          dismiss()
        }}
      >
        <button
          type="button"
          className="auth-close"
          aria-label="Fechar autenticação"
          disabled={busy}
          onClick={dismiss}
        >
          ×
        </button>
        <Link className="auth-wordmark" to="/" aria-label="KURIO — início">
          KURIO
        </Link>
        <nav className="auth-tabs" aria-label="Acesso à conta">
          <Link
            to="/login"
            search={{ returnTo, reason: undefined }}
            aria-current={!register ? 'page' : undefined}
          >
            Entrar
          </Link>
          <span aria-hidden="true">|</span>
          <Link
            to="/register"
            search={{ returnTo, reason: undefined }}
            aria-current={register ? 'page' : undefined}
          >
            Criar conta
          </Link>
        </nav>
        <h1 id="auth-title">
          {register ? 'Criar perfil de colecionador' : 'Entrar'}
        </h1>
        <p className="auth-description">
          {register
            ? 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'
            : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}
        </p>
        {reason && (
          <p role="status" className="account-notice">
            {reason === 'password-changed'
              ? 'Senha alterada. Entre novamente com a nova senha.'
              : 'Sua sessão expirou. Entre novamente para retomar o fluxo.'}
          </p>
        )}
        <form onSubmit={(event) => void submit(event)} noValidate>
          <div className="auth-fields">
            {register && (
              <AccountField
                id="auth-username"
                label="Nome de usuário"
                value={input.username}
                onChange={(value) => change('username', value)}
                error={errors.username}
                autoComplete="username"
                hideLabel
              />
            )}
            <AccountField
              id="auth-email"
              label="E-mail"
              type="email"
              value={input.email}
              onChange={(value) => change('email', value)}
              error={errors.email}
              autoComplete="email"
              hideLabel
            />
            <AccountField
              id="auth-password"
              label="Senha"
              type="password"
              value={input.password}
              onChange={(value) => change('password', value)}
              error={errors.password}
              autoComplete={register ? 'new-password' : 'current-password'}
              hideLabel
            />
            {register && (
              <AccountField
                id="auth-confirmation"
                label="Confirmar senha"
                type="password"
                value={input.confirmation}
                onChange={(value) => change('confirmation', value)}
                error={errors.confirmation}
                autoComplete="new-password"
                hideLabel
              />
            )}
          </div>
          {!register && (
            <button
              className="forgot-password"
              type="button"
              disabled
              title="Recuperação de senha indisponível nesta demonstração"
            >
              Esqueceu a senha? (indisponível)
            </button>
          )}
          {action.isError &&
            !Object.values(errors).includes(action.error.message) && (
              <p role="alert" className="account-error">
                {action.error.message}
              </p>
            )}
          <PrimaryButton type="submit" className="auth-submit" disabled={busy}>
            {action.isPending
              ? 'Enviando…'
              : register
                ? 'Criar conta'
                : 'Entrar'}
          </PrimaryButton>
        </form>
        <div className="auth-social">
          <p>ou continue com</p>
          <div>
            <SecondaryButton
              disabled
              title="OAuth indisponível na demonstração"
            >
              Google
            </SecondaryButton>
            <SecondaryButton
              disabled
              title="OAuth indisponível na demonstração"
            >
              Facebook
            </SecondaryButton>
          </div>
          <small>Provedores externos indisponíveis na demonstração.</small>
        </div>
        <p className="auth-switch">
          {register ? 'Já tem uma conta? ' : 'Novo na Kurio? '}
          <Link
            to={register ? '/login' : '/register'}
            search={{ returnTo, reason: undefined }}
          >
            {register ? 'Entrar' : 'Crie uma conta'}
          </Link>
        </p>
        <SecondaryButton
          className="auth-guest"
          disabled={busy}
          onClick={dismiss}
        >
          Continuar explorando sem entrar
        </SecondaryButton>
        {!register && import.meta.env.DEV && (
          <div className="demo-login">
            <SecondaryButton
              disabled={busy}
              onClick={() =>
                demo.mutate(undefined, {
                  onSuccess: () =>
                    void navigate({
                      to: safeReturnTo(returnTo),
                      replace: true,
                    }),
                })
              }
            >
              Entrar como Nova (conta fictícia de teste)
            </SecondaryButton>
            {demo.isError && (
              <p role="alert" className="account-error">
                {demo.error.message}
              </p>
            )}
            <small>
              Conta fictícia Nova. Nenhum acesso a serviços externos.
            </small>
          </div>
        )}
      </dialog>
    </section>
  )
}
