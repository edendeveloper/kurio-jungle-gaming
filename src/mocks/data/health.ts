import type { HealthResponse } from '@/types/api'

export const healthResponse = {
  status: 'ok',
  service: 'kurio-mock-api',
} satisfies HealthResponse
