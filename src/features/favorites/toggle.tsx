import { Heart } from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useNftFavorite } from './hooks'
import { safeReturnTo } from '@/features/auth/validation'

export function FavoriteToggle({
  nftId,
  name,
  className = 'nft-favorite',
}: {
  nftId: string
  name: string
  className?: string
}) {
  const favorite = useNftFavorite(nftId)
  const navigate = useNavigate()
  const returnTo = useRouterState({
    select: (state) => safeReturnTo(state.location.href),
  })
  const disabled =
    favorite.session.isPending ||
    favorite.session.isError ||
    favorite.mutation.isPending ||
    (!!favorite.session.data?.user &&
      (favorite.favorites.isPending || favorite.favorites.isError))

  return (
    <button
      type="button"
      className={className}
      aria-label={
        favorite.isFavorite
          ? `Remover ${name} da lista de interesse`
          : `Adicionar ${name} à lista de interesse`
      }
      aria-pressed={favorite.isFavorite}
      disabled={disabled}
      onClick={() => {
        if (!favorite.session.data?.user) {
          void navigate({
            to: '/login',
            search: { returnTo, reason: undefined },
          })
          return
        }
        favorite.mutation.mutate(!favorite.isFavorite)
      }}
    >
      <Heart
        size={20}
        aria-hidden="true"
        fill={favorite.isFavorite ? 'currentColor' : 'none'}
      />
    </button>
  )
}
