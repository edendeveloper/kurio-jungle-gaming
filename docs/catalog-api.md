# Marketplace funcional — Etapa 3

## Requisitos e escopo

O [README oficial](https://github.com/junglegaming/frontend-challenge), consultado em 30/10/2026, exige busca, filtros combinados, ordenação e paginação na URL, preservação após refresh/histórico, estados assíncronos, cancelamento de respostas antigas, REST via Axios e mocks na camada MSW. Preços ETH devem trafegar como strings decimais. O README deixa a definição dos contratos a cargo da solução.

Home (`/`) e Marketplace (`/marketplace`) agora reutilizam Catalog, useNFTs e o mesmo handler. Hero, promoções, editorial, footer e assets da Etapa 2 foram preservados. Nenhum fluxo de negócio da Etapa 4 foi implementado.

## GET /api/nfts

O prefixo segue `VITE_API_BASE_URL` (padrão `/api`). O handler valida, filtra, ordena e pagina. A coleção inteira não é filtrada no React.

| Parâmetro  | Contrato                                                                                                          | Padrão     |
| ---------- | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| `search`   | Até 100 caracteres, trim, pesquisa em nome e coleção sem diferenciar maiúsculas/minúsculas                        | vazio      |
| `category` | `digital-art`, `photography`, `music`, `3d-art`, `collectibles`, `generative`, `gaming`, `memberships`, `utility` | todas      |
| `network`  | `ethereum`, `polygon`, `solana`                                                                                   | todas      |
| `minPrice` | String decimal >= 0, até 9 dígitos inteiros e 18 casas decimais; inclusivo                                        | sem mínimo |
| `maxPrice` | Mesmo formato; inclusivo; deve ser >= mínimo                                                                      | sem máximo |
| `sort`     | `recent`, `price_asc`, `price_desc`, `popular`                                                                    | `recent`   |
| `tab`      | `all`, `new`, `trending`                                                                                          | `all`      |
| `page`     | Inteiro de 1 a 10000                                                                                              | 1          |
| `pageSize` | Inteiro de 1 a 36                                                                                                 | 9          |

Categoria e rede são seleções únicas independentes, combináveis com busca, preço e aba. Contagens não verificáveis de facetas não são exibidas. `new` usa `isNew === true`; `trending` usa `popularity >= 80`. A ordenação escolhida vale em qualquer aba. Mais recentes usa data decrescente, popularidade usa pontuação decrescente; empates são resolvidos por `id` crescente.

Exemplos de URLs:

```text
/api/nfts?search=ape&network=ethereum&sort=price_asc&page=1&pageSize=9
/api/nfts?category=digital-art&minPrice=1&maxPrice=1.5
/marketplace?search=estudo&network=ethereum&sort=price_asc&pageSize=3&page=2
/?category=music&network=solana
```

Resposta 200 (item abreviado):

```json
{
  "items": [
    {
      "id": "emerald-ape-042",
      "tokenId": "042",
      "name": "Emerald Ape #042",
      "priceEth": "1.19",
      "imageUrl": "/assets/nfts/emerald-ape.png",
      "category": "digital-art",
      "collection": "Kurio Origins",
      "network": "ethereum"
    }
  ],
  "pagination": { "page": 1, "pageSize": 9, "totalItems": 1, "totalPages": 1 }
}
```

Itens completos também incluem `description`, `images`, `imageAlt`, `originalPriceEth` opcional, `edition`, `totalEditions`, `rarity`, `createdAt`, `popularity`, `isFeatured`, `isNew` e `availability`. `portrait` preserva o recorte específico de Cosmic Bloom. Contratos em `src/types/nft.ts` e `features/marketplace/types/catalog.ts`.

Vazio retorna items vazio, totalItems/totalPages zero e page 1. Página acima do total é limitada à última página (200); a interface corrige a URL com replace. No vazio, não há paginação e a mensagem de interface apresenta página 1 de 1.

Parâmetros desconhecidos, repetidos ou inválidos retornam HTTP 400:

```json
{ "code": "INVALID_FILTERS", "message": "Parâmetros de catálogo inválidos." }
```

Isso inclui intervalo invertido, preço negativo/não numérico, precisão excessiva e paginação fora dos limites. Parâmetros opcionais vazios são ausentes, exceto sort/tab vazios, que são inválidos. O cenário de erro retorna HTTP 503 com `code: CATALOG_UNAVAILABLE`; falha de conexão usa `HttpResponse.error()`.

## Modelagem e precisão

Preços em fixtures, transporte, URL, inputs e cards são strings. `decimalEth` normaliza zeros sem ponto flutuante. `ethUnits` transforma strings em BigInt na escala 10^18 para comparação e ordenação. Não há parseFloat, conversão para Number ou cálculos financeiros em ponto flutuante. O teste com `0.123456789123456789` verifica preservação após aplicar e recarregar.

O parser da aplicação preserva strings, convertendo somente `page` e `pageSize` para inteiros seguros. Isso evita a coerção monetária do parser padrão do Router. Duplicatas ficam como arrays para saneamento; o serializer mantém preços sem aspas JSON. As outras rotas não usam parâmetros complexos nesta etapa.

`tokenId` é identificação textual. `edition` é número da edição, `totalEditions` é tiragem e `availability` é quantidade disponível; esses campos não representam preço.

As fixtures têm 20 registros únicos determinísticos: oito NFTs nomeados no Figma e 12 estudos explicitamente identificados como demonstração pelo nome, descrição e coleção. Há três redes, nove categorias, diferentes datas, popularidades e preços, incluindo empates. Os estudos reutilizam as quatro artes exportadas e não representam assets oficiais adicionais. O slot sem nome/preço do frame não é um produto da API. Não há randomização nem dependência da data atual.

Fixtures e lógica estão somente em MSW. `data/home.ts` conserva apenas conteúdo editorial/promocional estático. Cards usam diretamente imageUrl e priceEth, eliminando aliases de preço da apresentação anterior.

## URL e rascunhos de edição

As duas rotas usam validateSearch compartilhado. Na interface, parâmetros inválidos são saneados sem quebrar a página; no endpoint REST, são rejeitados com 400. Busca longa é truncada, intervalos invertidos são removidos e parâmetros padrão/vazios são omitidos. Alterar busca, filtro, ordenação ou aba reseta page para 1; mudar página preserva os filtros.

Aplicações de filtro criam entradas no histórico. Saneamento e correção de página usam replace. Refresh, acesso direto e Back/Forward restauram filtros e resultados.

A fonte do estado aplicado é o Router. Busca mantém um rascunho controlado durante o debounce de 300 ms. O input permanece montado: não utiliza key baseada no termo da URL. O editor registra o valor submetido para distinguir a confirmação da própria digitação de uma mudança externa (histórico ou limpar filtros). A confirmação preserva edições em andamento; mudanças externas reconciliam o rascunho com a URL. O efeito cancela o timer anterior ao editar, sincronizar ou desmontar. Não há restauração imperativa repetida de foco. Campos de preço são rascunhos até Aplicar preço e são reconciliados quando o valor aplicado muda. Limpar remove filtros, rascunhos e erros.

## Query e Axios

QueryKey: `['nfts', normalizedFilters]`, incluindo todos os parâmetros com padrões. Cache fresco por 30 s, coleta após 5 min; foco/reconexão seguem a configuração existente. O catálogo é público. Providers e QueryClient foram preservados.

Axios usa o cliente compartilhado, base configurável, timeout de 10 s, normalização de erros e AbortSignal do Query. Consultas obsoletas são canceladas/descartadas. Uma repetição automática para rede/5xx ocorre após 200 ms; 4xx não repetem. O botão Tentar novamente refaz a query.

Dados anteriores permanecem somente ao mudar página com os mesmos filtros/pageSize. A interface anuncia atualização e desabilita temporariamente a paginação. Mudança de filtros sem cache mostra skeletons. Erros mostram mensagem e retry, sem produtos falsos como fallback.

## Cenários MSW reproduzíveis

Selecione pelo console do navegador, com mocks ativados:

```js
localStorage.setItem('kurio:catalog-scenario', 'slow')
location.reload()
```

| Valor               | Comportamento                             |
| ------------------- | ----------------------------------------- |
| ausente / `success` | Sucesso após 120 ms                       |
| `slow`              | Sucesso após 1500 ms                      |
| `out-of-order`      | Busca sage: 1000 ms; demais buscas: 80 ms |
| `error`             | HTTP 503 persistente, inclusive retries   |
| `connection-error`  | Erro de conexão MSW                       |

Reset: `localStorage.removeItem('kurio:catalog-scenario'); location.reload()`. Para testar recuperação sem reload, remova a chave durante o estado de erro e clique Tentar novamente. Cenários desconhecidos seguem sucesso. A configuração é lida somente pelo handler, sem branches de mocks em componentes/hooks/Axios. Cada teste começa em contexto isolado. Vazio e 400 são reproduzidos por busca inexistente e parâmetros REST inválidos.

## Acessibilidade, capturas e divergências

Drawer mobile usa dialog nativo com título, Escape, fechamento, retorno ao trigger e ciclo Tab/Shift+Tab. Categorias/redes aplicam imediatamente; Ver resultados fecha. Preços têm labels, aria-invalid e erro associado. Tabs suportam setas/Home/End. Resultados anunciam estados/totais com aria-live; erros usam alert; conteúdo usa aria-busy. Skeletons respeitam movimento reduzido. Paginação tem nomes, limites e estado disabled.

- [Home desktop](screenshots/stage3/home-1440.png) / [Home mobile](screenshots/stage3/home-414.png)
- [Marketplace desktop](screenshots/stage3/marketplace-1440.png) / [Marketplace mobile](screenshots/stage3/marketplace-414.png)
- [Drawer mobile](screenshots/stage3/filters-414.png)

Capturas em 1440 × 900 e 414 × 896, além de 768/1024 para as duas rotas, aguardando imagens/fontes/catálogo. Regeneração: `node scripts/capture-catalog.mjs`, com dev server em 127.0.0.1:4174. Foram inspecionadas visualmente. Não há diff automatizado de pixels nem alegação de pixel-perfect.

Reutilizadas as referências Figma da Etapa 2, sem novas chamadas MCP desnecessárias. Diferenças deliberadas: busca acima do catálogo desktop; inputs mínimo/máximo no lugar do slider decorativo; radios e opção Todas; remoção de contagens não verificáveis; ordenação e totais acima da grade mobile; nove produtos por página também no mobile, preservando o catálogo completo. O primeiro lote tem oito NFTs conhecidos e um estudo, sem produto sem nome/preço. Estados assíncronos e drawer usam os tokens existentes.

## Inventário de arquivos

Criados sob `src/features/marketplace`: `api/nfts.ts`, `hooks/use-nfts.ts`, `hooks/use-catalog-url.ts`, `types/catalog.ts`, `utils/filters.ts`, `components/catalog.tsx`, `components/catalog-filters.tsx`. Também criados: `src/mocks/data/nfts.ts`, `src/mocks/handlers/nfts.ts`, `tests/e2e/catalog.spec.ts`, `scripts/capture-catalog.mjs`, esta documentação e `docs/screenshots/stage3/`.

Alterados: `src/app/router.tsx`, `src/types/nft.ts`, `src/features/marketplace/home-page.tsx`, `page.tsx`, `data/home.ts`, `src/components/marketplace/nft-card.tsx`, `src/components/ui/search-input.tsx`, `tabs.tsx`, `filter-trigger.tsx`, `src/components/layout/desktop-header.tsx`, `src/mocks/handlers/index.ts`, `src/index.css`, `tests/e2e/home.spec.ts`, README e documentos de arquitetura/design/validação. O teste Home acompanha os controles agora habilitados e nove cards mobile. Os testes de fundação permanecem intactos.

Sem novas dependências ou alterações de lockfile, build config, Playwright config, providers ou API de saúde. Não há testes unitários configurados. Limitações: seleção única de categoria/rede, fixtures finitas, ausência de backend real e de cenários de timeout dedicados. Detalhe completo, favoritos persistentes, autenticação, carrinho, checkout e Socket.IO permanecem fora desta etapa.
