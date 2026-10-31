# Etapa 7 — tempo real via Socket.IO e MSW

Validação final em 30/10/2026. `npm run build`, `npm run build:demo`, `npm run lint`, `npm run typecheck` e `npm run test:unit` passaram; unitários: **15 aprovados**. O build comum mantém mocks desligados; `build:demo` ativa MSW pela variável explícita `VITE_ENABLE_MOCKS=true`.

O preview de produção foi validado pela suíte `playwright.preview.config.ts`: **38 aprovados** em Chromium desktop e mobile, executados sequencialmente. Ela verifica o handshake e o ping/pong Socket.IO, `nft.updated`, atualização de catálogo/carrinho, rejeição de evento repetido/antigo, reconexão e reconciliação REST, resposta HTML inválida para carrinho e fluxo de checkout/cotação. Uma execução concorrente inicial teve uma falha transitória isolada no teste de carrinho (201 em vez de 409); o caso passou sozinho e a suíte completa passou sequencialmente.

A suíte E2E geral (`npm run test:e2e -- --workers=4`) executou 214 casos: **212 aprovados, 2 ignorados e nenhuma falha**. Os dois ignorados são os casos existentes exclusivos do projeto mobile quando executados no projeto desktop. A regressão de 414 px foi causada pelo `<output>` de diagnóstico de `RealtimeConnection`, renderizado antes do RouterProvider em fluxo normal: sua linha inline de 24 px deslocava o `.app-shell` e a galeria. A região continua disponível para leitores de tela, agora com `sr-only`; a aplicação e `.nft-gallery` voltaram a y=0. `tests/e2e/nft.spec.ts` também verifica o y do shell para impedir retorno desse deslocamento. O erro `reduce` não foi reproduzido: o teste de regressão fornece resposta HTTP 200 `text/html`, confirma que o cliente rejeita o contrato e a interface recupera por retry sem erro de página.

Na prova Socket.IO, o console do navegador confirmou a ordem `[realtime] MSW initialized` → `[realtime] native WebSocket probe intercepted` → `[realtime] intercepted Socket.IO connection` → `[realtime] Socket.IO binding initialized` → `[realtime] Socket.IO client connected` → `[realtime] ping-test received` → `[realtime] pong-test sent` → `[realtime] pong-test received`. Os mesmos testes passaram no preview de produção nos dois projetos. MSW normaliza `/socket.io/` para `/` antes de matching; o handler agora usa RegExp limitada à origem ativa e ao pathname normalizado.

O mock de preço/estoque é compartilhado entre eventos e endpoints REST. Eventos são validados em runtime e aceitos somente quando o ID ainda não foi visto e a versão supera a versão recebida e a conhecida pelo cache. Pedidos são limitados à sessão assinante; estados `confirmed` e `rejected` são terminais. Em reconexão, consultas ativas são reconciliadas pela API. A cotação materialmente alterada exige aceite explícito antes da confirmação.

## Etapa 8A — auditoria visual

Validação final em 30/10/2026. Foram inspecionados visualmente todos os **15 PNGs de referência** (9 desktop, 6 mobile); nenhum estava ausente ou ilegível. As capturas de implementação estão em `docs/screenshots/stage8/before/` e `after/`, e as comparações auxiliares em `diffs/`. Todas as imagens before/after usam os mesmos cenários e viewports: desktop 1440 × 900 e mobile 414 × 896. Também foram conferidas as larguras intermediárias de 390, 768, 1024 e 1440 px por capturas e/ou cobertura responsiva existente.

`npm run build:demo`, `npm run lint`, `npm run typecheck` e `npm run test:unit` passaram; unitários: **15 aprovados**. A suíte E2E completa no servidor Vite de desenvolvimento passou com **220 aprovados, 10 ignorados e nenhuma falha**. Os ignorados são verificações visuais de viewport executadas apenas no projeto correspondente e dois casos de navegação/filtros mobile que não se aplicam ao projeto desktop. O teste visual em preview de produção passou: **8 aprovados, 8 ignorados** (cada captura é executada uma vez no projeto de dispositivo correspondente).

