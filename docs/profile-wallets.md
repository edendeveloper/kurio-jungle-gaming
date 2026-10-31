# Perfil e carteiras — Etapa 6

Complementa [authentication.md](authentication.md) e [checkout.md](checkout.md). Conta, formulário e contratos são tipados; todas as gravações passam por Axios/MSW.

## Perfil e avatar

`CollectorProfile = { id, displayName, username, email, avatarUrl }`.

| Endpoint                     | Contrato                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| GET `/api/profile`           | Perfil da sessão; 401, 404 ou 503 conforme cenário                                              |
| PATCH `/api/profile`         | `{ displayName, username, email }`; retorna perfil salvo                                        |
| PUT `/api/profile/avatar`    | `{ dataUrl }`; retorna perfil com avatar                                                        |
| DELETE `/api/profile/avatar` | Remove avatar; retorna perfil                                                                   |
| PUT `/api/profile/password`  | `{ currentPassword, password, confirmation }`; retorna `{ changed: true, requiresLogin: true }` |

Nome de exibição aceita 2–80 caracteres. Username/e-mail seguem a validação de cadastro e conflitos são verificados também no mock. A API resolve sempre o perfil da sessão; nenhum campo de identidade do payload muda o proprietário.

Avatar aceita PNG, JPEG e WebP até 256 KiB, com validação de MIME, limite e assinatura dos bytes no cliente e no mock. A seleção mostra preview separado, sem salvar automaticamente. A imagem é armazenada como data URL na conta proprietária, em `kurio:accounts`, sem upload externo ou edição de assets originais. Remoção e salvamento só exibem sucesso após a resposta. Falta de espaço retorna erro; esse armazenamento pequeno é próprio da demonstração, não um serviço de mídia.

Alteração de senha valida senha atual, regra de força e confirmação, sem persistir os campos. Após sucesso, todas as sessões daquela conta são revogadas e é exigido novo login. Senha atual incorreta ou confirmação divergente preservam a credencial anterior. As demais contas não são afetadas.

## Entidade carteira

`WalletRecord` mantém a API `SavedWallet` utilizada no checkout e acrescenta `displayName`, `nickname` e `isPrimary`. `label` é derivado do apelido. Campos: ID estável, nome de exibição, apelido, rede, provedor, endereço, ENS opcional e indicador de principal. IDs das carteiras de demonstração de Nova foram preservados.

ENS e apelido pertencem à carteira; o perfil mostra dados da principal somente para leitura, com link de edição. Não são duplicados no objeto de perfil. ENS aceita nomes/subdomínios `.eth` sintaticamente válidos somente em Ethereum. Não há resolução DNS/ENS real.

| Endpoint                       | Operação                                                        |
| ------------------------------ | --------------------------------------------------------------- |
| GET `/api/wallets`             | `{ items: WalletRecord[] }` da sessão                           |
| POST `/api/wallets`            | Cadastra nome, apelido, rede, provedor, endereço e ENS opcional |
| PATCH `/api/wallets/:id`       | Atualiza carteira da conta atual                                |
| PUT `/api/wallets/:id/primary` | Define uma única principal                                      |
| DELETE `/api/wallets/:id`      | Remove quando permitido, após confirmação na interface          |

Redes: Ethereum, Polygon e Solana. Provedores: WalletConnect, MetaMask e Coinbase; nesta simulação Solana usa WalletConnect. Ethereum/Polygon exigem `0x` seguido de 40 hexadecimais; Solana usa base58 de 32–44 caracteres. Não se verifica checksum ou existência on-chain.

A identidade de duplicação é rede + endereço. Endereços EVM são comparados sem diferença de caixa; Solana preserva caixa. A primeira carteira é principal automaticamente. Adicionais são secundárias e podem ser promovidas. A principal não pode ser removida enquanto outras existirem: escolha outra primeiro. A única carteira pode ser removida, deixando estado vazio. Carteira referenciada por pedido em processamento não pode ser editada/removida. Histórico confirmado permanece como snapshot mesmo após remoção posterior.

Erros usam os status comuns 401/404/409/422/503, com `{ message, code }`; exemplos: `WALLET_DUPLICATE`, `PRIMARY_WALLET_REQUIRED`, `WALLET_IN_USE`, `INVALID_WALLET`. Não há atualização otimista sem rollback: carteiras/perfil usam as respostas confirmadas.

