import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from './query-client'
import { router } from './router'
import { RealtimeConnection } from './realtime-connection'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeConnection />
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