As capturas finais no preview passaram pela coleta de erros do browser, console, falhas de requisição e respostas de API inválidas: `docs/screenshots/stage8/after/runtime-errors.json` contém uma lista vazia. Uma tentativa de executar toda a suíte geral no preview não é compatível com os testes que dependem de imports de módulos-fonte do Vite (`accounts.spec.ts`) e de um controle de login fictício disponível somente em `import.meta.env.DEV` (`anonymous.spec.ts`). A suíte completa passou no servidor de desenvolvimento; os testes visuais e a validação de realtime foram executados no build de demonstração/preview.

Ajuste visual aplicado: o fundo das telas de login/cadastro em desktop agora reutiliza a Home real em camada inerte, alinhando a composição ao frame, sem bloquear o formulário. Os PNGs de diff são instrumentos de inspeção e suas métricas de pixels alterados não são tratadas como nota de fidelidade. Divergências P1/P2 restantes e limitações estão descritas em `docs/visual-audit.md`; não se declara fidelidade pixel-perfect.

# Validação da etapa 1

## Etapa 6 — conta, perfil e carteiras

**Resultado final em 30/10/2026:** `npm run build`, `npm run lint`, `npm run typecheck` e `npm run test:unit` aprovados; unitários: **12 aprovados**. `npm run test:e2e -- --workers=4`: **190 aprovados, dois ignorados, nenhuma falha**, exit code 0. `.last-run.json` registra `passed` e nenhuma falha. Os 38 cenários novos de conta passaram em desktop e mobile. O acesso a recursos da outra conta, o descarte de requests antigos e a retomada de compra após expiração foram verificados pelos testes.

Adicionados 19 cenários de conta nos dois projetos Playwright (38 casos), mais cinco testes unitários de credenciais, retorno seguro, perfil/avatar, carteiras e conciliação idempotente. Os sete unitários de checkout anteriores permanecem. A suíte completa passa a ter 192 casos, mantendo os dois ignores históricos exclusivos de mobile no projeto desktop. Nenhum caso novo de conta é ignorado.

Cobertura por UI e MSW: cadastro/conflitos, login e foco, refresh, logout, ID arbitrário recusado, guards e retorno, carrinho visitante/conta e conflitos de estoque, perfil salvo/conflito/404/erro, avatar com preview/limites/persistência/remoção, senha incorreta e revogação, CRUD de carteiras e principal/secundária, confirmação e teclado nos diálogos, isolamento de favoritos/carteiras/carrinhos/pedidos entre Nova e Luna, request pendente cancelado, contexto antigo recusado antes de revalidação, expiração automática e durante checkout, cadastro de carteira e retorno à compra, header e bloqueio de destino externo.

Testes anteriores foram mantidos. Onde usavam `kurio:session-user`, passaram a autenticar pela API; placeholders de perfil/checkout agora recebem sessão válida. O caso de recomendações que avançava anonimamente ao checkout foi atualizado para atravessar o guard/login e continuar conferindo o subtotal. Nenhuma proteção ou cobertura foi removida.

Na investigação, a Home usada no fundo do login foi substituída por prévia pública sem efeito sobre o Router, pois sua normalização de URL removia `returnTo`. O controle de cancelamento Axios passou a reconhecer URLs privadas com query string. O teste atrasado aguarda o início da request e verifica cancelamento antes de navegar entre documentos. Os cenários críticos de isolamento e retomada passaram nos dois projetos.

Build, lint, typecheck e os 12 unitários aprovados. Há aviso de chunk acima de 500 kB (aproximadamente 530 kB minificado / 166 kB gzip); a configuração não foi alterada para ocultá-lo. O resultado E2E final é registrado após a última execução. O teardown Windows continua exigindo encerrar o Vite criado pelo runner depois de todas as asserções.

Oito capturas em [screenshots/stage6](screenshots/stage6): login, cadastro, perfil e carteiras com viewports 1440 × 900 e 414 × 896, página completa e escala CSS. Foram revisados os painéis, sidebar e formulários, sem novas consultas MCP ou alegação de comparação pixel-perfect. Contratos, arquivos, armazenamento e limites: [authentication.md](authentication.md) e [profile-wallets.md](profile-wallets.md).

## Etapa 5.1 — recomendações e ajustes do carrinho

