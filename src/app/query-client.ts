import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) =>
        !(
          error instanceof ApiError &&
          error.status !== undefined &&
          error.status < 500
        ) && failureCount < 2,
    },
    mutations: { retry: false },
  },
})
