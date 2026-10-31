# Acessibilidade — Etapa 8B

Data: 31/10/2026.

## Cobertura automatizada

`tests/e2e/accessibility-audit.spec.ts` executa axe-core com critérios WCAG 2.0/2.1 A/AA e WCAG 2.2 AA para Home, detalhes do NFT, carrinho, login, cadastro, checkout, perfil e carteiras. A suíte é executada nos projetos Chromium desktop e mobile. Também verifica skip link, acesso a detalhes via teclado, nome/título da rota e layout de largura 720 px como aproximação de zoom 200% sem overflow horizontal.

O teste direcionado mais recente concluiu as verificações axe e o caso de teclado em desktop e mobile sem violações reportadas. Resultado consolidado deve ser atualizado após a execução integral da suíte E2E desta etapa.

## Verificações manuais orientadas por navegador

Verificações Playwright automatizadas existentes incluem:

- Tab/Shift+Tab e skip link na Home; foco no conteúdo principal.
- Abrir card de NFT com Enter.
- Modal de autenticação: Escape, retorno do foco e continuidade da navegação pública.
- Drawer de filtros e diálogos de carteira: teclado, foco e fechamento.
- Inputs e mensagens de validação em login/cadastro/checkout.
- Carrinho e ações principais nos projetos desktop/mobile.
- Largura reduzida equivalente a 200% de zoom, sem scroll horizontal.
- Axe nas rotas públicas e privadas listadas acima.

O ambiente não inclui leitor de tela nem dispositivo físico; esses aspectos requerem conferência manual independente. O teste em 720 px é uma aproximação geométrica e não substitui zoom real do navegador. Contraste automatizado foi avaliado por axe; ajustes locais de link de autenticação foram realizados sem alterar os tokens da marca. A navegação mobile fixa e os painéis de checkout/carrinho mantêm espaço de conteúdo para evitar sobreposição.

## Outros aspectos

- Imagens NFT têm texto alternativo contextual; dimensões explícitas evitam CLS.
- Estados e controles de navegação utilizam nomes acessíveis; feedback Socket.IO é exposto por status textual.
- Movimento não essencial deve respeitar `prefers-reduced-motion` via estilos globais/componentes já configurados; animações decorativas foram neutralizadas apenas nos testes visuais.
- Metadados de página são atualizados para Home e NFT; `lang="pt-BR"` é definido no documento.

## Pendências

Não se declara auditoria manual completa de leitor de tela, alto contraste do sistema, zoom real a 200/400% ou navegação em hardware touch. Fazer essas verificações com tecnologias assistivas reais antes de tratar a acessibilidade como certificação formal.