Validação completa: `npm run build`, `npm run lint` e `npm run typecheck` aprovados; `npm run test:unit` com sete aprovados. `npm run test:e2e -- --workers=4`: **152 aprovados, dois ignorados**, nenhuma falha, exit code 0. Os ignorados continuam sendo navegação e drawer exclusivos do mobile no projeto desktop. O teardown do Vite no Windows foi liberado após o término de todas as asserções, como nas etapas anteriores. Depois da revisão do espaçamento até o footer, build, lint e typecheck passaram novamente. Os casos da seção e o fluxo completo de checkout foram repetidos nos dois projetos: **16 aprovados**, nenhuma falha, exit code 0, com capturas renovadas. O teste desktop verifica também o intervalo de 96 px até o footer.

Adicionados sete cenários Playwright nos dois projetos: cinco cards desktop e dados esperados, navegação entre páginas por clique/teclado e abertura dos detalhes, scroll nativo e gesto real de toque via CDP no mobile, loading independente dos controles financeiros, erro/retry, vazio e capturas em 1440/414 px. Os 14 casos focados passaram. A primeira execução detectou overflow causado por rótulos acessíveis absolutos de páginas inativas; `position: relative` no viewport do carrossel corrigiu a causa, sem esconder overflow globalmente. A largura do documento permanece igual à viewport, inclusive depois de navegar até a última página.

Os controles e cálculos anteriores e o fluxo completo de checkout continuam cobertos pela suíte existente. Nenhuma alteração em autenticação, pagamentos, contratos financeiros ou checkout. A quota do Figma MCP foi respeitada: nenhuma nova chamada. Capturas revisadas em [screenshots/stage5-1](screenshots/stage5-1), com as limitações de assets e de referência documentadas em [checkout.md](checkout.md).

## Etapa 5 — carrinho, checkout e confirmação

Resultado final em 30/10/2026: `npm run build`, `npm run lint` e `npm run typecheck` aprovados, exit code 0. `npm run test:unit`: **7 aprovados**, nenhuma falha. `npm run test:e2e -- --workers=4`: **138 aprovados, 2 ignorados, nenhuma falha**, exit code 0, em 3,3 minutos. Foram preservados os testes anteriores. Os dois casos ignorados continuam exclusivos de mobile no projeto desktop. A captura de screenshots foi repetida pelo fluxo completo nos dois projetos após ajustar o scroll inicial, sem mudanças na implementação: **2 aprovados**, exit code 0. Lint e typecheck também foram repetidos e aprovados após esse ajuste no helper de captura. O último `.last-run.json` registra `passed` e nenhuma falha.

O carrinho persistente da Etapa 4 foi evoluído, com migração legada, identidade NFT + edição, quantidades, cupons, cotação, pedido idempotente e comprovante persistido. Contratos, arquivos, regras monetárias, cenários e instruções manuais estão em [checkout.md](checkout.md).

Há sete testes unitários nativos do Node, sem dependências novas: cálculo exato de 18 casas, somas, quantidades, limites, desconto percentual/fixo, taxas, cupons e validação de formulário/carteira. Os 15 cenários E2E novos são executados em desktop e mobile, totalizando 30 casos. Cobrem fluxo desde detalhes, refresh, badge, quantidades e estoque, erro de API/retry, cupons, checkout vazio, formulário, redes e endereços, cotação expirada, totais autoritativos, idempotência concorrente, conflitos, preço/estoque/cupom alterados, rejeição, resposta perdida e recuperação, snapshot imutável, autorização e migração do carrinho.

A suíte completa inicial terminou com 138 aprovados e dois ignorados. Uma execução focada posterior sofreu recarregamentos do Vite enquanto outros comandos gravavam arquivos de build; os traces mostraram reconexões simultâneas do HMR em páginas de testes distintos. A validação final roda sem builds ou edições concorrentes. Os dois testes ignorados existentes são navegação e drawer exclusivos de mobile no projeto desktop; nenhum teste foi removido ou silenciosamente ignorado.

Capturas finais em [screenshots/stage5](screenshots/stage5): carrinho, checkout e confirmação em 1440 × 900 e 414 × 896, com versões de viewport (`*-viewport.png`) e página completa. Fontes e imagens são aguardadas antes de capturar, com scroll inicial zerado para evitar artefatos de elementos fixos fora da viewport. Também são verificadas larguras 768 e 1024 e ausência de overflow, inclusive com preços de 18 casas. A inspeção visual motivou ajustes de margens mobile, dimensões de arte e cards de seleção de carteira/provedor. Os PNGs originais e tokens globais não foram alterados. A quota Starter do Figma MCP impediu novas imagens de referência; foram usados metadados previamente obtidos, sem alegação de comparação pixel-perfect.

