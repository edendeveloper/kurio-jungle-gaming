import { Link } from '@tanstack/react-router'
import {
  Activity,
  Download,
  Heart,
  LifeBuoy,
  LogOut,
  Tag,
  UserRound,
  Wallet,
} from 'lucide-react'
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
            Dados do perfil
          </Link>
          <Link to="/profile/wallets" activeProps={{ 'aria-current': 'page' }}>
            <Wallet size={18} />
            Carteiras
          </Link>
          <button disabled title="Indisponível nesta demonstração">
            <Activity size={18} aria-hidden="true" />
            Atividade
            <span className="account-item-status">Indisponível</span>
          </button>
          <Link
            to="/profile/favorites"
            activeProps={{ 'aria-current': 'page' }}
          >
            <Heart size={18} aria-hidden="true" />
            Lista de interesse
          </Link>
          <button disabled title="Indisponível nesta demonstração">
            <Tag size={18} aria-hidden="true" />
            Ofertas
            <span className="account-item-status">Indisponível</span>
          </button>
          <button disabled title="Indisponível nesta demonstração">
            <Download size={18} aria-hidden="true" />
            Arquivos baixados
            <span className="account-item-status">Indisponível</span>
          </button>
          <button disabled title="Indisponível nesta demonstração">
            <LifeBuoy size={18} aria-hidden="true" />
            Suporte
            <span className="account-item-status">Indisponível</span>
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
