import { useQueries } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { NFTCard } from '@/components/marketplace/nft-card'
import { AccountLayout } from '@/features/profile/layout'
import { fetchNft } from '@/features/nft/api'
import { useFavorites } from './hooks'
import './styles.css'

export function FavoritesPage() {
  const { favorites } = useFavorites()
  const ids = favorites.data?.nftIds ?? []
  const nftQueries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['nft', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchNft(id, signal),
      staleTime: 30_000,
    })),
  })
  const retry = () => {
    void favorites.refetch()
    for (const query of nftQueries) if (query.isError) void query.refetch()
  }

  return (
    <AccountLayout title="Lista de interesse">
      {favorites.isPending ? (
        <p role="status">Carregando sua lista de interesse…</p>
      ) : favorites.isError ? (
        <div className="favorites-state" role="alert">
          <p>Não foi possível carregar sua lista de interesse.</p>
          <SecondaryButton onClick={retry}>Tentar novamente</SecondaryButton>
        </div>
      ) : !ids.length ? (
        <div className="favorites-state">
          <h2>Sua lista de interesse está vazia.</h2>
          <p>Salve NFTs que você quer acompanhar para encontrá-los aqui.</p>
          <PrimaryButton asChild>
            <Link to="/marketplace">Explorar NFTs</Link>
          </PrimaryButton>
        </div>
      ) : nftQueries.some((query) => query.isPending) ? (
        <p role="status">Carregando NFTs salvos…</p>
      ) : nftQueries.some((query) => query.isError) ? (
        <div className="favorites-state" role="alert">
          <p>Não foi possível carregar um ou mais NFTs salvos.</p>
          <SecondaryButton onClick={retry}>Tentar novamente</SecondaryButton>
        </div>
      ) : (
        <div className="favorites-grid">
          {nftQueries.map((query) =>
            query.data ? (
              <NFTCard
                key={query.data.id}
                nft={query.data}
                showFavorite
              />
            ) : null,
          )}
        </div>
      )}
    </AccountLayout>
  )
}