O ambiente Windows mantém o problema de teardown descrito nas etapas anteriores: após todas as asserções, o processo Vite iniciado pelo runner é encerrado para liberar o relatório e o exit code. Isso não substitui a execução ou as asserções dos testes.

## Resultado atual — Etapa 4: detalhes do NFT

Em 30/10/2026 foram executados novamente os quatro scripts existentes: `npm run build`, `npm run lint`, `npm run typecheck` e `npm run test:e2e` (npm.cmd no Windows). Todos aprovados. Playwright: **108 aprovados, 2 ignorados, nenhuma falha**, exit code 0. Os dois casos ignorados continuam exclusivos do mobile no projeto desktop. Não existe runner unitário configurado.

`tests/e2e/nft.spec.ts` adiciona 34 execuções nos dois projetos: catálogo → NFT, acesso direto/refresh, galeria e ampliação com foco/Escape, quantidade mínima/máxima e total decimal, atualização de preço/estoque com correção de seleção/cache, esgotado, favoritos com 401 anônimo, persistência, rollback e isolamento por usuário, abas e avaliações vazias, relacionados e navegação, POST de carrinho/quantidade/refresh, conflito de estoque, 404, loading, erro/retry e larguras 414/768/1024/1440. Testes existentes passaram, incluindo as regressões da busca e transparência dos cards.

Expectativas antigas de placeholder foram atualizadas: `/nft/exemplo` agora recebe 404 de recurso e exibe NFT não encontrado; o teste Home retorna pelo histórico após abrir detalhe, pois o mobile usa a barra de compra do frame em vez da navegação inferior genérica.

Capturas em [screenshots/stage4](screenshots/stage4), viewport e página completa, em 1440 × 900 e 414 × 896 CSS pixels, com fontes/imagens carregadas. A revisão visual identificou e corrigiu conflito de margem/padding global no mobile; os testes passaram a verificar explicitamente galeria em x=0/y=0 com largura 414 e folha em y=392. Bordas arredondadas e proporções foram preservadas; não foram editados PNGs ou tokens globais. Os botões dos indicadores mobile têm área de interação de 24 px.

Figma MCP: sessão/autenticação funcionaram, mas get_design_context e get_screenshot dos frames desktop/mobile retornaram quota Starter. Foram aproveitados metadados obtidos anteriormente e assets originais locais. Não foi possível fazer comparação visual nova contra screenshots do Figma nem declarar fidelidade pixel-perfect. Contratos, diferenças, presets de sessão e instruções manuais estão em [nft-detail.md](nft-detail.md).

Carrinho é integração mínima confirmada por API, sem checkout. Favoritos exigem sessão do mock; autenticação completa não foi adicionada. Socket.IO permanece dependência pendente, sem eventos simulados na UI. Nenhum commit ou implementação da Etapa 5. Como nas execuções anteriores, o Vite criado pelo runner foi encerrado depois das asserções para liberar o teardown no ambiente Windows; o comando retornou exit code 0.

## Correções da Etapa 3 — busca e superfície dos cards

Executados novamente `npm run build`, `npm run lint`, `npm run typecheck` e `npm run test:e2e` via npm.cmd. Todos aprovados. Playwright: **74 aprovados, 2 ignorados, nenhuma falha**, exit code 0. As duas exceções continuam sendo casos exclusivos de mobile no projeto desktop.

Antes da correção, os quatro novos casos desktop falharam reproduzindo perda de foco após a pesquisa e fundo `rgb(36, 22, 18)` na área de arte. A causa da busca era `key={filters.search}` em SearchControl, que substituía o input a cada termo aplicado. A key foi removida e o editor agora distingue confirmação do termo submetido de alterações externas da URL. O debounce continua em 300 ms, com cancelamento na limpeza do efeito. Não foram adicionadas chamadas focus() à busca nem alterados Router, API ou Query.

