import { http, HttpResponse } from 'msw'
import { env } from '@/lib/env'
import { healthResponse } from '../data/health'
import { nftsHandler } from './nfts'
import { nftDetailHandlers } from './nft-detail'
import { collectorHandlers } from './collector'
import { commerceHandlers } from './commerce'
import { accountHandlers } from './accounts'
import { realtimeScenarioHandlers } from './realtime-scenarios'

const healthUrl = `${env.apiBaseUrl.replace(/\/$/, '')}/health`
export const handlers = [
  ...realtimeScenarioHandlers,
  ...accountHandlers,
  ...nftDetailHandlers,
  ...collectorHandlers,
  ...commerceHandlers,
  nftsHandler,
  http.get(healthUrl, () => HttpResponse.json(healthResponse)),
]
