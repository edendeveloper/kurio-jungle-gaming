import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { env } from './lib/env'
import './index.css'

async function bootstrap() {
  // Fetch/evaluate the app bundle while the mock worker starts. The Socket.IO
  // client itself remains dynamically imported by RealtimeConnection's effect,
  // after worker.start() has patched WebSocket.
  const appPromise = import('./app/app')
  if (env.mocksEnabled) {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      quiet: true,
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    })
    console.info('[realtime] MSW initialized')
  }

  const { App } = await appPromise

  const root = document.getElementById('root')
  if (!root) throw new Error('Elemento raiz não encontrado.')
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap().catch((error: unknown) => {
  console.error('Falha ao iniciar KURIO:', error)
  const root = document.getElementById('root')
  if (root)
    root.textContent = 'Não foi possível iniciar KURIO. Recarregue a página.'
})