A moldura vinha de `.nft-card-art`: fundo Surface Card no desktop e gradiente Surface Card/Surface Raised no mobile, visíveis ao redor do asset nas áreas de padding. Ambos agora são transparentes. Padding, proporções, object-fit e raios das imagens foram preservados; PNGs e superfícies de filtros/outros componentes não foram modificados. A remoção da superfície externa segue a correção visual solicitada; não houve nova consulta MCP nem alegação de nova validação pixel-perfect do Figma.

`tests/e2e/catalog-regressions.spec.ts` adiciona oito execuções (Home/Marketplace, desktop/mobile): digitar Emerald, aguardar resultados, clicar e continuar digitando, apagar, selecionar/substituir parte do texto, Ctrl+A/Backspace, limpar, reload e Tab. Confere foco durante atualização lenta e identidade do nó DOM, estilos computados de card/área de arte/link, transparência e ausência de gradiente, proporções, object-fit, border-radius e ausência de overflow. Também confirma que a superfície do painel de filtros permanece intacta. Todos os testes anteriores foram mantidos e passaram, incluindo histórico e respostas fora de ordem.

Capturas geradas com fontes/imagens carregadas e inspecionadas visualmente:

- [Marketplace desktop 1440 × 900](screenshots/stage3-fixes/marketplace-1440.png)
- [Marketplace mobile 414 × 896](screenshots/stage3-fixes/marketplace-414.png)
- [Home desktop 1440 × 900](screenshots/stage3-fixes/home-1440.png)
- [Home mobile 414 × 896](screenshots/stage3-fixes/home-414.png)

Arquivos de implementação alterados: `src/features/marketplace/components/catalog.tsx` e `src/index.css`. Acrescentados os testes e quatro screenshots acima; atualizados apenas estes registros de validação e o parágrafo de sincronização em catalog-api.md. Nenhuma dependência, configuração, funcionalidade de outra etapa ou commit foi introduzido. O teardown Windows exigiu encerrar o Vite criado pelo runner após todas as asserções, como nas validações anteriores.

## Resultado atual — Etapa 3

Em 30/10/2026, executados `npm run build`, `npm run lint`, `npm run typecheck` e `npm run test:e2e` (via npm.cmd no Windows). Build, lint e typecheck aprovados. Playwright: **66 aprovados, 2 ignorados, nenhum reprovado**, exit code 0; `.last-run.json` registra passed. Os dois casos ignorados são exclusivos do mobile executados no projeto desktop. Não há suíte unitária configurada.

Os 20 casos da fundação permanecem intactos. Testes Home foram atualizados para nove resultados também no mobile e controles funcionais. O novo arquivo catalog.spec.ts cobre MSW real, busca por nome/coleção, vazio, categoria/rede/preço combinados, validação monetária, preservação de 18 casas decimais na URL/refresh, ordenação/empates, abas/teclado, paginação, Back/Forward, URL inválida, limite de página, drawer/foco/Escape, erro/retry, respostas fora de ordem e atualização lenta com cards anteriores. Os testes de Home seguem cobrindo larguras 414/768/1024/1440 e overflow.

Foram corrigidos antes da execução final o parser de preços da URL, o ciclo de foco do drawer e a comparação dos filtros para preservar dados durante paginação. Não há fallback de produtos no erro. A API é exercitada pelos handlers MSW, sem serviços externos.

Capturas revisadas de Home e Marketplace em 414 × 896, 768 × 900, 1024 × 900 e 1440 × 900, mais drawer mobile, estão em [screenshots/stage3](screenshots/stage3). Contratos, cenários, cache e divergências estão em [catalog-api.md](catalog-api.md). O servidor de revisão foi usado apenas para capturas. Assim como na Etapa 2, o Vite criado pelo runner foi encerrado ao término das asserções para liberar o teardown no ambiente Windows; a execução retornou exit code 0.

Os resultados das etapas anteriores abaixo foram mantidos como histórico.

Executada em 30/10/2026 no Windows, Node 26.13.0 e npm, com Chromium instalado pelo Playwright.

