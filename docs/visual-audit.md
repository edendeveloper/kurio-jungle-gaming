# Auditoria visual — Etapa 8A

Data da auditoria: 30/10/2026. Referências obtidas somente de `docs/design/references`; o Figma MCP não foi utilizado.

## Inventário de referências

Foram listados e abertos visualmente os 15 PNGs. Todos têm assinatura PNG válida, carregam e são legíveis; nenhum frame está ausente. Os nove frames desktop têm 1440 px de largura e os seis frames mobile têm 414 × 896 px. `pprfile.png` contém o frame Perfil; o nome do arquivo está grafado dessa forma no repositório.

| Referência | Dimensões |
| --- | ---: |
| Desktop: Home | 1440 × 3668 |
| Desktop: Detalhes NFT | 1440 × 2246 |
| Desktop: Carrinho | 1440 × 1754 |
| Desktop: Checkout | 1440 × 1657 |
| Desktop: Confirmação | 1440 × 1657 |
| Desktop: Login | 1440 × 1981 |
| Desktop: Cadastro | 1440 × 1981 |
| Desktop: Perfil (`pprfile.png`) | 1440 × 1080 |
| Desktop: Carteiras | 1440 × 1080 |
| Mobile: Home | 414 × 896 |
| Mobile: Detalhes NFT | 414 × 896 |
| Mobile: Carrinho | 414 × 896 |
| Mobile: Checkout | 414 × 896 |
| Mobile: Login | 414 × 896 |
| Mobile: Cadastro | 414 × 896 |

## Método e artefatos

O build de demonstração foi servido pelo preview local com MSW habilitado. As capturas Playwright aguardam a inicialização Socket.IO, o conteúdo principal da rota, fontes e imagens. Cenários privados usam o usuário de demonstração; carrinho e checkout recebem itens determinísticos. Capturas desktop usam 1440 × 900, mobile 414 × 896, `deviceScaleFactor: 1`; há imagens de viewport e página completa. O script coleta erros de página/console, falhas de requisição e respostas de API sem JSON ou com status 5xx. A captura final não registrou erros (`after/runtime-errors.json`: lista vazia).

O primeiro script de captura passava `width`/`height` como propriedades do contexto em vez de `viewport`. Isso fazia o Playwright usar a viewport padrão. A configuração foi corrigida para `viewport: { width, height }`; todos os PNGs mobile apresentados agora têm 414 × 896. O script espera resultados carregados e mantém os cenários alinhados entre as pastas.

- Antes e depois: `docs/screenshots/stage8/before/` e `docs/screenshots/stage8/after/`.
- Diferenças de pixel recortadas à área comum: `docs/screenshots/stage8/diffs/`.
- Tamanhos e contagem auxiliar de pixels alterados: `docs/screenshots/stage8/diffs/metrics.json`.
- Baselines Playwright aprovadas: `tests/e2e/visual-audit.spec.ts-snapshots/`.
- Automação das capturas e diferenças: `scripts/visual-audit-capture.mjs` e `scripts/visual-audit-diff.mjs`.

As imagens de diff são uma ajuda para localizar estrutura e cores. `metrics.json` usa comparação de pixels com limiar RGB 28, recorta a comparação ao menor retângulo comum e não representa uma pontuação de fidelidade. Diferenças de altura, texto, estado de conta e rendering de fonte precisam ser avaliadas visualmente. Dados mockados e conteúdo de edição também variam em relação aos frames estáticos.

## Correção aplicada

| Tela | Referência | Elemento | Divergência e evidência | Gravidade | Correção | Status |
| --- | --- | --- | --- |---|---|---|
| Login/Cadastro desktop | `login.png`, `register.png` | Fundo do diálogo | O fundo mostrava apenas uma grade decorativa de NFTs; o frame apresenta a Home sob o diálogo. Capturas iniciais em `before/login-desktop.png` e `before/register-desktop.png`. | P1 | `AuthBackdrop` agora reutiliza `HomePage` real dentro de região `inert`/`aria-hidden`; o fundo ocupa a área principal da janela. | Corrigido; conferido em `after/`. |
| Capturas de auditoria | Todas | Viewport | Capturas rotuladas mobile usavam a viewport padrão por configuração incorreta, invalidando a comparação. | P1 | Definida a opção Playwright `viewport`; dimensões PNG verificadas. | Corrigido. |

## Divergências da auditoria e resultado das correções — Etapa 8A.1

Não foi encontrada falha P0; nenhuma rota auditada ficou inacessível no cenário testado. As seguintes diferenças devem ser entendidas antes de se afirmar fidelidade pixel-perfect:

