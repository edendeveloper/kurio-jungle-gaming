# Tempo real

## Transporte e bootstrap

No modo mock, `src/main.tsx` importa o worker dinamicamente, aguarda `worker.start()` e só então importa `App`. O cliente `socket.io-client` também é importado dinamicamente depois que a tela monta. Essa ordem assegura que o interceptor WebSocket do MSW esteja instalado antes de o cliente capturar `WebSocket`.

O MSW 2.15 normaliza o pathname `/socket.io/` para `/` antes de comparar handlers e remove a query da URL usada no matching. O handler usa uma RegExp limitada à origem atual e ao pathname normalizado. A conexão registrada por `channel.addEventListener('connection', ...)` é passada junto dos handlers HTTP a `setupWorker`.

`@mswjs/socket.io-binding@0.2.0` exporta `toSocketIo`. `socket.client.on(...)` recebe eventos do cliente e `socket.client.emit(...)` envia eventos simulados de volta ao navegador. `socket.server` representa o transporte de passthrough; emitir por ele exigiria uma conexão com um servidor WebSocket real.

O app também executa um probe WebSocket nativo apenas com mocks habilitados. Ele completa `native-ping`/`native-pong` antes de carregar o cliente Socket.IO, ajudando a separar problemas de patch/bootstrap dos problemas do protocolo.

## Dados e eventos

`GET /api/nfts`, `GET /api/nfts/:id`, carrinho e cotações leem as mesmas fixtures e overrides persistidos em `localStorage` que os cenários Socket.IO. `POST /api/__mock/realtime/nfts/:id` altera preço e/ou disponibilidade, incrementa a versão do NFT, grava o estado antes de emitir `nft.updated`, e a próxima resposta REST retorna o novo estado.

Contrato `nft.updated`:

```json
{
  "eventId": "nft-12",
  "nftId": "emerald-ape-042",
  "version": 12,
  "priceEth": "1.29",
  "availableQuantity": 3,
  "updatedAt": "2026-10-30T15:00:00.000Z"
}
```

Preço ETH permanece string decimal. A fronteira Socket.IO valida todos os campos antes de consultar o cache. Alterações aceitas atualizam detalhes em cache e invalidam catálogo, detalhes relacionados, carrinho e cotação. Catálogo é consultado de novo porque preço/estoque podem mudar filtro e ordenação; subtotal e taxas vêm do handler REST.

Pedidos em `POST /api/orders` emitem `order.updated` com status `pending`, versão 1 e o proprietário. Quando o mock processa o pedido em GET, grava o resultado confirmado/recusado, incrementa a versão e emite outro evento. `GET /api/orders/:id`, `/active` e `/attempt/:key` continuam sendo a recuperação autoritativa.

O cliente envia o token opaco existente no cookie em um evento `subscribe`; o mock valida esse token via ledger de sessão e associa o socket ao user ID. Eventos de pedido são enviados apenas às conexões autorizadas daquele user ID. O cliente também rejeita eventos cujo `ownerUserId` não corresponde à sessão atual. Eventos NFT são públicos.

## Versões, repetição e reconciliação

`RealtimeVersionTracker` mantém IDs de evento já vistos e a maior versão por recurso. Eventos duplicados, versões repetidas/antigas e eventos inferiores à versão já existente no cache REST são ignorados. As transições para `confirmed` e `rejected` são terminais; eventos não podem retornar esses pedidos a `pending`.

Em cada conexão/reconexão, o cliente revalida catálogo, detalhes, carrinho, cotações e consultas de pedido existentes. Assim, um evento perdido enquanto desconectado é recuperado pelo REST. A reconexão não cria novo pedido. A confirmação de checkout segue a validação atual de cotação versionada; uma cotação alterada pelo evento exige ação explícita “Aceitar valores atualizados” antes do botão de confirmar ficar ativo.

## Cenários determinísticos

Com `VITE_ENABLE_MOCKS=true`, os endpoints de demonstração abaixo publicam pelo binding Socket.IO real:

```js
await fetch('/api/__mock/realtime/nfts/emerald-ape-042', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ priceEth: '1.29', availableQuantity: 3 }),
})
```

`POST /api/__mock/realtime/events/nft` aceita `{ nftId, version: "old", duplicate: true }` para gerar evento antigo/duplicado. `POST /api/__mock/realtime/disconnect` fecha os sockets mockados; o cliente reconecta e reconcilia pelo REST. `POST /api/__mock/realtime/reset` apaga overrides de NFT e retorna às fixtures. Esses controles existem apenas quando o worker mock está configurado; não são endpoints do backend de produção.

Teste a prova de transporte e reconciliação no build publicado de demonstração:

```sh
npm run build:demo
npm exec playwright test -- --config=playwright.preview.config.ts
```

O Playwright verifica o log de conexão, os callbacks decodificados `ping-test`/`pong-test`, atualização de preço/estoque, carrinho, evento antigo/duplicado, desconexão/reconexão, recuperação REST e contrato JSON do carrinho em Chromium desktop e mobile.

## Limites

O estado do mock vive no `localStorage` do navegador e fica isolado por origem/perfil de browser; não é um serviço multi-instância nem uma fonte persistente entre dispositivos. O binding 0.2.0 oferece o protocolo de eventos usado aqui, mas não implementa toda a API de rooms/namespaces do Socket.IO. A autenticação de sockets demonstra autorização no mock, sem garantias de segurança de backend de produção.
