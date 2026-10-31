# Carrinho, checkout e confirmação — Etapa 5

> Etapa 6: autenticação por ID arbitrário foi removida, carteiras agora pertencem à conta e o carrinho persistente evoluiu para buckets por proprietário, com conciliação do visitante. Rascunho e tentativa de compra são isolados por usuário. Consulte [authentication.md](authentication.md) e [profile-wallets.md](profile-wallets.md); descrições da Etapa 5 abaixo permanecem como histórico.

## Correção visual — Etapa 5.1

O carrinho agora inclui **Colecionadores também viram** entre a área de compra e o footer, inclusive quando o carrinho está vazio ou falha. `src/features/cart/recommendations.tsx` reutiliza `useNFTs({ pageSize: 36 })` / `GET /api/nfts`, sem novo endpoint, armazenamento ou duplicação de preços. Uma lista de IDs define a curadoria: Cosmic Bloom, Violet Nomad, Ivory Baron, Golden Beat e Golden Signal aparecem primeiro; Emerald Ape, Sage Nomad e Neon Vessel completam a navegação seguinte. Nome, token no título, preço, disponibilidade e imagem vêm dos registros existentes. Nenhum dado financeiro foi copiado para o JSX.

O `NFTCard` existente ganhou a variante opcional `recommendation`, que usa imagem quadrada e preço atual, sem alterar a variante padrão do catálogo. O carrossel usa scroll nativo, scroll-snap, ResizeObserver e paginação funcional, sem dependências novas. Mostra cinco cards em um contêiner de pelo menos 1100 px, três a partir de 650 px e dois abaixo disso. A seleção acompanha scroll/toque e os indicadores aceitam teclado; páginas inativas são `inert` e ocultas de leitores de tela. A região de scroll tem posicionamento relativo para conter também os rótulos acessíveis absolutos dos cards e evitar overflow horizontal. O padding inferior acumulado do carrinho e de sua rota foi removido de forma localizada; o intervalo até o footer usa apenas o token compartilhado de seção (96 px desktop e 48 px mobile), sem afetar checkout ou outras rotas.

Loading com skeleton, erro com retry e estado vazio são independentes do carrinho. O preset existente `kurio:catalog-scenario` aceita agora `empty` para testes determinísticos. No desktop/tablet, linhas do carrinho receberam Surface Card, borda discreta, raio de 8 px, padding de 12 px e intervalos de 12 px; cabeçalho e linhas compartilham colunas e padding. Miniaturas continuam em 70 px no desktop e 100 px no mobile. Layout mobile, regras de quantidade, totais, autenticação, checkout e pedidos foram preservados. O espaçamento antes da seção é de 96 px no desktop e 56 px no mobile, sem alturas fixas.

Arquivos desta correção: criados `src/features/cart/recommendations.tsx`, `src/features/cart/styles.css` e `tests/e2e/cart-recommendations.spec.ts`; alterados `src/features/cart/page.tsx`, `src/components/marketplace/nft-card.tsx`, o preset de vazio em `src/mocks/handlers/nfts.ts` e estes registros de documentação. Capturas em `docs/screenshots/stage5-1/` incluem carrinho completo, viewport e seção de recomendações, em 1440 e 414 px.

Limitações visuais: não foram feitas consultas ao Figma MCP, conforme solicitado. A implementação segue as especificações fornecidas, sem alegação de comparação pixel-perfect. Foram mantidos os quatro PNGs originais locais e os mapeamentos de imagens já existentes no dataset: Cosmic/Violet compartilham uma arte e Golden Beat/Golden Signal compartilham outra. Não foram inventadas artes individuais ou editados PNGs. A curadoria e sua segunda página são demonstrativas, sem personalização de recomendações. O layout mobile de duas colunas é uma adaptação responsiva, pois esta correção não fornece um frame mobile da seção.