| Tela | Referência | Elemento | Diferença observada | Gravidade | Próxima correção possível | Status |
| --- | --- | --- | --- |---|---|---|
| Home desktop/mobile | `home.png` | Cards e catálogo | A estrutura e seções (hero, filtros, catálogo, promoções, Diário, newsletter e footer) estão presentes. Há variação de altura total desktop (+189 px na captura) e o grid mobile segue a composição escalonada, com conteúdo naturalmente continuando sob a navegação fixa. | P2 | Ajustar gaps e superfícies dos cards somente com nova decisão de design, pois há histórico de remoção intencional da moldura dos assets. | Em aberto. |
| Detalhes desktop | `nft-details.png` | Conteúdo abaixo da galeria | Galeria, resumo, abas, avaliações e relacionados estão presentes. O conteúdo é demonstrativo e a página mede 2218 px contra 2246 px no frame. | P2 | Afinar espaçamentos verticais e conteúdo editorial com dados equivalentes, sem mudar regras. | Em aberto. |
| Detalhes mobile | `nft-details.png` | Edições e compra | A galeria e barra de compra adaptada funcionam; o mock apresenta uma edição selecionada e informações resumidas, enquanto o frame inclui mais chips de edição. | P2 | Alinhar a apresentação de variantes quando os dados do domínio representarem as opções do frame. | Em aberto. |
| Carrinho desktop | `cart.png` | Linhas e espaçamento | Itens, resumo, cupom, recomendações e footer estão presentes. O padding vertical das linhas foi reduzido mantendo preço, subtotal e metadados; dados do mock seguem diferentes do frame. | P2 | Afinar apenas diferenças restantes de conteúdo e altura total. | Ajustado; altura e conteúdo dinâmico ainda diferem. |
| Carrinho mobile | `cart.png` | Itens e resumo | A referência mostra quatro linhas compactas antes de um resumo inferior fixo. A versão anterior mostrava duas linhas e parte da terceira, com o resumo após a lista. | P1 | Painel inferior fixo acima da navegação; linhas compactas mantêm preço/subtotal e controles alinhados. O resumo permanece disponível durante toda a navegação; a faixa do carrossel é posicionada acima do painel para permitir gesto horizontal. | Corrigido; validado em 414 px, cupom, checkout e interação touch. |
| Checkout desktop | `checkout.png` | Formulário e resumo | Duas colunas e todos os dados funcionais estão presentes. Campos de demonstração adicionais fazem a página ser mais longa que o frame. | P2 | Reduzidos gaps, alturas dos seletores e espaçamento dos itens sem retirar campos ou validações. | Ajustado; o conteúdo funcional ainda torna a página mais longa que a referência. |
| Checkout mobile | `checkout.png` | Ordem do conteúdo e ação final | A referência prioriza carteiras, provedores e CTA, enquanto a implementação começava pelos dados do colecionador e deixava a ação abaixo da rolagem. | P1 | A seção de rede/carteira agora vem primeiro no mobile; resumo e ação ficam fixos no rodapé sem cobrir a navegação (a barra de navegação não é exibida nessa rota). Seletor de carteiras e provedores foram compactados em colunas responsivas; dados do colecionador continuam acessíveis abaixo. | Corrigido; validado em 414 px e no fluxo do pedido. |
| Confirmação desktop/mobile adaptada | `order-success.png` desktop | Apresentação do resultado | Antes a confirmação aparecia em shell de página com header e footer e um título externo ao recibo. O frame apresenta um painel central. Não existe frame mobile oficial. | P1 | Header/footer removidos dessa rota; recibo centralizado em painel de 578 px, com metadados resumidos e identificadores abreviados somente na apresentação. IDs completos seguem no DOM acessível e em `title`; pedido, itens, preços e taxas continuam vindo da API mockada. | Corrigido estruturalmente; conteúdo de demonstração e extensão do recibo diferem do frame. |
| Login/Cadastro mobile | `login.png`, `register.png` | Provedores e saída | Campos principais estão presentes, porém Google/Facebook ficam explicitamente desabilitados e há saída “Continuar explorando sem entrar”/fechamento, necessários à demonstração e à navegação anônima. | P2 | Não simular OAuth; manter explicação acessível de indisponibilidade. | Divergência intencional. |
| Perfil desktop | `pprfile.png` | Dados de carteira | Perfil, avatar e senha existem. O mock separa ENS/apelido em carteira principal e mostra senha adicional; o frame põe ENS/apelido junto ao perfil. | P2 | Preservar a propriedade dos dados no domínio; refinar alinhamento dos campos se o contrato permitir. | Divergência de domínio. |
| Carteiras desktop/mobile adaptada | `wallets.png` desktop | Formulário e registros | O frame põe campos de carteira no início da área principal; antes a ação de cadastrar abria um diálogo e os registros ocupavam toda a largura. Não há frame mobile oficial. | P1 | Cadastro e edição agora usam formulário inline com a mesma grade de campos; registros ficam em duas colunas desktop e uma coluna em telas estreitas. Exclusão continua em diálogo de confirmação. | Corrigido; um único editor ativo reflete a carteira escolhida, enquanto os dados existentes permanecem em cards. |

## Cobertura das telas

Foram comparados os nove frames desktop e os seis frames mobile oficiais. Também foram capturadas adaptações mobile de confirmação, perfil e carteiras, sem atribuir a elas referência oficial. Os cenários incluem todas as seções principais da Home, detalhes e recomendações, resumo do carrinho, formulário/total de checkout, confirmação persistida, autenticação, perfil e registros de carteira.

As rotas de perfil e carteiras foram comparadas com sessão de demonstração. Home, detalhes e carrinho foram comparados como visitante. Os valores de pedido e timestamps são dados do mock, por isso não reproduzem textos de confirmação estáticos da referência.

## Acessibilidade observada

- Diálogo de autenticação continua modal com ciclo de foco; o backdrop da Home é inerte e não intercepta teclado.
- A barra mobile permanece fixa conforme o design; o conteúdo da página tem espaço inferior de rolagem.
- Capturas não substituem verificação de contraste por ferramenta; cores continuam nos tokens documentados.
- Checkout e carrinho usam painéis inferiores persistentes em mobile; foi verificado que a navegação não os cobre e que as ações continuam acessíveis. Os dados de perfil permanecem abaixo da etapa de carteira por rolagem.
- O teste visual confirma screenshots, não cobertura completa de leitor de tela ou contraste WCAG.
