import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { sessionByToken } from '../store/accounts'
import type { OrderUpdatedEvent } from '@/types/realtime'

// MSW 2.15 normalizes Socket.IO's /socket.io/ path to / before matching.
// Keep the matcher scoped to this app's origin and the normalized root path.
const escapedHost = location.host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const socketMatcher = new RegExp(`^wss?://${escapedHost}/$`)
const channel = ws.link(socketMatcher)
const nativeProbe = ws.link(`${location.origin}/ws-probe`)
console.info('[realtime] WebSocket handler registered', socketMatcher.toString())

const connections = new Set<{
  client: ReturnType<typeof toSocketIo>['client']
  userId?: string
  close: () => void
}>()
export const realtimeHandler = channel.addEventListener('connection', (connection) => {
  console.info('[realtime] intercepted Socket.IO connection')
  const socket = toSocketIo(connection)
  console.info('[realtime] Socket.IO binding initialized')
  const subscriber: { client: typeof socket.client; userId?: string; close: () => void } = {
    client: socket.client,
    close: () => connection.client.close(1012, 'Mock scenario disconnect'),
  }
  connections.add(subscriber)
  connection.client.addEventListener('close', () => connections.delete(subscriber))
  socket.client.on('subscribe', (_event: MessageEvent, token: unknown) => {
    const session = typeof token === 'string' ? sessionByToken(token) : null
    subscriber.userId = session?.user?.id
    console.info('[realtime] subscription scope updated', subscriber.userId ? 'private' : 'public')
  })
  socket.client.on('ping-test', (_event: MessageEvent, value: unknown) => {
    console.info('[realtime] ping-test received')
    if (typeof value === 'string') {
      socket.client.emit('pong-test', value)
      console.info('[realtime] pong-test sent')
    }
  })
})

export const nativeProbeHandler = nativeProbe.addEventListener('connection', ({ client }) => {
  console.info('[realtime] native WebSocket probe intercepted')
  client.addEventListener('message', (event) => {
    if (event.data === 'native-ping') client.send('native-pong')
  })
})

export function emitMockEvent(event: string, payload: unknown) {
  const owner =
    typeof payload === 'object' && payload !== null && 'ownerUserId' in payload
      ? (payload as OrderUpdatedEvent).ownerUserId
      : undefined
  for (const connection of connections) {
    if (owner && connection.userId !== owner) continue
    connection.client.emit(event, payload)
  }
}

export function disconnectMockSockets() {
  for (const connection of [...connections]) connection.close()
}
