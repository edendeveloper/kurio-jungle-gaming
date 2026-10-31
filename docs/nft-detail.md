# Detalhes do NFT — Etapa 4

> Etapa 6: os presets `kurio:session-user` abaixo não autenticam mais. Use login/cadastro ou o atalho explícito, conforme [authentication.md](authentication.md). Favoritos continuam usando a mesma API, agora vinculados a uma sessão validada e expirada pelo mock.

> Continuidade na Etapa 5: a integração mínima de carrinho descrita abaixo foi evoluída, preservando sua API e armazenamento. Consulte [checkout.md](checkout.md) para o contrato atualizado de carrinho, checkout e pedidos.

## Referência e verificação visual

Arquivo Figma: `dwXaL2NKtcLMPJIMpmFWLV`; frames desktop `10:244` e mobile `15:5536`.

O Figma MCP abriu a sessão `95b25f1d-c638-4bce-a2a8-0ca5d8d3a828`. As consultas get_design_context e get_screenshot dos dois frames retornaram limite do plano Starter. whoami confirmou autenticação válida: não foi erro de permissão. Portanto, não foi possível obter novas screenshots, propriedades detalhadas ou exportações específicas desta página. Nenhuma alteração foi feita no Figma.

Foram reutilizados os metadados obtidos na mesma conversa e as quatro artes originais já locais. A referência estrutural disponível estabelece:

- Desktop: 1440 px, container 1200 px; breadcrumb em y=101, produto em y=129; galeria de 573 px, intervalo de 32 px, informações em 595 px.
- Galeria: miniaturas de 100 × 100 px com gaps de 16 px; imagem principal em área de 444 px com arte interna de 404 px.
- Conteúdo em abas abaixo do produto, seguido por cinco cards de outros NFTs da coleção e footer compartilhado.
- Mobile: 414 × 896; arte no topo, controles em x=28/y=23, folha de informações a partir de y=392, barra de compra inferior de aproximadamente 164 px.

Essas medidas orientam a implementação, mas não substituem uma comparação atual com screenshots do Figma. Não se declara fidelidade pixel-perfect. Fontes, cores e tokens existentes foram reaproveitados; estilos de detalhes ficam em `src/features/nft/styles.css`. A especificidade de `.nft-shell .nft-route` evita conflito com margens/padding globais sem alterar o design system.

## Rota, dados e cache

A rota existente `/nft/$nftId` foi completada, sem segunda árvore de rotas ou dependência de dados de navegação. A API recebe o ID estável do catálogo. Acesso direto, refresh, 404, erro com retry, loading e navegação entre relacionados estão cobertos pelos testes.

