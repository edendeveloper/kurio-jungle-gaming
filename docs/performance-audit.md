# Performance audit — Etapa 8B

Data: 31/10/2026. Fonte de requisitos: [README oficial](https://github.com/junglegaming/frontend-challenge).

## Método reproduzível

1. `npm run build:demo`
2. `npm run audit:lighthouse -- final`

O script inicia um preview Vite em porta efêmera exclusiva, confirma MSW/REST/Socket.IO/fontes/imagens/favicon/robots e ausência de erros de runtime, e executa três medições independentes por rota e perfil com Chromium headless. Os HTML e JSON individuais, `runs.json`, `summary.json` e `preflight.json` ficam em `docs/reports/lighthouse/2026-10-31/final/`. Os relatórios preservam a configuração bruta do Lighthouse.

As viewports correspondem às referências: desktop 1440×900 e mobile 414×896. O perfil desktop usa o preset desktop nativo do Lighthouse; mobile usa `lighthouse.config.json`, que apenas estende `lighthouse:default`. As dimensões de viewport foram fixadas para consistência; throttling, scoring e auditorias permanecem no padrão da ferramenta. O script valida `formFactor` e dimensões nos relatórios para impedir que um resultado móvel seja rotulado desktop.

Ambiente: Windows 10 x64, Node 26.13.0, npm 12.2.1, Playwright 1.64.1 / Chromium 156.0.8078.4, Lighthouse 13.6.0, headless local. `--no-sandbox` é necessário ao Chromium nesse runner e não altera as configurações de scoring/throttling. Sem dependência de rede/backend privado; build de demonstração com MSW e Socket.IO ativos.

## Resultados

Resultados de 12 medições finais, três por página/perfil, capturadas em `2026-10-31T05:59:28Z`. Os requisitos oficiais pedem medianas separadas por página e perfil: Performance ≥90, Accessibility ≥95, Best Practices ≥95 e SEO ≥90; LCP, CLS e TBT também são registrados.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | Desktop | 93 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 1708 ms | 0.000553 | 15 ms |
| NFT Emerald Ape | Desktop | 96 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 1404 ms | 0.000064 | 11 ms |
| Home | Mobile | 72 ❌ | 100 ✅ | 100 ✅ | 100 ✅ | 6691 ms | 0.000143 | 237 ms |
| NFT Emerald Ape | Mobile | 78 ❌ | 100 ✅ | 100 ✅ | 100 ✅ | 5075 ms | 0 | 216 ms |

Todos os 12 relatórios individuais foram preservados em HTML e JSON. Performance mobile não atingiu a meta 90 e permanece uma pendência mensurável. Conforme decisão do responsável pelo projeto na Etapa 8C, esse resultado não bloqueia a publicação inicial; os demais scores continuam sem alteração. Accessibility, Best Practices e SEO alcançaram as metas nos quatro cenários.

Não preencher medições por estimativa. Se a execução não completar as 12, documentar quais foram efetivamente concluídas.

## Otimizações implementadas

- Home mantida eager para evitar salto de layout no conteúdo inicial; rotas secundárias carregam por divisão de código React.lazy.
- Assets PNG originais permanecem versionados. WebP responsivos foram gerados localmente por `npm run assets:optimize` e utilizados com `srcset`, `sizes`, dimensões explícitas e `loading` adequado. A conversão full-size reduziu os quatro assets de cerca de 1,88–2,07 MB para 249–341 KB (83–87%); variantes 256/512/768 px são menores para cards e galerias. A imagem principal recebe preload responsivo/prioridade elevada.
- Roboto Mono local usa `font-display: swap`, com preload do peso regular.
- Metadados separados para Home e detalhes, `lang=pt-BR`, favicon e robots válidos.
- Preflight valida fontes, asset de NFT, health REST JSON, service worker, Socket.IO, console e respostas HTTP inválidas antes de medir.

As alterações preservam a aparência dos assets originais; conversão avaliada visualmente. O script e as variantes tornam a otimização reproduzível sem serviços externos.

## Diagnóstico e limitações

Uma medição diagnóstica após a correção do preset desktop (antes das variantes responsivas) marcou Home desktop 94/100/100/100, LCP 1688,7 ms, CLS 0,000553 e TBT 3 ms. É apenas smoke run, não substitui as medianas oficiais finais.

Houve uma execução inicial inválida: combinar `--config-path` com o preset desktop fez Lighthouse executar o perfil mobile, embora os nomes de arquivo dissessem desktop. Esses dados não são usados como baseline desktop. A configuração foi corrigida e agora cada relatório é validado contra o perfil e viewport esperados.

A aplicação é SPA client-rendered: crawlers sem execução de JavaScript podem não obter os metadados específicos de NFT. Não foi introduzido SSR nesta etapa. Mocks e socket simulados dependem do service worker e não representam latência de produção.

O gargalo mobile é LCP/tempo de inicialização sob o throttling padrão Lighthouse: o bootstrap aguarda MSW antes de montar a UI funcional. O bundle MSW/browser é 472.45 KB (173.74 KB gzip); o entry Vite é 222.30 KB (69.84 KB gzip), antes de carregar a app de 48.42 KB (15.52 KB gzip). TBT (216–237 ms) e CLS (0–0.000143) estão controlados; LCP de 5.1–6.7 s domina os scores móveis. MSW e o caminho Socket.IO são requisitos do build demo e foram mantidos ativos. A otimização sem SSR ou sem retirar o mock requer reduzir/adiar com segurança o bootstrap do MSW; isso permanece como risco mensurável.

A medição final de NFT mobile zerou CLS após reservar a altura do `<main>` durante a inicialização da rota. A reprodução de oito segundos com `PerformanceObserver` registrou zero eventos de layout shift depois do ajuste. A execução inicial foi encerrada antes das 12 rodadas e substituída; a tabela e os artefatos correspondem ao build final completo.

Uma comparação exata antes/depois do mesmo perfil de Lighthouse não foi usada: a execução anterior tinha um erro de preset que rotulava relatórios móveis como desktop. Esses dados foram excluídos da baseline desktop. O peso do bundle e a redução de tamanho dos assets têm comparação direta; os scores baseline rotulados incorretamente não foram usados.
