import { useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AccountField } from '@/components/ui/account-field'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import type { CollectorProfile } from '@/types/account'
import { useWallets } from '@/features/wallets/api'
import { validPassword } from '@/features/auth/validation'
import { useProfile, useProfileUpdate } from './api'
import { AccountLayout } from './layout'
import { validAvatar, validateProfile } from './validation'
import { ApiError } from '@/lib/api/client'

function PasswordForm() {
  const update = useProfileUpdate('password'),
    navigate = useNavigate(),
    submitting = useRef(false)
  const [fields, setFields] = useState({
      currentPassword: '',
      password: '',
      confirmation: '',
    }),
    [errors, setErrors] = useState<Record<string, string>>({})
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const next: Record<string, string> = {}
    if (!fields.currentPassword) next.currentPassword = 'Informe a senha atual.'
    if (!validPassword(fields.password))
      next.password = 'Use de 10 a 128 caracteres, com letra, número e símbolo.'
    if (fields.confirmation !== fields.password)
      next.confirmation = 'As senhas não correspondem.'
    setErrors(next)
    if (Object.keys(next).length) {
      document.getElementById(`profile-${Object.keys(next)[0]}`)?.focus()
      return
    }
    submitting.current = true
    try {
      await update.mutateAsync(fields)
      setFields({ currentPassword: '', password: '', confirmation: '' })
      await navigate({
        to: '/login',
        search: { returnTo: '/profile', reason: 'password-changed' },
        replace: true,
      })
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 'CURRENT_PASSWORD_INVALID'
      )
        setErrors({ currentPassword: error.message })
      setFields({ currentPassword: '', password: '', confirmation: '' })
      document.getElementById('profile-currentPassword')?.focus()
    } finally {
      submitting.current = false
    }
  }
  return (
    <form
      className="account-section"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <h2>Alterar senha</h2>
      <p className="account-help">
        Todas as sessões serão encerradas após a alteração.
      </p>
      <div className="account-fields">
        {(
          [
            ['currentPassword', 'Senha atual'],
            ['password', 'Nova senha'],
            ['confirmation', 'Confirmar nova senha'],
          ] as const
        ).map(([key, label]) => (
          <AccountField
            key={key}
            id={`profile-${key}`}
            label={label}
            type="password"
            value={fields[key]}
            onChange={(value) =>
              setFields((previous) => ({ ...previous, [key]: value }))
            }
            error={errors[key]}
            autoComplete={
              key === 'currentPassword' ? 'current-password' : 'new-password'
            }
          />
        ))}
      </div>
      {update.isError &&
        !Object.values(errors).includes(update.error.message) && (
          <p role="alert" className="account-error">
            {update.error.message}
          </p>
        )}
      <PrimaryButton type="submit" disabled={update.isPending}>
        {update.isPending ? 'Alterando…' : 'Alterar senha'}
      </PrimaryButton>
    </form>
  )
}
function ProfileEditor({ profile }: { profile: CollectorProfile }) {
  const update = useProfileUpdate('profile'),
    avatar = useProfileUpdate('avatar'),
    remove = useProfileUpdate('remove-avatar'),
    wallets = useWallets(profile.id)
  const [fields, setFields] = useState({
      displayName: profile.displayName,
      username: profile.username,
      email: profile.email,
    }),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [notice, setNotice] = useState(''),
    [preview, setPreview] = useState<string | null>(null),
    [avatarError, setAvatarError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null),
    reading = useRef(0),
    submitting = useRef(false)
  const primary = wallets.data?.items.find((wallet) => wallet.isPrimary)
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const next = validateProfile(fields)
    setErrors(next)
    setNotice('')
    if (Object.keys(next).length) {
      document.getElementById(`profile-${Object.keys(next)[0]}`)?.focus()
      return
    }
    submitting.current = true
    try {
      await update.mutateAsync(fields)
      setNotice('Perfil atualizado.')
    } catch (error) {
      if (
        error instanceof ApiError &&
        ['EMAIL_TAKEN', 'USERNAME_TAKEN'].includes(error.code ?? '')
      )
        setErrors({
          [error.code === 'EMAIL_TAKEN' ? 'email' : 'username']: error.message,
        })
    } finally {
      submitting.current = false
    }
  }
  async function selectFile(file?: File) {
    const generation = ++reading.current
    setAvatarError('')
    setPreview(null)
    if (!file) return
    if (
      file.size > 256 * 1024 ||
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    ) {
      setAvatarError('Envie PNG, JPEG ou WebP de até 256 KB.')
      return
    }
    const bytes = new Uint8Array(await file.arrayBuffer()),
      data = `data:${file.type};base64,${btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))}`
    if (generation !== reading.current) return
    if (!validAvatar(data)) {
      setAvatarError('Imagem inválida. Selecione outro arquivo.')
      return
    }
    setPreview(data)
  }
  return (
    <>
      <div className="profile-overview">
        <form
          onSubmit={(event) => void submit(event)}
          noValidate
          className="account-section"
        >
          <div className="account-fields">
            {(
              [
                ['displayName', 'Nome de exibição'],
                ['username', 'Nome de usuário'],
                ['email', 'E-mail'],
              ] as const
            ).map(([key, label]) => (
              <AccountField
                key={key}
                id={`profile-${key}`}
                label={label}
                type={key === 'email' ? 'email' : 'text'}
                value={fields[key]}
                onChange={(value) =>
                  setFields((previous) => ({ ...previous, [key]: value }))
                }
                error={errors[key]}
              />
            ))}
          </div>
          {update.isError &&
            !Object.values(errors).includes(update.error.message) && (
              <p role="alert" className="account-error">
                {update.error.message}
              </p>
            )}
          {notice && <p role="status">{notice}</p>}
          <PrimaryButton type="submit" disabled={update.isPending}>
            {update.isPending ? 'Salvando…' : 'Salvar perfil'}
          </PrimaryButton>
        </form>
        <section className="account-section" aria-label="Avatar">
          <h2>Avatar</h2>
          <div className="avatar-controls">
            {preview || profile.avatarUrl ? (
              <img
                src={preview ?? profile.avatarUrl!}
                className="profile-avatar"
                alt={preview ? 'Preview do avatar' : 'Avatar do colecionador'}
                width="72"
                height="72"
              />
            ) : (
              <span className="avatar-placeholder" aria-label="Sem avatar">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <label className="avatar-upload">
              Selecionar imagem
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Selecionar avatar"
                onChange={(event) => void selectFile(event.target.files?.[0])}
              />
            </label>
          </div>
          <p className="account-help">
            PNG, JPEG ou WebP, até 256 KB. Armazenamento somente no navegador de
            demonstração.
          </p>
          {avatarError && (
            <p role="alert" className="account-error">
              {avatarError}
            </p>
          )}
          {preview && (
            <SecondaryButton
              disabled={avatar.isPending}
              onClick={() =>
                avatar.mutate(
                  { dataUrl: preview },
                  {
                    onSuccess: () => {
                      setPreview(null)
                      if (fileInput.current) fileInput.current.value = ''
                    },
                  },
                )
              }
            >
              Salvar avatar
            </SecondaryButton>
          )}
          {profile.avatarUrl && (
            <SecondaryButton
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(undefined, {
                  onSuccess: () => {
                    setPreview(null)
                    if (fileInput.current) fileInput.current.value = ''
                  },
                })
              }
            >
              Remover avatar
            </SecondaryButton>
          )}
          {(avatar.isError || remove.isError) && (
            <p role="alert" className="account-error">
              {avatar.error?.message ?? remove.error?.message}
            </p>
          )}
          {avatar.isSuccess && <p role="status">Avatar atualizado.</p>}
          {remove.isSuccess && <p role="status">Avatar removido.</p>}
        </section>
      </div>
      <section className="account-section">
        <h2>Carteira principal</h2>
        {primary ? (
          <dl className="wallet-meta">
            <div>
              <dt>Apelido</dt>
              <dd>{primary.nickname}</dd>
            </div>
            <div>
              <dt>ENS</dt>
              <dd>{primary.ens || 'Não informado'}</dd>
            </div>
            <div>
              <dt>Rede</dt>
              <dd>{primary.network}</dd>
            </div>
          </dl>
        ) : (
          <p>Nenhuma carteira principal cadastrada.</p>
        )}
        <p className="account-help">ENS e apelido pertencem à carteira.</p>
        <Link to="/profile/wallets">Gerenciar carteiras</Link>
      </section>
      <PasswordForm />
    </>
  )
}
export function ProfilePage() {
  const profile = useProfile()
  return (
    <AccountLayout title="Perfil">
      {profile.isPending ? (
        <p role="status">Carregando perfil…</p>
      ) : profile.isError ? (
        <div role="alert">
          <p>{profile.error.message}</p>
          <SecondaryButton onClick={() => void profile.refetch()}>
            Tentar carregar perfil
          </SecondaryButton>
        </div>
      ) : (
        <ProfileEditor key={profile.data.id} profile={profile.data} />
      )}
    </AccountLayout>
  )
}