| Endpoint                    | Contrato / comportamento                                                                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/nfts/:id`         | Retorna NftDetail, derivado das mesmas fixtures do catálogo; 404 para ID inexistente, 503 no cenário error                                                                                     |
| `GET /api/nfts/:id/related` | `{ items: Nft[] }`, até cinco da mesma coleção, excluindo o atual; prioriza itens não destacados e datas recentes                                                                              |
| `GET /api/session`          | `{ user: null }` para visitante ou usuário do preset de demonstração                                                                                                                           |
| `GET /api/favorites`        | `{ nftIds: string[] }` da sessão; 401 sem usuário                                                                                                                                              |
| `PUT /api/favorites/:id`    | Body `{ favorite: boolean }`; definição idempotente; retorna lista atual; 400/401/404/503 conforme validação/cenário                                                                           |
| `GET /api/cart`             | `{ items: [{ nftId, edition, quantity, nft }] }` com preços e disponibilidade atuais                                                                                                           |
| `POST /api/cart/items`      | Body `{ nftId, edition, quantity }`; adiciona ao item existente ou cria; 201 com carrinho atual; 400 para quantidade inválida, 404 para NFT inexistente e 409 para edição/estoque indisponível |

O prefixo segue VITE_API_BASE_URL. Cart e favoritos persistem somente na camada MSW/localStorage. UI e hooks não importam fixtures. Carrinho persiste IDs, edição e quantidade; o objeto nft é reconstruído ao responder, evitando uma segunda cópia independente dos preços.

NftDetail estende Nft com gallery, attributes, reviews, rating, reviewCount, longDescription, contract, royaltyPercent e rights. Coleção, preço e estoque partem da mesma fonte `getNftRecords`, também consumida pelo catálogo. Contrato não contém um endereço on-chain inventado. Metadados, direitos e avaliações são identificados como demonstração. Emerald tem 19 avaliações mockadas consistentes e média 4.8; Sage não tem avaliações.

Query keys: `['nft', id]`, `['nft-related', id]`, `['session']`, `['favorites', userId]` e `['cart']`. Axios e o QueryClient existentes foram preservados. Detalhe usa AbortSignal, staleTime de 30 s e uma repetição para rede/5xx, sem repetir 404. Ao receber novos dados, atualiza preço/estoque nos itens já presentes em caches de catálogo e os marca como stale para revalidar a ordenação/filtros na próxima visita.

Favoritos usam uma única fonte de estado remoto: API e cache por usuário. A mutation faz atualização otimista, cancela consultas concorrentes e restaura o estado anterior em falha. 401 remove o cache daquela sessão e revalida a sessão. A UI não oferece sucesso de favorito para visitante. Não foi construída autenticação completa; só consulta da sessão e presets de demonstração para exercitar a API protegida.

## Galeria, edição e quantidade

A galeria usa as artes originais locais; não houve alteração dos PNGs. Como o arquivo descreve thumbnails de coleção e não há novas artes exportáveis nesta sessão, a API deriva as imagens da coleção, com a arte do NFT atual primeiro. Os labels distinguem explicitamente a arte principal das referências de outros itens. Não se afirma que são ângulos inéditos do mesmo token.

Desktop tem thumbnails laterais; mobile usa indicadores com áreas de interação de 24 px. A seleção altera a imagem, aria-pressed e alt text. Ampliação abre dialog nativo com título acessível, Escape, fechamento e retorno de foco. Áreas de arte são transparentes, mantendo a correção dos cards da Etapa 3.

Somente a edição realmente definida na fixture é oferecida; não foram inventadas variantes disponíveis para reproduzir os quatro chips ilustrativos do Figma. Edição/tiragem e quantidade disponível aparecem separadamente.

Quantidade é inteira, mínimo 1 e máximo igual ao estoque. Quando esgotado, a seleção permanece 1, mas incremento/decremento/compra ficam desabilitados; nenhuma quantidade zero é submetida. Uma redução de estoque limita imediatamente a seleção. O preço por NFT permanece distinto do total da quantidade. Totais multiplicam inteiros em wei (BigInt) e voltam a strings decimais sem ponto flutuante.

Comprar faz POST, preserva quantidade/edição, atualiza o cache/header e navega para `/cart` somente após confirmação da API. Falha não navega. O servidor revalida a soma já existente no carrinho contra o estoque. A página de carrinho nesta etapa mostra apenas a lista persistida; edição, remoção, cupons, cotação e checkout ficam para a Etapa 5.

## Tempo real e limites

socket.io-client está instalado, mas não há servidor, binding MSW, conexão, listeners ou subscriptions implementados. Esta etapa não introduz outro mecanismo nem simula visualmente um socket. O botão Atualizar dados executa refetch REST real, e o Query mantém sua política de revalidação. Atualizações Socket.IO automáticas dependem da infraestrutura futura.

Diferenças/limitações conhecidas: screenshot/contexto novos do Figma bloqueados por quota; galeria baseada nas artes existentes da coleção; uma edição real em vez de variantes não modeladas; coleção Kurio Origins coerente com a API, apesar dos nomes inconsistentes nos textos do frame; ausência de contrato blockchain real; dados de avaliações e royalties de demonstração; alguns ícones funcionais usam Lucide existente; estado de carregamento, erro e login necessário seguem os tokens locais. Compartilhamento social auxiliar não foi adicionado. As seções abaixo do primeiro viewport permanecem acessíveis por rolagem no mobile.

## Teste manual

1. Execute `npm run dev` e abra `/marketplace`. Clique em Emerald Ape #042 ou acesse `/nft/emerald-ape-042` diretamente.
2. Alterne thumbnails/indicadores, amplie a imagem e feche com Escape. Teste teclado, quantidade até 5, total e abas.
3. Compre com quantidade 3: a API confirma e abre o carrinho mínimo. Recarregue para verificar persistência. Não há checkout.
4. Como visitante, clique Favoritar: a interface informa que requer sessão e a API rejeita PUT anônimo com 401.
5. Para testar favoritos autenticados, use o console: `localStorage.setItem('kurio:session-user', 'collector-demo'); location.reload()`. Alterne e recarregue. `collector-alt` é outro usuário isolado. Isso é configuração do mock, não um login real.
6. `/nft/sage-nomad-009` mostra avaliações vazias; `/nft/inexistente` mostra 404; `/nft/study-archive-10` tem estoque zero na fixture.

Cenários pelo console (recarregue depois, ou use Atualizar dados para preço/estoque):

```js
localStorage.setItem('kurio:nft-scenario', 'changed') // Emerald: 1.49 ETH, estoque 2
localStorage.setItem('kurio:nft-scenario', 'sold-out') // Emerald esgotado
localStorage.setItem('kurio:nft-scenario', 'slow') // 1500 ms
localStorage.setItem('kurio:nft-scenario', 'error') // HTTP 503
localStorage.setItem('kurio:favorite-scenario', 'error') // rollback do favorito
localStorage.setItem('kurio:cart-scenario', 'error') // falha ao adicionar
```

Reset: remova as chaves de cenário e `kurio:session-user` e recarregue. Para resetar os itens/favoritos, remova `kurio:cart`, `kurio:favorites:collector-demo` e `kurio:favorites:collector-alt`. As fixtures não são modificadas.

## Arquivos e capturas

Criados: `src/types/nft-detail.ts`, `src/types/collector.ts`, `src/features/nft/api.ts`, `hooks.ts`, `utils.ts`, `styles.css`, `components/gallery.tsx`, `src/features/cart/api.ts`, `src/features/auth/session.ts`, `src/mocks/data/nft-detail.ts`, `src/mocks/handlers/nft-detail.ts`, `collector.ts`, `tests/e2e/nft.spec.ts`, esta documentação e screenshots.

Modificados: páginas NFT/carrinho, AppLayout (composição específica do detalhe), DesktopHeader (badge do carrinho e seção ativa), Tabs (label acessível configurável), registro de handlers e handler de catálogo (fonte compartilhada), testes foundation/home (expectativas do detalhe que deixou de ser placeholder), documentos de arquitetura/validação e README.

- [Desktop 1440 × 900](screenshots/stage4/nft-1440.png)
- [Mobile 414 × 896](screenshots/stage4/nft-414.png)
- [Desktop completo](screenshots/stage4/nft-1440-full.png)
- [Mobile completo](screenshots/stage4/nft-414-full.png)

Não há runner unitário configurado. Limites de quantidade e cálculo decimal são verificados por E2E, junto com navegação, galeria, favoritos, estoque, retry e compra mínima. Nenhum commit foi criado e a Etapa 5 não foi implementada.
