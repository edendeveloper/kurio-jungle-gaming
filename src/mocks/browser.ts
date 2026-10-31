import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { nativeProbeHandler, realtimeHandler } from './handlers/realtime'

export const worker = setupWorker(...handlers, realtimeHandler, nativeProbeHandler)
