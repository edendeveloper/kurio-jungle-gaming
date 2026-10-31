# Kurio — design system e estrutura visual (Etapa 2)

> Atualização Etapa 3: busca, filtros, abas, ordenação e paginação são funcionais. Mobile e desktop mostram a mesma página de produtos. Este documento preserva a entrega visual anterior; veja [catalog-api.md](catalog-api.md) para comportamento atual, capturas e divergências adicionais.

## Referência e limites de verificação

Arquivo: [Frontend Challenge — Copy](https://www.figma.com/design/dwXaL2NKtcLMPJIMpmFWLV/Frontend-Challenge--Copy-?node-id=0-1).

O Figma MCP autenticou e abriu a cópia. `get_design_context` retornou contexto detalhado e screenshots de Desktop / Início (`2:2`) e Mobile / Início (`14:5226`). A implementação adapta esses retornos à arquitetura React existente. Os metadados previamente obtidos nesta conversa de Detalhes (`10:244`), Carrinho (`11:1278`), Pagamento (`11:2862`), Perfil (`9:1238`) e Carrinho mobile (`16:360`) foram reaproveitados para identificar a estrutura compartilhada; não houve nova inspeção detalhada dessas telas nem implementação de seus fluxos.

Depois das duas consultas detalhadas, `download_assets` retornou o limite de chamadas do plano Starter. `whoami` confirmou a sessão autenticada; o erro foi de quota, não de autenticação ou permissão. Os assets foram baixados das URLs originais entregues por `get_design_context`, sem depender delas em runtime. Não foi possível concluir uma nova exportação via `download_assets` nesta etapa. Nenhum arquivo do Figma foi alterado.

## Cores

Fonte única: `src/index.css`, em `:root`, com aliases shadcn/ui e integração `@theme inline` do Tailwind v4. Não há arquivo de configuração Tailwind legado.

| Token CSS          | Valor     | Utilitário Tailwind          |
| ------------------ | --------- | ---------------------------- |
| `--primary`        | `#D28A4C` | `bg-primary`, `text-primary` |
| `--secondary`      | `#B39463` | `text-secondary`             |
| `--background`     | `#140D0A` | `bg-background`              |
| `--foreground`     | `#F5F1EB` | `text-foreground`            |
| `--text-primary`   | `#F7F3EC` | `text-text-primary`          |
| `--text-secondary` | `#CFB28C` | `text-text-secondary`        |
| `--text-accent`    | `#E89B55` | `text-text-accent`           |
| `--text-coral`     | `#F0805F` | `text-text-coral`            |
| `--surface-card`   | `#241612` | `bg-surface-card`            |
| `--surface-dark`   | `#38220F` | `bg-surface-dark`            |
| `--surface-raised` | `#2F1D15` | `bg-surface-raised`          |
| `--border`         | `#3F2319` | `border-border`              |
| `--border-soft`    | `#55321F` | `border-border-soft`         |
| `--success`        | `#00A66C` | `text-success`               |
| `--amber`          | `#E3A44E` | `text-amber`                 |

`card`, `popover`, `muted`, `accent`, `input`, `ring` e suas cores de texto são aliases semânticos. Primary/Secondary foreground usam Background, evitando texto claro sobre botões de cobre. O raio base é 6 px. Cards de arte usam os raios específicos de 15/16/20/24 px da referência.

## Tipografia

Roboto Mono, pesos 400, 500 e 700, hospedada localmente em `public/assets/fonts`. Licença OFL incluída. Não há dependência de Google Fonts em runtime nem novos pacotes.

Os valores abaixo são propriedades retornadas pelo contexto dos nós, não inferências dos nomes de estilos:

| Uso                    | Tamanho / entrelinha                      | Peso    |
| ---------------------- | ----------------------------------------- | ------- |
| Display desktop        | 43 / 70 px                                | 700     |
| Display mobile         | 18 / 29 px                                | 700     |
| Título editorial       | 28 px / normal                            | 700     |
| Título de promoção     | 18 / 24 px                                | 700     |
| Título de filtros      | 18 / 16 px                                | 700     |
| Título de benefício    | 17 / 16 px                                | 700     |
| Nome do NFT desktop    | 16 / 16 px                                | 400     |
| Nome do NFT mobile     | 15 px / normal (20 px adotados no layout) | 400     |
| Preço desktop / mobile | 18 / 16 px e 16 / 16 px                   | 700     |
| Corpo do hero desktop  | 14 / 24 px                                | 400     |
| Corpo do hero mobile   | 12 / 18 px                                | 400     |
| Texto do footer        | 14 / 22 px                                | 400     |
| Legenda editorial      | 12 / 16 px                                | 500     |
| Labels do filtro       | 15 / 40 px                                | 400/700 |

Tokens `--type-*` centralizam os estilos principais; o tema também expõe `text-caption`, `text-body`, `text-body-large` e `text-display`. A família é compartilhada por `font-sans` e `font-mono`.

O MCP também retornou estilos com `lineHeight: 100` sem unidade e nomes divergentes, como estilos cujo sufixo anuncia uma entrelinha diferente. Esses valores não foram convertidos em 100 px. Foram usados os valores explícitos do contexto de cada nó ou o comportamento `normal` indicado no retorno. Nem todos os estilos globais foram reinspecionados devido à quota.

## Layout e espaçamentos

| Medida                      | Referência implementada                                           |
| --------------------------- | ----------------------------------------------------------------- |
| Container desktop           | máximo 1200 px; margens de 120 px em 1440                         |
| Margem em tablet            | 32 px                                                             |
| Home mobile                 | 24 px; 16 px abaixo de 390 px                                     |
| Topo desktop / mobile       | 24 px / 40 px                                                     |
| Header                      | 45 px; 32 px até o hero                                           |
| Hero desktop / mobile       | 1200 × 450 / 366 × 190 px nas larguras de referência              |
| Separação de seções desktop | 96 px                                                             |
| Sidebar                     | 310 px; intervalo de 48 px até a grade                            |
| Grade desktop em 1440       | 3 colunas de 258 px; gaps de 34 px horizontal e 72 px vertical    |
| Card desktop                | arte em área 258 × 300 px; imagens geralmente 250 × 250 px        |
| Grade mobile em 414         | 2 colunas de 175 px, gap horizontal de 16 px e vertical de 24 px  |
| Card mobile                 | área de arte 175 × 200 px; imagem de aproximadamente 168 × 168 px |
| Coluna direita mobile       | deslocamento vertical de 32 px                                    |
| Paginação                   | botões de 35 px; gap de 8 px                                      |
| Navegação mobile            | 126 px incluindo botão central elevado; safe area adicional       |

Em 1440 px, a inspeção no navegador confirmou hero em y=101, catálogo em y=647, grade em y=697, promoções em y=2116, editorial em y=2462 e footer em y=3034, correspondendo aos metadados do frame. A grade tem 842 × 1200 px. Em 414 px, o hero começa em y=101 e o catálogo em y=307.

Os espaçamentos extraídos de geometria não são apresentados como tokens de Auto Layout verificados. Constraints e breakpoints originais não foram retornados integralmente.

## Breakpoints e responsividade

| Largura             | Decisão                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Até 389 px          | margem de 16 px e hero reduzido para preservar legibilidade                                                      |
| Até 767 px          | busca e filtro no topo, hero mobile, quatro cards do frame, duas colunas desencontradas, navegação inferior fixa |
| 768–1023 px         | header desktop, sidebar de 240 px e duas colunas de NFTs                                                         |
| 1024–1279 px        | sidebar de 240 px e três colunas; hero fluido                                                                    |
| A partir de 1280 px | proporções completas desktop; container limitado a 1200 px                                                       |

Esses breakpoints são decisões de implementação. Somente os frames 1440 e 414 foram fornecidos como referências visuais. Editorial, promoções, newsletter e footer continuam disponíveis ao rolar no mobile. O padding inferior de 142 px mais safe area evita esconder o fim do conteúdo sob a navegação. As imagens mantêm proporção, com `object-fit: cover` nos recortes previstos pelo design.

## Componentes compartilhados

| Componente         | Arquivo / API                                                                      |
| ------------------ | ---------------------------------------------------------------------------------- |
| `NFTCard`          | `src/components/marketplace/nft-card.tsx`: recebe `Nft`, `mobile` e `showFavorite` |
| `SectionHeading`   | `src/components/ui/section-heading.tsx`: título, descrição e className             |
| `PrimaryButton`    | alias do Button shadcn/ui existente; mantém Radix Slot, CVA e `asChild`            |
| `SecondaryButton`  | variante secundária do mesmo Button                                                |
| `SearchInput`      | input tipado, label acessível, ajuda e suporte a props nativas                     |
| `FilterTrigger`    | botão com SVG original, nome acessível e indicação de indisponibilidade            |
| `PriceLabel`       | preço ETH e preço anterior opcional                                                |
| `Badge`            | elemento visual tipado e composição de classes                                     |
| `Breadcrumbs`      | itens tipados e links do Router; reservado para as próximas telas                  |
| `Tabs`             | tablist com seleção, painel associado e categorias futuras desabilitadas           |
| `NewsletterForm`   | formulário com label e indicação de inscrições futuras                             |
| `DesktopHeader`    | links reais, estado ativo e `cartQuantity` (0 nesta etapa)                         |
| `DesktopFooter`    | benefícios, newsletter, contato, links, redes e carteiras                          |
| `MobileNavigation` | início, favoritos indisponíveis, mercado, carrinho e perfil                        |

`AppLayout` compõe o shell sem alterar providers ou árvore de rotas. A Home ocupa somente `/`; as outras páginas permanecem os placeholders existentes. Os dados demonstrativos ficam em `src/features/marketplace/data/home.ts`; o contrato `Nft` fica em `src/types/nft.ts`. Nenhum NFT é declarado dentro de um componente visual.

A navegação mantém `aria-current`, há link para pular conteúdo e foco visível em controles. Ações futuras usam `aria-disabled`, nomes/títulos explícitos e não possuem efeitos de sucesso. Os inputs demonstrativos são somente leitura. O formulário impede submissão sem apresentar confirmação. Botões nativamente desabilitados também recebem tratamento visual. O status MSW da Etapa 1 foi preservado no footer, inclusive a recuperação de erro.

## Assets

```text
public/assets/
  nfts/          # 4 PNGs originais de 1254 × 1254 px
  icons/         # SVGs do header, mobile, favoritos e redes
  decorations/   # backgrounds, indicadores e navegação exportados
  fonts/         # Roboto Mono 400/500/700 e OFL.txt
```

| Imagem local      | Nós de origem / usos confirmados                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `emerald-ape.png` | `70342:2673`, `4:137`, `14:5238`: hero, Emerald Ape, primeira promoção e segundo editorial                                 |
| `sage-nomad.png`  | `70410:3798`, `4:162`, `14:5239`: destaque, Sage Nomad, Cosmic Bloom, Violet Nomad, miniatura do hero e terceiro editorial |
| `neon-vessel.png` | `4:164`, `15:5416`: Neon Vessel, Ivory Baron, segunda promoção e primeiro editorial                                        |
| `golden-beat.png` | `4:286`, `15:5431`: última linha desktop, quarto card mobile e quarto editorial                                            |

O próprio Figma reutiliza essas quatro imagens em diferentes NFTs. A implementação preserva esse mapeamento; não foram inventadas artes novas. O oitavo slot desktop não tem título nem preço no frame: mantém essa ausência visual, com nome acessível explicando o item sem título. Não há placeholders de imagem, imagens externas ou conteúdo gerado por IA.

Todos os arquivos foram gravados localmente e conferidos como não vazios. Playwright verifica que os caminhos de imagens são locais, decodifica as imagens visíveis e verifica a geometria quadrada do primeiro card em todas as larguras. SVGs mantêm seus arquivos originais; a navegação usa o background exportado, e seu ícone central compõe os cinco SVGs retornados pelo MCP. Não há URLs temporárias no código.

## Comparação visual e divergências conhecidas

Capturas Playwright em CSS pixels, após fontes e imagens carregarem:

- [Desktop 1440 × 900](screenshots/home-1440x900.png)
- [Mobile 414 × 896](screenshots/home-414x896.png)
- [Desktop completo](screenshots/home-1440-full.png)
- [Mobile completo](screenshots/home-414-full.png)

As capturas foram inspecionadas visualmente contra as imagens retornadas pelo Figma MCP. Foram corrigidos gaps e altura da grade desktop, alinhamento das tabs mobile e recorte da navegação inferior. Não há comparação automatizada de pixels nem alegação de pixel-perfect; a referência desktop retornada pelo MCP está reduzida.

Divergências deliberadas e limitações:

- O badge do carrinho mostra 0, pois não existe carrinho populado nesta etapa; o Figma ilustra outro valor.
- O terceiro e quarto cards mobile usam os nomes coerentes com as artes do catálogo desktop (Neon Vessel e Golden Beat). O frame mobile repete textos de Emerald Ape e Sage Nomad nesses slots.
- O preço anterior usa semântica e apresentação tachada para distinguir preço antigo.
- O footer permite altura de conteúdo sem recortar texto e inclui a mensagem de newsletter indisponível e o status MSW. Por isso, a página desktop fica aproximadamente 48 px mais alta que o frame de 3668 px.
- Mobile apresenta seções adicionais ao rolar, pois a referência de 896 px mostra apenas hero, catálogo e navegação.
- Tablet tem composição adaptada; não há frame específico para confirmar fidelidade nessas larguras.
- Não foi possível refazer `download_assets` nem consultar contextos adicionais após a quota do Starter. Os assets necessários à Home estavam disponíveis nos dois contextos obtidos.
- Hover, foco e indicação de rota ativa acrescentam estados de acessibilidade não detalhados pelo MCP.

## Validação e próxima etapa

`tests/e2e/foundation.spec.ts` foi preservado. `tests/e2e/home.spec.ts` acrescenta renderização, cards, links, estados futuros, teclado, navegação mobile e larguras 414/768/1024/1440. Screenshots são regeneradas em `test-results/screenshots`; as cópias revisadas desta entrega estão em `docs/screenshots`.

Continuam pendentes busca, filtros, ordenação, paginação funcional, favoritos, newsletter, autenticação, dados remotos do catálogo, estado do carrinho e fluxos de compra/blockchain. Nenhuma dessas funcionalidades foi simulada como concluída nesta etapa.

## Inventário de arquivos da etapa

Modificados:

- `index.html`: cor do navegador alinhada ao Background oficial.
- `src/index.css`: tokens, fontes, tema Tailwind/shadcn e estilos responsivos.
- `src/app/router.tsx`: Home real na rota raiz.
- `src/components/layout/app-layout.tsx`: composição do shell compartilhado.
- `src/components/ui/button.tsx`: variantes e exports PrimaryButton/SecondaryButton.
- `docs/validation.md`: resultados da Etapa 2, preservando o histórico anterior.

Criados:

- `src/features/marketplace/home-page.tsx` e `src/features/marketplace/data/home.ts`.
- `src/types/nft.ts`.
- `src/components/marketplace/nft-card.tsx`.
- `src/components/layout/desktop-header.tsx`, `desktop-footer.tsx`, `mobile-navigation.tsx` e `newsletter-form.tsx`.
- `src/components/ui/badge.tsx`, `breadcrumbs.tsx`, `filter-trigger.tsx`, `price-label.tsx`, `search-input.tsx`, `section-heading.tsx` e `tabs.tsx`.
- `tests/e2e/home.spec.ts`.
- `docs/design-system.md` e quatro capturas em `docs/screenshots/`.
- Assets em `public/assets/nfts/`, `icons/`, `decorations/` e `fonts/`.

Dependências, lockfile, configurações, providers, camada de API/MSW e testes da fundação foram preservados. Não foram criados commits.