| Comando                               | Resultado                                     |
| ------------------------------------- | --------------------------------------------- |
| `npm.cmd install`                     | Sucesso; nenhuma vulnerabilidade reportada    |
| `npx.cmd msw init public --save`      | Worker oficial gerado                         |
| `npx.cmd playwright install chromium` | Chromium e dependências auxiliares instalados |
| `npm.cmd run format`                  | Projeto formatado                             |
| `npm.cmd run build`                   | TypeScript e Vite concluídos                  |
| `npm.cmd run lint`                    | Sem erros ou warnings                         |
| `npm.cmd run typecheck`               | Sem erros                                     |
| `npm.cmd run test:e2e`                | 20 testes aprovados em 10,1 segundos          |

O Playwright executou `npm run dev` automaticamente e confirmou que a aplicação estava acessível. O teste de saúde confirmou status HTTP 200, payload esperado e `fromServiceWorker() === true`. As oito rotas e o fallback passaram em acesso direto e refresh, com larguras de 1440 e 390 pixels.

A primeira instalação encontrou incompatibilidade entre TypeScript 7 do template e typescript-eslint, resolvida com TypeScript 6. A geração inicial do worker encontrou um BOM introduzido pelo PowerShell no package.json; a codificação foi corrigida para UTF-8 sem BOM. Também foram corrigidos a opção renomeada do MSW 3, os tipos DOM dos testes e o aviso de Fast Refresh.

A saída do Playwright contém aviso de ambiente sobre FORCE_COLOR e NO_COLOR, sem impacto nos resultados. O Figma não foi acessível pela ferramenta de navegação; tokens permanecem provisórios. Lighthouse, deploy e fluxos de negócio estão fora desta etapa e não foram executados.

## Validação da etapa 2 — 30/10/2026

Os resultados acima descrevem a etapa anterior. Nesta etapa, a cópia do Figma foi acessada com sucesso pelo MCP e os tokens provisórios foram substituídos. Detalhes de referências, assets e limitações estão em [design-system.md](design-system.md).

| Comando             | Resultado final                                  |
| ------------------- | ------------------------------------------------ |
| `npm run build`     | Aprovado; TypeScript e bundle Vite gerados       |
| `npm run lint`      | Aprovado, sem warnings                           |
| `npm run typecheck` | Aprovado                                         |
| `npm run test:e2e`  | 35 aprovados, 1 ignorado; nenhum teste reprovado |

No Windows os comandos foram executados com `npm.cmd`. A suíte mantém os 20 testes da fundação e acrescenta 16 casos nos dois projetos Playwright. O único caso ignorado é o teste de navegação mobile no projeto desktop. Larguras 414, 768, 1024 e 1440 foram verificadas nos dois projetos, além das resoluções originais da fundação. O teste de teclado espera a montagem da Home antes de usar Tab, pois o bootstrap aguarda MSW.

Todas as asserções finais passaram. O encerramento automático do servidor Vite pelo runner ficou aguardando no ambiente Windows; o processo Vite criado pela própria execução foi encerrado após os casos terminarem. O comando então retornou exit code 0 e o arquivo `test-results/.last-run.json` registrou `status: passed` e nenhum teste falho. Não houve alteração do Playwright config nem das asserções da Etapa 1.

Foram verificadas renderização da Home, quantidade de cards (9 desktop/4 mobile), links de detalhes e mercado, rotas mobile de carrinho/perfil, estados futuros explícitos, foco de teclado, carregamento de imagens locais e ausência de overflow horizontal. Capturas de viewport e página completa foram geradas em 1440 × 900 e 414 × 896 CSS pixels, com fontes e imagens carregadas. As cópias revisadas estão em [screenshots](screenshots).

A comparação visual com as imagens retornadas pelo Figma resultou em ajustes de gaps, altura da grade e navegação mobile. Os principais offsets desktop coincidem com os metadados; não houve diff automatizado de pixels. Divergências deliberadas e limitações da quota Starter estão documentadas no design system. Nenhum fluxo futuro de negócio foi implementado.

## Correções visuais restantes — Etapa 8A.1

Validação final em 31/10/2026, após os ajustes responsivos do carrinho, checkout, confirmação e carteiras:

