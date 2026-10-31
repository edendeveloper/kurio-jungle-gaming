import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { sessionToken } from '@/lib/api/auth-context'
import type { CollectorSession } from '@/types/collector'
import { parseNftUpdatedEvent, parseOrderUpdatedEvent } from '@/types/realtime'
import { applyNftUpdated, applyOrderUpdated } from '@/features/realtime/cache'
import { RealtimeVersionTracker } from '@/features/realtime/versioning'
import { env } from '@/lib/env'

export function RealtimeConnection() {
  const [state, setState] = useState('connecting')
  const client = useQueryClient()
  const socketRef = useRef<import('socket.io-client').Socket | undefined>(undefined)
  const tracker = useRef(new RealtimeVersionTracker())
  const hasConnected = useRef(false)
  const subscribedToken = useRef<string | undefined>(undefined)
  const sentToken = useRef<string | undefined>(undefined)
  const updateSubscription = useRef<(force?: boolean) => void>(() => undefined)

  useEffect(() => {
    updateSubscription.current = (force = false) => {
      const token = sessionToken()
      if (token !== subscribedToken.current) {
        tracker.current.clear()
        subscribedToken.current = token
      }
      if (!socketRef.current?.connected || (!force && sentToken.current === token)) return
      sentToken.current = token
      socketRef.current.emit('subscribe', token)
      console.info('[realtime] session subscription sent')
    }
    const unsubscribe = client.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] === 'session') updateSubscription.current()
    })
    return () => {
      unsubscribe()
      updateSubscription.current = () => undefined
    }
  }, [client])

  useEffect(() => {
    let closed = false
    let socket: import('socket.io-client').Socket | undefined
    const probe = env.mocksEnabled
      ? new WebSocket(`${location.origin.replace(/^http/, 'ws')}/ws-probe`)
      : undefined
    if (probe) {
      probe.addEventListener('open', () => {
        console.info('[realtime] native WebSocket opened')
        probe.send('native-ping')
      })
      probe.addEventListener('message', (event) => {
        if (event.data !== 'native-pong' || closed) return
        console.info('[realtime] native WebSocket message received')
        probe.close()
        void connectSocket()
      })
      probe.addEventListener('error', () => setState('native-websocket-error'))
    } else {
      void connectSocket()
    }

    async function connectSocket() {
      const { io } = await import('socket.io-client')
      if (closed) return
      console.info('[realtime] creating Socket.IO client', `${location.origin}/socket.io/?EIO=4&transport=websocket`)
      socket = io(location.origin, {
        path: '/socket.io/',
        transports: ['websocket'],
        reconnection: true,
      })
      socketRef.current = socket
      socket.on('connect', () => {
        const isReconnect = hasConnected.current
        hasConnected.current = true
        console.info('[realtime] Socket.IO client connected')
        setState('connected')
        updateSubscription.current(true)
        socket?.emit('ping-test', 'socket-transport-ok')
        if (isReconnect) {
          console.info('[realtime] reconciling REST state after reconnect')
          void client.invalidateQueries({ queryKey: ['nfts'] })
          void client.invalidateQueries({ queryKey: ['nft'] })
          void client.invalidateQueries({ queryKey: ['cart'] })
          void client.invalidateQueries({ queryKey: ['checkout-quote'] })
          void client.invalidateQueries({ queryKey: ['order'] })
          void client.invalidateQueries({ queryKey: ['order-attempt'] })
          void client.invalidateQueries({ queryKey: ['active-order'] })
        }
      })
      socket.on('pong-test', (payload: unknown) => {
        console.info('[realtime] pong-test received')
        if (payload === 'socket-transport-ok') setState('event-received')
      })
      socket.on('nft.updated', (payload: unknown) => {
        const event = parseNftUpdatedEvent(payload)
        if (!event) {
          console.error('[realtime] Rejected malformed nft.updated payload')
          return
        }
        if (applyNftUpdated(client, tracker.current, event)) {
          console.info('[realtime] nft.updated applied', event.nftId, event.version)
          setState('updated')
        }
      })
      socket.on('order.updated', (payload: unknown) => {
        const event = parseOrderUpdatedEvent(payload)
        if (!event) {
          console.error('[realtime] Rejected malformed order.updated payload')
          return
        }
        const userId = client.getQueryData<CollectorSession>(['session'])?.user?.id
        if (applyOrderUpdated(client, tracker.current, event, userId)) {
          console.info('[realtime] order.updated applied', event.orderId, event.version, event.status)
          setState('order-updated')
        }
      })
      socket.on('disconnect', () => setState('disconnected'))
      socket.on('connect_error', (error: Error) => setState(`error:${error.message}`))
    }

    return () => {
      closed = true
      probe?.close()
      socket?.disconnect()
      socketRef.current = undefined
      sentToken.current = undefined
    }
  }, [client])

  return (
    <output
      className="sr-only"
      role="log"
      data-testid="socket-status"
      aria-live="polite"
    >
      {state}
    </output>
  )
}
