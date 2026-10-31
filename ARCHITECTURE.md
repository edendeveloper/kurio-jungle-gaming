# Kurio — arquitetura

Este documento resume a arquitetura atual e aponta para contratos detalhados por domínio. A entrega implementa o desafio frontend da Jungle Gaming com respostas simuladas no navegador; não é uma arquitetura de produção financeira.

## Organização por features

```text
src/
  app/                 providers, router, bootstrap de realtime
  components/          layout global e componentes UI compartilhados
  features/
    auth/               sessão, formulários e ciclo da conta
    marketplace/        Home, catálogo, filtros e API de NFTs
    nft/                detalhe, galeria, avaliações e recomendações
    cart/               carrinho, recomendações, resumo e API
    checkout/           formulário, quote, pedido e recibo
    profile/            dados do colecionador
    wallets/            carteiras do usuário
    realtime/           versionamento e atualização do cache
  lib/api/              Axios e contratos das fronteiras HTTP
  mocks/                handlers REST/WebSocket, fixtures e armazenamento
  types/                contratos compartilhados entre camadas
```

Uma feature concentra consulta/mutation, tipos ou validação do seu domínio. Componentes compartilhados permanecem em `components`; handlers MSW representam o lado servidor simulado e não devem ser substituídos por dados de negócio dentro da UI.

## Navegação e renderização

TanStack Router define a árvore em `src/app/router.tsx`, com validação dos parâmetros de busca do catálogo, links tipados, página de NFT dinâmica e guards em perfil, carteiras, checkout e pedidos. A Home é eager para o conteúdo inicial; rotas secundárias usam `React.lazy` para dividir o bundle. O `AppLayout` mantém header/footer/navegação e a página de erro raiz.

As rotas públicas são `/`, `/marketplace`, `/nft/$nftId` e `/cart`. Rotas privadas validam sessão e preservam `returnTo` no fluxo de login. O servidor Vercel reescreve caminhos da SPA para `index.html`; recursos estáticos existentes são resolvidos pelo filesystem antes da reescrita. Ver [configuração Vercel](vercel.json).

## Fluxo REST e TanStack Query

Componentes chamam hooks da feature; hooks consultam funções Axios; Axios usa `VITE_API_BASE_URL` e normaliza erros. As respostas são verificadas nas fronteiras, incluindo status/content-type para evitar aceitar HTML como JSON. MSW intercepta `/api/*` no navegador para a demonstração e compartilha os mesmos dados/overrides usados pelo catálogo, detalhe, carrinho, cotação e pedidos.

TanStack Query mantém os dados remotos, cache por chave de consulta e identidade de sessão para dados privados. Mutations invalidam as consultas que dependem do recurso alterado; falhas são exibidas sem fallback silencioso para dados vazios. A política específica de cache e estados está documentada em [catalog-api.md](docs/catalog-api.md) e [realtime.md](docs/realtime.md).

## Sessão, privacidade simulada e persistência

O estado `checking | anonymous | authenticated` vem da API mockada e de um token opaco local, cuja existência e expiração são verificadas pelo ledger MSW. Uma presença arbitrária de usuário no storage não autoriza acesso. Os handlers privados validam sessão/proprietário; query keys incluem contexto de usuário e logout/troca invalida cache e subscriptions privados.

O armazenamento dos mocks é local ao browser/origem. O carrinho visitante ocupa bucket próprio; ao autenticar, o merge é idempotente por NFT + edição, limitado ao estoque, e preserva conflitos excedentes no bucket visitante. Isso não oferece isolamento seguro equivalente a backend: o usuário controla o armazenamento e o código do service worker.

Detalhes: [authentication.md](docs/authentication.md) e [profile-wallets.md](docs/profile-wallets.md).

## Carrinho, ETH e pedidos

O carrinho é mantido pelos handlers existentes, sem store paralelo na UI. Preços trafegam como strings decimais; utilitários de domínio operam em unidades inteiras (wei/BigInt) para subtotal, descontos, taxas e total. O cliente requisita uma cotação versionada; a criação do pedido revalida usuário, cotação, preço, estoque, cupom e valores no handler.

Uma chave de idempotência recupera o mesmo pedido em uma repetição; conteúdo conflitante é rejeitado. O recibo usa snapshot persistido e só a resposta/estado confirmado da API pode apresentar confirmação. Pedido, baixa de estoque e quantidades do carrinho são persistidos pelo mock de forma coerente. Checkout e limitações estão em [checkout.md](docs/checkout.md).

## Socket.IO e reconciliação

Com mocks ativos, bootstrap importa o worker MSW e aguarda `worker.start()` antes de montar a aplicação. O módulo da aplicação pode ser baixado enquanto o worker inicia, mas `socket.io-client` permanece em import dinâmico no efeito de realtime, após o patch WebSocket. O binding `@mswjs/socket.io-binding@0.2.0` atende a URL Socket.IO via handler WebSocket MSW.

Eventos `nft.updated` e `order.updated` carregam ID do evento/recurso e versão monotônica. A camada central valida os payloads, descarta duplicatas e versões antigas, atualiza/invalida cache Query e protege transições terminais de pedido. Após reconexão, REST recupera estado perdido; não se cria pedido automaticamente. Eventos de pedido são vinculados à conta inscrita. Consulte [realtime.md](docs/realtime.md) para payloads, endpoints de cenário e procedimento de teste.

## Interface, acessibilidade e diferenças justificadas

Tokens de cor e tipografia estão centralizados no design system. Componentes compartilhados e shadcn/ui são estilizados para seguir os frames do Figma. A página mobile usa busca, filtro e navegação próprios, sem reduzir o header desktop. Carrinho/checkout usam ações/resumos persistentes em mobile para manter controles próximos; confirmação, perfil e carteiras são adaptados sem frames mobile oficiais.

Diferenças e correções verificadas estão em [visual-audit.md](docs/visual-audit.md). A auditoria axe/teclado está em [accessibility-audit.md](docs/accessibility-audit.md). A performance mobile permanece abaixo da meta Lighthouse e é reportada sem mascarar o custo do MSW: [performance-audit.md](docs/performance-audit.md).

## Trade-offs e limites

- A SPA permite hosting estático e acesso direto via rewrite, mas metadados específicos de NFT são atualizados no cliente; não há SSR.
- MSW e Socket.IO mock permitem teste/demonstração em checkout sem serviços privados. Estado não sincroniza entre browsers/dispositivos.
- Sessão, pagamento, disponibilidade, carteira e referências de transação são demonstrativos; não há validação on-chain, segredo seguro ou fluxo de pagamento.
- Lighthouse mobile está abaixo de 90 em Performance; Acessibilidade, Best Practices e SEO atingiram as metas registradas.
- Link público não está disponível e o diretório ainda não é repositório Git. Não foram criados projeto remoto, commit ou publicação.

## Validação

Instalação, comandos, credenciais fictícias, cenários e reset estão no [README](README.md). Resultados datados e pendências ficam em [validation.md](docs/validation.md); a tabela de requisitos oficiais está em [final-compliance.md](docs/final-compliance.md).