## UX, design e acessibilidade

Referências reutilizadas dos metadados já disponíveis, sem novas consultas MCP: login/cadastro desktop em painel de 500 px, campos internos de aproximadamente 340 px; mobile 414 com margens de 28 px, marca em área de 136 px, inputs de 50 px e CTA de 60 px. Perfil/carteiras usam container de 1200 px, sidebar de 310 px, gap de 28 px e conteúdo de 862 px. No mobile o menu de conta e os formulários são empilhados, preservando navegação inferior e espaço de leitura.

Roboto Mono e os tokens existentes foram preservados. Campos têm labels, associação de erros e foco visível. Diálogos nativos possuem foco inicial, ciclo Tab/Shift+Tab, Escape, bloqueio de fechamento durante mutation e retorno ao botão de origem (ou ao cadastro quando o item removido não existe mais). Password toggles têm nomes acessíveis. Google/Facebook estão desabilitados com indicação de indisponibilidade.

Limitações visuais: quota do Figma MCP esgotada; não há comparação nova com screenshots nem declaração de pixel-perfect. Login/cadastro são rotas independentes com painel sobre uma prévia pública do catálogo, não uma captura completa da Home por trás do modal. Há labels/erros, controles de demonstração e formulários separados para gravar perfil, avatar e senha, aumentando alturas quando necessário. Perfil/carteiras mobile são adaptações sem frames próprios. Avatar inicial usa a inicial do nome quando não há imagem, sem inventar fotografia do colecionador.

No desktop, carteiras são apresentadas em lista com cadastro/edição em diálogos, em vez do formulário permanente de principal/secundária do frame. Essa adaptação permite quantidade variável de carteiras e confirmação de remoção; sidebar, largura do conteúdo, cores, campos e tipografia seguem a referência disponível.

## Arquivos

Novos: `src/types/account.ts`; `src/features/auth/{page.tsx,lifecycle.tsx,validation.ts}`; `src/features/profile/{api.ts,layout.tsx,styles.css,validation.ts}`; `src/features/wallets/{api.ts,validation.ts}`; `src/features/cart/merge-guest.ts`; `src/components/ui/{account-field.tsx,account-dialog.tsx}`; `src/lib/api/auth-context.ts`; `src/mocks/store/{accounts.ts,errors.ts}`; `src/mocks/handlers/accounts.ts`; `tests/e2e/accounts.spec.ts`, `tests/e2e/helpers/auth.ts`, `tests/unit/account.test.ts`; documentos e screenshots em `docs/screenshots/stage6/`.

Evoluídos: sessão/hook existentes, rotas/AppLayout/header, páginas de perfil/carteiras, hooks de carrinho/favoritos/checkout, validação e rascunho do checkout, Axios, handlers de comércio/favoritos e persistência do carrinho, tipos de coletor e bootstrap MSW. Testes anteriores foram mantidos e atualizados onde usavam autenticação arbitrária ou esperavam placeholders públicos de rotas agora protegidas. Configuração e dependências do projeto foram preservadas.

## Validação manual

1. Execute `npm run dev` com mocks habilitados. No header, entre como Nova; recarregue `/profile`.
2. Altere o nome, salve e recarregue. Tente o e-mail de Luna para ver conflito.
3. Selecione um PNG pequeno, confira o preview, salve, recarregue e remova.
4. Abra Carteiras, cadastre uma secundária, edite e promova. Tente excluir a principal com outras presentes; confirme a remoção de uma secundária.
5. Saia, entre como Luna e confira que perfil, carteiras e favoritos são outros. Retorne como Nova para verificar persistência.
6. Como visitante, adicione Emerald ao carrinho e avance ao checkout; autentique e confira quantidades. Refaça login e confirme que nada foi duplicado.
7. Preencha checkout, use Gerenciar ou cadastrar carteira e volte. Selecione a carteira cadastrada e confirme a compra simulada.
8. Para testar expiração, execute `POST /api/session/expire` pela página usando fetch, ou configure `kurio:auth-scenario=short-session` antes do login. Retome o checkout após entrar novamente.
9. Altere a senha; será exigido novo login com a nova credencial. Para restaurar fixtures originais, limpe os dados locais da origem.

Não houve commit, implementação de backend, OAuth, blockchain, Socket.IO completo ou avanço à Etapa 7.
