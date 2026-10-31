# Kurio — marketplace de NFTs

Kurio é a implementação do desafio técnico frontend da Jungle Gaming. A aplicação oferece descoberta de NFTs, páginas de detalhe, favoritos, carrinho, checkout, confirmação, conta de colecionador e carteiras em interfaces desktop e mobile.

O projeto segue o [desafio oficial](https://github.com/junglegaming/frontend-challenge) e usa os assets locais exportados do design. APIs, autenticação, pagamentos e tempo real são simulados no navegador. Não há integração com blockchain ou processamento financeiro real.

## Demonstração

**URL pública:** ainda não publicada. A configuração Vercel está preparada, mas nenhum deploy foi solicitado ou realizado.

Contas fictícias para avaliação:

| E-mail | Senha |
| --- | --- |
| `nova@kurio.demo` | `KurioDemo123!` |
| `luna@kurio.demo` | `LunaDemo123!` |

Essas credenciais pertencem exclusivamente às fixtures locais de demonstração. Não as reutilize em outros serviços.

## Funcionalidades

- Catálogo com pesquisa, categorias, rede, faixa de preço, ordenação, abas, paginação e estado sincronizado à URL.
- Detalhes de NFT com galeria, avaliações, disponibilidade, edição e mais itens da coleção.
- Navegação pública e carrinho persistente para visitante; merge idempotente após login.
- Cadastro, login, logout, perfil, avatar, alteração de senha e carteiras mockadas.
- Cupons, cotação validada, compra simulada idempotente, recuperação e recibo persistido.
- Eventos `nft.updated` e `order.updated` via `socket.io-client` e binding Socket.IO do MSW; versões, reconexão e reconciliação REST.
- Layout responsivo e acessibilidade por teclado, com testes axe/Playwright.

## Stack

| Tecnologia | Responsabilidade |
| --- | --- |
| React | Componentes e interface |
| TypeScript | Contratos e verificação estática |
| TanStack Router | Rotas, parâmetros de busca, navegação e guards |
| TanStack Query | Cache REST, mutations, invalidação e reconciliação |
| Axios | Cliente HTTP e validação das respostas |
| Tailwind CSS v4 | Utilitários de estilo integrados ao design system |
| shadcn/ui | Primitivos de interface acessíveis e adaptados à marca |
| MSW 2 | API REST simulada e interceptação WebSocket no navegador |
| Socket.IO | Transporte real do cliente para os eventos simulados |
| Playwright | Testes E2E, acessibilidade, preview e regressão visual |
| Lighthouse | Auditoria de performance, acessibilidade, práticas e SEO |
| Vite | Desenvolvimento e build estático |

## Requisitos e instalação

- Node.js `22.12+` ou `24+` (a validação local foi feita com Node `26.13.0`).
- npm compatível com a versão de Node.
- Chromium e dependências do Playwright para E2E.

```sh
npm ci
npx playwright install chromium
cp .env.example .env.local
npm run dev
```

No PowerShell, copie o ambiente com `Copy-Item .env.example .env.local`. Em ambientes onde `npm`/`npx` chamam scripts PowerShell bloqueados, use `npm.cmd`/`npx.cmd`.

`.env.example` e `.env.demo` contêm apenas variáveis públicas. `.env.demo` é versionado intencionalmente para garantir que o modo de demonstração habilite o MSW a partir de um checkout limpo.

| Variável | Valor de exemplo | Uso |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Base REST relativa à origem |
| `VITE_ENABLE_MOCKS` | `true` em dev/demo | Ativa MSW; `false` deixa a aplicação pronta para um backend configurado |

Variáveis `VITE_*` são incluídas no bundle público. Nunca coloque credenciais ou segredos nelas.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Servidor Vite para desenvolvimento (MSW habilitado no `.env.local`) |
| `npm run build` | Typecheck e build normal; mocks desligados por padrão |
| `npm run build:demo` | Build otimizado para publicação, com `VITE_ENABLE_MOCKS=true` pelo modo `.env.demo` |
| `npm run preview` | Preview local do último build |
| `npm run lint` | ESLint sem warnings |
| `npm run typecheck` | TypeScript em todos os projetos configurados |
| `npm run test:unit` | Regras de domínio, decimais, eventos e validações |
| `npm run test:e2e` | Playwright desktop e mobile no dev server com MSW |
| `npm exec playwright test -- --config=playwright.preview.config.ts` | E2E de realtime, checkout e visual no build de preview |
| `npm run audit:lighthouse -- final` | 12 medições Lighthouse no preview de demonstração |
| `npm run assets:optimize` | Regerar variantes WebP responsivas a partir dos PNG originais |

Larguras principais: 390/414, 768, 1024 e 1440 px. Baselines visuais ficam em `tests/e2e/visual-audit.spec.ts-snapshots/`; relatórios e capturas aprovadas estão em `docs/screenshots/` e `docs/reports/`.

## Fluxo de avaliação

1. Abra `/` e escolha um NFT no catálogo ou acesse diretamente `/nft/emerald-ape-042`.
2. Adicione ao carrinho; como visitante, o conteúdo persiste após atualização da página.
3. Continue para checkout. A aplicação solicita autenticação e retorna ao fluxo após login.
4. Use uma das contas fictícias acima, confira a carteira e a cotação, e confirme a compra simulada.
5. O recibo só aparece após a API mock persistir o pedido confirmado. Atualizar `/checkout/success?orderId=...` recupera o pedido pela API.

Outras rotas: `/marketplace`, `/cart`, `/login`, `/register`, `/profile` e `/profile/wallets`. Rotas privadas redirecionam ao login com o destino pretendido preservado.

## Reproduzir cenários de falha e realtime

Os cenários usam MSW; não substituem respostas por interceptações do Playwright nem precisam de backend remoto. Para forçar erro de catálogo no navegador:

```js
localStorage.setItem('kurio:catalog-scenario', 'error')
location.reload()
```

Para voltar ao cenário normal, remova essa chave e atualize a página. Outras opções de catálogo incluem `slow`, `out-of-order` e `connection-error`.

Com o demo aberto, alterar preço/estoque pelo endpoint mock emite evento através do transporte Socket.IO e atualiza a resposta REST:

```js
await fetch('/api/__mock/realtime/nfts/emerald-ape-042', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ priceEth: '1.29', availableQuantity: 3 }),
})
```

`POST /api/__mock/realtime/disconnect` simula desconexão e reconexão; `POST /api/__mock/realtime/reset` remove overrides de NFT. A recuperação de sessão pode ser testada com `kurio:auth-scenario=short-session`. Os controles são endpoints de teste registrados somente nos mocks.

Para restaurar **toda** a demonstração, limpe os dados do site no navegador e recarregue. Isso apaga contas cadastradas localmente, carrinhos, favoritos, imagens/avatar, carteiras e pedidos criados durante a sessão; as duas contas fixture voltam a ser inicializadas.

Mais cenários e limitações: [autenticação](docs/authentication.md), [checkout](docs/checkout.md), [perfil e carteiras](docs/profile-wallets.md) e [realtime](docs/realtime.md).

## Performance conhecida

As medianas Lighthouse atuais foram obtidas em três execuções por página/perfil. Performance: Home desktop **93**, detalhes desktop **96**, Home mobile **72** e detalhes mobile **78**. O score móvel ainda está abaixo da meta 90 e permanece registrado como pendência real; mocks, eventos, conteúdo e configurações padrão do Lighthouse foram mantidos. Acessibilidade, Best Practices e SEO marcaram 100 em todos os quatro cenários. Os LCP/CLS/TBT e relatórios originais estão em [performance-audit.md](docs/performance-audit.md) e `docs/reports/lighthouse/2026-10-31/final/`.

## Limitações da demonstração

- Não há blockchain, pagamentos, OAuth ou conexão de carteira reais.
- Sessões, contas e dados persistem no armazenamento local por origem/perfil do navegador e podem ser apagados ou alterados pelo usuário. Isso não é segurança de backend.
- Socket.IO é exercitado por `socket.io-client` sobre o binding MSW; não existe servidor remoto ou sincronização entre dispositivos.
- O app é SPA sem SSR. Metadados de rota são atualizados no cliente, então crawlers sem JavaScript podem não ver metadados de detalhe.
- Performance mobile de Lighthouse permanece abaixo da meta, conforme métricas publicadas acima.
- Não existe URL pública nem repositório GitHub deste workspace neste momento. A configuração e as instruções para Vercel estão em [vercel.json](vercel.json); publicar exige conectar o projeto ao Vercel e autorizar o deploy.

## Documentação

- [Arquitetura](ARCHITECTURE.md) — visão de domínio e trade-offs da solução.
- [Design system](docs/design-system.md) e [auditoria visual](docs/visual-audit.md).
- [API do catálogo](docs/catalog-api.md), [detalhes NFT](docs/nft-detail.md) e [checkout](docs/checkout.md).
- [Autenticação](docs/authentication.md), [carteiras](docs/profile-wallets.md) e [tempo real](docs/realtime.md).
- [Performance](docs/performance-audit.md), [acessibilidade](docs/accessibility-audit.md), [conformidade](docs/final-compliance.md) e [validação](docs/validation.md).
- [Análise dos requisitos oficiais](docs/challenge-analysis.md).
