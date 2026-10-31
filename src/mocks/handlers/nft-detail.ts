import { http, HttpResponse } from 'msw'
import { env } from '@/lib/env'
import { getNftDetail, getNftRecords } from '../data/nft-detail'

const base = env.apiBaseUrl.replace(/\/$/, '')
export const nftDetailHandlers = [
  http.get(`${base}/nfts/:id/related`, ({ params }) => {
    const records = getNftRecords(),
      nft = records.find((nft) => nft.id === params.id)
    if (!nft)
      return HttpResponse.json(
        { message: 'NFT não encontrado.', code: 'NFT_NOT_FOUND' },
        { status: 404 },
      )
    const items = records
      .filter(
        (item) => item.collection === nft.collection && item.id !== nft.id,
      )
      .sort(
        (a, b) =>
          Number(a.isFeatured) - Number(b.isFeatured) ||
          b.createdAt.localeCompare(a.createdAt) ||
          a.id.localeCompare(b.id),
      )
      .slice(0, 5)
    return HttpResponse.json({ items })
  }),
  http.get(`${base}/nfts/:id`, async ({ params }) => {
    const scenario = localStorage.getItem('kurio:nft-scenario')
    await new Promise((resolve) =>
      setTimeout(resolve, scenario === 'slow' ? 1500 : 120),
    )
    if (scenario === 'error')
      return HttpResponse.json(
        {
          message: 'Não foi possível carregar este NFT.',
          code: 'NFT_UNAVAILABLE',
        },
        { status: 503 },
      )
    const nft = getNftRecords().find((nft) => nft.id === params.id)
    return nft
      ? HttpResponse.json(getNftDetail(nft))
      : HttpResponse.json(
          { message: 'NFT não encontrado.', code: 'NFT_NOT_FOUND' },
          { status: 404 },
        )
  }),
]