| Verificação | Resultado |
| --- | --- |
| `npm run build:demo` | Aprovado; build Vite de demonstração gerado com MSW habilitado |
| `npm run lint` | Aprovado, sem warnings |
| `npm run typecheck` | Aprovado |
| `npm run test:unit` | 15 aprovados, nenhum ignorado |
| `npm run test:e2e -- --workers=2` | 221 aprovados, 11 ignorados, nenhum reprovado; 232 casos totais |
| E2E no preview de produção (`playwright.preview.config.ts`) | 47 aprovados, 9 ignorados, nenhum reprovado; 56 casos totais |
| Capturas de comparação visual no preview | 9 snapshots aprovados; 9 ignorados no projeto de viewport oposto |
| Captura de todas as telas | 15 comparações atualizadas; `after/runtime-errors.json` vazio |

Os 11 ignorados na suíte completa e os 9 ignorados na configuração de preview são verificações duplicadas de visual/responsividade limitadas ao projeto desktop ou mobile correspondente. Nenhum teste de funcionalidade foi ignorado. O projeto preview usa os mesmos nomes de projeto das baselines para comparar os screenshots aprovados. A captura atualizada está em `docs/screenshots/stage8/after/`, e os diffs correspondentes em `docs/screenshots/stage8/diffs/`.

Durante a validação, o resumo fixo do carrinho podia ser ocultado quando as recomendações apenas entravam parcialmente na viewport, tornando o botão de cupom/checkout inacessível em alguns scrolls. O recolhimento automático foi removido; o resumo e a ação permanecem disponíveis. O teste touch posiciona explicitamente o carrossel acima do painel antes de arrastar. Os fluxos de cupom, checkout e carrossel foram aprovados em mobile.

Uma execução paralela do Playwright geral e do preview produziu `ENOENT` em arquivos temporários de trace compartilhados em `test-results`; a suíte geral foi repetida isoladamente e passou. As execuções do preview também passaram quando executadas sem concorrência. O runner pode permanecer aguardando o encerramento do Vite preview no Windows após imprimir o resultado; nessa situação, o servidor iniciado para esta validação foi encerrado pelo próprio processo de teste/terminal após as assertions, sem finalizar processos alheios.

# Correção de navegação anônima — 30/10/2026

`tests/e2e/anonymous.spec.ts` acrescenta sete cenários executados em desktop e mobile (14 execuções): navegação pública, busca/filtros/ordenação/paginação, detalhes, fechamento e reabertura de login/cadastro, foco e teclado do diálogo, favorito protegido, carrinho visitante com quantidades/cupom/refresh/remoção, checkout protegido, login com mesclagem idempotente, logout público, autorização privada, sessão 401, falha de verificação e expiração em rota pública. Os fluxos usam login pela interface; flags de cenário simulam apenas respostas HTTP, sem fabricar autenticação no storage.

Os testes existentes de checkout e recomendações agora preenchem o login por e-mail/senha, sem depender do antigo botão ambíguo de demonstração. As expectativas de logout foram atualizadas para a saída pública. A suíte de conta preserva os testes de isolamento entre duas contas, respostas antigas e expiração durante checkout. Há um teste unitário adicional para impedir loops ao fechar autenticação.

Capturas de carrinho anônimo, revistas visualmente: [desktop 1440 px](screenshots/anonymous/cart-1440.png) e [mobile 414 px](screenshots/anonymous/cart-414.png). As capturas de conta em `screenshots/stage6` também são regeneradas pela suíte existente. Não houve nova consulta ao Figma ou alteração de assets/design system.

Resultado final dos scripts: registrado após a execução integral abaixo.
# Etapa 7 — Socket.IO e MSW

Para o estado atual, `npm run build:demo` gera o preview com MSW explicitamente ativo. `npm run build` deixa mocks desativados por padrão, a menos que `VITE_ENABLE_MOCKS=true` seja fornecido. `npm run test:unit` cobre validação/versionamento e transições terminais. O arquivo `tests/e2e/realtime.spec.ts`, executado via `playwright.preview.config.ts`, verifica preview de produção em Chromium desktop/mobile: bootstrap do worker, probe WebSocket, handshake e eventos Socket.IO, JSON de carrinho, atualização NFT/carrinho, duplicatas/versões antigas e reconexão com recuperação REST.

## Preparação de publicação — Etapa 8C (31/10/2026)

