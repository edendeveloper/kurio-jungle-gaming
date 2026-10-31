export interface HealthResponse {
  status: 'ok'
  service: 'kurio-mock-api'
}

export interface ApiErrorBody {
  message?: string
  code?: string
}
