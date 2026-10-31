import { queryOptions } from '@tanstack/react-query'
import { api } from './client'
import type { HealthResponse } from '@/types/api'

export function healthQueryOptions() {
  return queryOptions({
    queryKey: ['health'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<HealthResponse>('/health', { signal })
      return data
    },
  })
}