Validação feita em uma cópia temporária de checkout limpo, sem `node_modules`, `dist`, `.env` privados, caches nem relatórios de execução. Foram copiados 450 arquivos necessários (95,65 MB), incluindo lockfile, assets originais/otimizados, worker MSW, fixtures, testes, baselines e documentação. `npm ci` concluiu com sucesso usando um cache npm separado em `%TEMP%`; a primeira tentativa com o cache compartilhado do Windows retornou `EPERM` ao ler `CACHEDIR.TAG`, sem alterar o projeto. A cópia temporária foi usada para build, testes e preview.

Ambiente: Windows 10 x64, Node 26.13.0, npm 12.2.1, `@playwright/test` 1.64.1 e Chromium 156.0.8078.4. O script Playwright usou uma porta livre definida por ambiente; a porta padrão 4173 já estava ocupada e não foi encerrado nenhum processo externo.

| Verificação no checkout limpo | Resultado |
| --- | --- |
| `npm ci` | Aprovado com cache isolado; lockfile respeitado |
| `npm run build` | Aprovado |
| `npm run build:demo` | Aprovado; MSW demonstrativo ativado |
| `npm run lint` | Aprovado, sem warnings |
| `npm run typecheck` | Aprovado |
| `npm run test:unit` | 15 aprovados, 0 falhas, 0 skips |
| `npm run test:e2e -- --workers=2` | 239 aprovados, 11 skips justificados, 0 falhas; 250 execuções |
| Regressão visual (incluída na suíte E2E) | Baselines mantidas; limite de 40 pixels após inspeção dos diffs de 5–34 pixels; as capturas passaram |
| Preview estático (`playwright.preview.config.ts`) | 28 aprovados em desktop/mobile: health/MSW, 10 URLs diretas com refresh, handshake Socket.IO, `nft.updated`, recuperação REST e contrato de carrinho |

Os 11 skips são casos duplicados por viewport: os screenshots de referência só rodam no projeto correspondente e a verificação de overflow do carrinho é exclusiva do projeto mobile. Nenhum fluxo funcional foi ignorado. A tolerância visual de 40 pixels foi escolhida após abrir e inspecionar os diffs; corresponde a menos de 0,012% até na menor viewport usada. Os arquivos baseline não foram regenerados.

O preview comprovou que `/`, `/marketplace`, `/nft/emerald-ape-042`, `/cart`, `/checkout`, `/profile` e `/profile/wallets` servem a SPA em acesso direto/refresh; guards de autenticação conduzem às páginas de entrada. Também passaram `/checkout/success`, `/nft/exemplo` e fallback de rota inexistente. O build contém `mockServiceWorker.js`, 20 assets de NFT, as três fontes Roboto Mono, favicon e `robots.txt`.

### Segurança e dependências

`npm audit --omit=dev`: zero vulnerabilidades. A auditoria completa reportou 18 vulnerabilidades moderadas e nenhuma alta/crítica, todas no conjunto de desenvolvimento; o relatório não indica uma atualização segura disponível (`fixAvailable: false`). Nenhum `npm audit fix` foi executado. A busca local por formatos conhecidos de tokens/chaves não encontrou arquivos candidatos. Credenciais no README são as fixtures fictícias Nova e Luna já usadas nos testes; `.env.demo` contém apenas `VITE_ENABLE_MOCKS=true`, configuração pública de build.

### Estado do deploy e Git

`vercel.json` foi validado como JSON; define Vite, `npm ci`, `npm run build:demo`, saída `dist`, fallback SPA e `Cache-Control: no-cache` para `mockServiceWorker.js`. O fallback deixa os recursos estáticos serem atendidos antes do rewrite. O workspace não contém `.git` e não há CLI Vercel disponível/autenticada. Nenhum repositório, remote, commit, push ou deploy foi criado; portanto, não existe URL pública para testar. A publicação requer inicializar/associar o repositório e autenticar na Vercel. As instruções e a configuração estão no [README](../README.md) e no [ARCHITECTURE.md](../ARCHITECTURE.md).

A mediana Lighthouse permanece a registrada em [performance-audit.md](performance-audit.md): Home mobile 72 e detalhes mobile 78 em Performance; Accessibility, Best Practices e SEO atingiram as metas nos quatro cenários. Por decisão do responsável, a pendência mobile está documentada e não bloqueia a publicação inicial. Nenhum score foi alterado ou reestimado nesta etapa.