O fluxo é inteiramente de demonstração. O [README oficial](https://github.com/junglegaming/frontend-challenge) exige cotação autoritativa, idempotência, estados de processamento e comprovante persistido. Nenhuma conexão blockchain, cobrança, autenticação real ou CRUD de carteiras foi introduzido.

## Modelo e persistência

O carrinho original continua sendo a única fonte: `kurio:cart` no localStorage, acessado pelos handlers MSW. A lista legada é lida e migrada na primeira gravação para `{ version: 2, items, couponCode, quotes, orders }`. A identidade da linha é **nftId + edition**; novas adições somam quantidades. `edition` identifica a edição, `availability` é estoque. Duplicações legadas são agrupadas. Quantidades são inteiros positivos e o mock valida estoque nas mutações e na compra.

`CartItem` contém `{ nftId, edition, quantity, nft, subtotalEth }`. `CartResponse` contém `{ items, totals, coupon, version }`. `version` representa itens, preço, estoque e condições financeiras atuais. O catálogo e os detalhes continuam usando os mesmos registros, com disponibilidade descontada pelo histórico de pedidos confirmados.

Pedidos guardam snapshot de itens, quantidades, preços, totais, cupom, colecionador e carteira, além de ID `KUR-<uuid>`, usuário, chave de idempotência, datas e estado `processing | confirmed | rejected`. O snapshot confirmado não é reconstruído usando preços futuros. Pedido, baixa de estoque e remoção das quantidades compradas do carrinho são gravados no mesmo envelope, em uma única escrita. Quantidades adicionadas depois da criação do pedido são preservadas. Erros e recusas preservam todos os itens. Web Locks serializa operações no mesmo navegador; o fallback é síncrono.

Esta persistência é local ao navegador/origem e pode ser apagada ou manipulada pelo usuário. Não substitui banco de dados, sessão segura, reserva de estoque distribuída ou processamento financeiro. A finalização acontece ao consultar o pedido após o prazo simulado; não há worker de pagamentos ou Socket.IO. Há no máximo um pedido em processamento por usuário.

## Contratos REST

Todos os caminhos abaixo têm prefixo `/api`. Erros retornam `{ message, code }` e status 400 (parâmetro), 401 (sessão), 404 (recurso), 409 (estoque, cotação ou conflito), 422 (formulário, rede ou cupom) ou 503 (falha transitória).

| Método e caminho                  | Entrada                                              | Resposta                                                       |
| --------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| GET `/cart`                       | —                                                    | `CartResponse`                                                 |
| POST `/cart/items`                | `{ nftId, edition, quantity }`                       | 201, carrinho atualizado                                       |
| PATCH `/cart/items/:id/:edition`  | `{ quantity }` absoluta                              | carrinho atualizado                                            |
| DELETE `/cart/items/:id/:edition` | —                                                    | carrinho atualizado                                            |
| POST `/cart/coupon`               | `{ code }`                                           | carrinho com cupom validado                                    |
| DELETE `/cart/coupon`             | —                                                    | carrinho sem cupom                                             |
| GET `/session`                    | —                                                    | sessão simulada existente                                      |
| POST `/session/demo`              | —                                                    | ativa explicitamente `collector-demo`                          |
| GET `/wallets`                    | sessão                                               | `{ items: SavedWallet[] }`, fixtures somente leitura           |
| POST `/checkout/quote`            | `{ network }`, sessão                                | `CheckoutQuote`                                                |
| POST `/orders`                    | `CheckoutPayload`, sessão e header `Idempotency-Key` | 202, pedido em processamento; repetição retorna o mesmo pedido |
| GET `/orders/active`              | sessão                                               | `{ order: PurchaseOrder \| null }`                             |
| GET `/orders/attempt/:key`        | sessão                                               | pedido da tentativa ou 404                                     |
| GET `/orders/:id`                 | sessão proprietária                                  | pedido persistido                                              |

`CheckoutQuote` inclui ID, usuário, versão do carrinho, itens, totais, cupom, rede e `expiresAt` em milissegundos. Dura dois minutos. Uma compra exige todos os itens na mesma rede; carrinhos mistos mostram uma orientação para ajustar a seleção.

`CheckoutPayload`:

```json
{
  "quoteId": "id-retornado-pela-api",
  "collector": {
    "displayName": "Nova Collector",
    "username": "nova_1",
    "email": "nova@example.com",
    "profile": "",
    "notes": ""
  },
  "wallet": {
    "savedWalletId": "main-ethereum",
    "network": "ethereum",
    "provider": "metamask",
    "address": "0x1111111111111111111111111111111111111111",
    "ens": "kurio.eth"
  }
}
```

O cliente não envia preços ou totais autoritativos. O handler recalcula valores, valida cotação, itens, disponibilidade, preço, cupom, formulário e carteira antes de aceitar. Antes de confirmar, revalida novamente estoque, preço, cupom e totais. Alterações exigem revisão explícita, sem aceitar silenciosamente uma compra mais cara.

Mesma chave + mesmo payload normalizado retorna o mesmo pedido, inclusive após esvaziar o carrinho. Mesma chave + payload diferente retorna 409. Cliques simultâneos são protegidos no cliente e serializados no mock. O cliente guarda somente a tentativa de envio em sessionStorage (`kurio:checkout-attempt`), para repetir a mesma chave após resposta ambígua; isso não é outro carrinho. Uma falha de rede nunca implica confirmação.

## Valores e cupons

Todos os valores ETH são strings decimais, até 18 casas. `src/lib/money.ts` converte para unidades inteiras de 10^-18 usando BigInt. Soma, multiplicação por quantidade e percentuais são exatos, sem cálculos monetários com ponto flutuante. Percentuais truncam frações inferiores a uma unidade mínima. O mesmo módulo é usado pelo mock e pelos cálculos da interface de detalhes.

`totals = { subtotalEth, discountEth, networkFeeEth, totalEth }`; total = subtotal − desconto + taxa. A taxa estimada fixa por rede distinta no carrinho é Ethereum `0.016`, Polygon `0.002`, Solana `0.001` ETH. São valores fictícios expressos em ETH inclusive para outras redes; não representam gas real ou conversão de tokens. Carrinho vazio tem taxa zero. Desconto nunca ultrapassa o subtotal nem incide sobre a taxa.

| Código    | Regra determinística                           |
| --------- | ---------------------------------------------- |
| KURIO10   | 10% do subtotal                                |
| LAUNCH5   | 0.05 ETH, limitado ao subtotal                 |
| POLYGON20 | 20%, somente quando todos os itens são Polygon |
| EXPIRED   | sempre expirado                                |
| Outros    | inválidos                                      |

Cupons são normalizados para maiúsculas. Alteração do carrinho reavalia compatibilidade; cupons inválidos não aplicam desconto e bloqueiam a cotação até serem removidos.

## Formulário, carteira e cache

Nome de exibição (2–80), usuário (3–24 letras/números/sublinhado), e-mail, rede, provedor e endereço são obrigatórios. Perfil (até 100), observações (até 500) e ENS são opcionais, por não serem necessários à compra simulada. ENS aceita um nome `.eth` em Ethereum. Ethereum/Polygon validam `0x` + 40 hexadecimais; Solana valida base58 com 32–44 caracteres. São verificações sintáticas, sem consulta on-chain, checksum ou prova de propriedade. MetaMask, WalletConnect e Coinbase são provedores; no mock Solana usa WalletConnect. Carteira salva, seleção, endereço, provedor e rede têm campos distintos. Carteiras salvas são fixtures explicitamente de demonstração.

React Hook Form/Zod não existiam no projeto: a validação pura compartilhada entre cliente e mock evita dependências extras nesta etapa. Inputs controlados e componentes estáveis preservam edição e foco. Erros são identificados por campo e anunciados; após submit inválido o primeiro campo recebe foco.

TanStack Query mantém a fonte de verdade remota: `['cart']` recebe apenas respostas confirmadas das mutações, sem atualização otimista. Cotação usa usuário + versão + rede e não faz retry automático. Pedidos e carteiras incluem usuário na queryKey. Pedido em processamento é consultado a cada 800 ms; estados terminais interrompem polling e invalidam carrinho e catálogo/detalhes. A rota `/checkout/success?orderId=KUR-...` consulta a API após refresh e distingue processamento, confirmação, recusa, ausência e erro. Não há link falso de Etherscan.

## Cenários de teste

Chaves locais controlam exclusivamente o mock:

- `kurio:checkout-scenario`: `error` (503 antes de criar), `declined` (recusa), `slow` (3s), `response-lost` (pedido persistido, resposta perdida).
- `kurio:cart-scenario=error`: falha de leitura/mutação do carrinho.
- `kurio:coupon-scenario=expired`: cupom expira antes de confirmar.
- Presets existentes `kurio:nft-scenario=changed|sold-out`: alteração de preço/estoque.
- Sessão existente `kurio:session-user=collector-demo|collector-alt`; ausência representa visitante.

Cada teste Playwright tem contexto novo, sem serviços externos ou alterações nos PNGs. Há testes unitários nativos do Node para precisão, taxas, cupons, quantidades e validação.

## Design e limites

Reutilizados tokens, Roboto Mono, botões, breadcrumbs, header, footer, navegação e assets originais existentes. CSS da etapa está isolado em `features/checkout/styles.css`; a transparência dos cards foi preservada. Desktop usa container de 1200 e resumo de 332 px; abaixo de 1024 as colunas são empilhadas; abaixo de 640 o formulário usa uma coluna e CTA de 60 px.

A quota Starter do Figma MCP já estava esgotada. Foram usados os metadados locais anteriormente obtidos dos frames 11:1278, 11:2862, 11:4385, 16:360 e 16:748, sem repetir chamadas indisponíveis. Não houve comparação nova com screenshots do Figma e não se declara pixel-perfect. A confirmação foi adaptada de overlay para rota independente; textos de segurança, erros, descontos e resumo variam conforme dados reais do mock. A seleção usa cards de carteira com 93 px e opções de provedor com 65 px no mobile, com rádios nativos acessíveis e marcas tipográficas W/M/C presentes nos metadados. O cabeçalho permanece textual, em vez do botão circular de voltar do frame; o formulário de colecionador e a navegação/footer compartilhados tornam a página mobile mais longa que a referência. Não há novos assets de NFTs; os quatro PNGs originais foram reutilizados.

## Arquivos da entrega

Criados:

- `src/lib/money.ts` e `src/types/checkout.ts`.
- `src/features/checkout/api.ts`, `validation.ts`, `styles.css`, `components/financial-summary.tsx` e `components/wallet-selection.tsx`.
- `src/mocks/store/persistence.ts`, `commerce.ts` e `session.ts`.
- `src/mocks/handlers/commerce.ts` e `src/mocks/data/wallets.ts`.
- `tests/e2e/checkout.spec.ts`, `tests/unit/checkout.test.ts`, este documento e 12 capturas (viewport e página completa) em `docs/screenshots/stage5/`.

Alterados:

- `src/app/router.tsx`, `src/types/collector.ts`.
- `src/features/cart/api.ts`, `src/features/cart/page.tsx` e `src/features/checkout/page.tsx`.
- `src/features/nft/utils.ts` e `src/features/marketplace/utils/filters.ts`: preservam suas APIs, compartilhando o cálculo decimal exato centralizado.
- `src/mocks/data/nft-detail.ts`, `src/mocks/handlers/collector.ts` e `src/mocks/handlers/index.ts`.
- `tests/e2e/nft.spec.ts`: resposta de carrinho vazio agora confere também o total zero, mantendo as demais expectativas.
- `package.json`: script unitário nativo, sem dependências novas ou alteração do lockfile.
- `docs/architecture.md`, `docs/nft-detail.md` e `docs/validation.md`: referências e resultado atualizado.

## Teste manual

1. Execute `npm run dev` com mocks habilitados conforme `.env.example`.
2. Abra Emerald Ape pelo catálogo, escolha quantidade e compre para abrir `/cart`.
3. Edite quantidade, aplique `KURIO10`, remova e reaplique; confira badge e totais após refresh.
4. Selecione Conectar e finalizar e ative a conta de demonstração quando solicitado.
5. Preencha nome, usuário e e-mail; escolha Principal na carteira salva. Confirme.
6. Aguarde confirmação da API; recarregue o comprovante e verifique o ID e valores preservados.
7. Para testar falhas, configure um cenário acima antes da compra. Remova a chave para recuperar a tentativa. Pedidos recusados mantêm itens.

Etapa 6 permanece pendente: autenticação real, gerenciamento de perfil/carteiras e integrações futuras não foram implementados.
