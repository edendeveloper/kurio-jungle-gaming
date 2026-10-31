import { Link } from '@tanstack/react-router'
import { UserRound, Wallet, LogOut } from 'lucide-react'
import { useAuthAction } from '@/features/auth/session'
import type { ReactNode } from 'react'
import './styles.css'
export function AccountLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const logout = useAuthAction('logout')
  return (
    <div className="account-layout">
      <aside className="account-sidebar">
        <h2>Meu perfil</h2>
        <nav aria-label="Conta do colecionador">
          <Link
            to="/profile"
            activeOptions={{ exact: true }}
            activeProps={{ 'aria-current': 'page' }}
          >
            <UserRound size={18} />
            Detalhes do perfil
          </Link>
          <Link to="/profile/wallets" activeProps={{ 'aria-current': 'page' }}>
            <Wallet size={18} />
            Carteiras
          </Link>
          <button disabled title="Fora do escopo">
            Atividade
          </button>
          <button disabled title="Fora do escopo">
            Ofertas
          </button>
          <button disabled title="Fora do escopo">
            Downloads
          </button>
          <button
            type="button"
            disabled={logout.isPending}
            onClick={() => logout.mutate(undefined)}
          >
            <LogOut size={18} />
            {logout.isPending ? 'Saindo…' : 'Sair'}
          </button>
        </nav>
        {logout.isError && (
          <p role="alert" className="account-error">
            {logout.error.message}
          </p>
        )}
      </aside>
      <section className="account-content">
        <h1>{title}</h1>
        {children}
      </section>
    </div>
  )
}
