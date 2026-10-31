# Conta e sessão — Etapa 6

## Correção de navegação anônima

O marketplace é público: `/`, `/marketplace`, `/nft/:nftId` e `/cart` não possuem guard. O login abre somente por ação explícita, favorito ou destino privado. `/profile`, `/profile/wallets`, `/checkout` e `/checkout/success` mantêm `beforeLoad` e `ProtectedContent`; os handlers continuam verificando autorização de favoritos, perfil, carteiras e pedidos.

`useSession().authStatus` distingue `checking`, `anonymous`, `authenticated` e `unavailable` (falha de verificação, sem presumir ausência de conta). `GET /api/session` continua sendo o contrato existente, sem criar um `/auth/me` paralelo. Tanto 200 com sessão nula quanto 401 na consulta estabelecem visitante. No 401, um cookie inválido/expirado é removido somente se ainda pertencer à requisição atual; não se dispara recursivamente o recuperador global de 401 para a própria consulta de sessão. Rede/5xx continuam erros com retry explícito. Foco, reconexão e expiração continuam revalidando normalmente.

O carrinho visitante não depende do sucesso da consulta de conta: na ausência de credencial, consulta `/api/cart` com contexto explícito `guest`. Isso não estabelece uma sessão autenticada nem permite acesso privado. Se existe credencial cuja verificação falha, o carrinho mostra erro, em vez de assumir outro proprietário ou ficar eternamente pendente. Estoque, cupons, cálculos e persistência continuam nos mesmos handlers e armazenamento.

Login/cadastro usam um diálogo nativo com foco contido, botão fechar, Escape e ação **Continuar explorando sem entrar**. Fechar não chama autenticação: retorna ao destino público original, ao carrinho quando a origem é checkout, ou ao marketplace quando a origem é perfil. Nunca retorna imediatamente a outro guard privado. O login confirmado continua retomando o `returnTo` protegido; a troca entre login e cadastro o preserva. Após fechar, o foco retorna ao conteúdo público.

O atalho **Entrar como Nova (conta fictícia de teste)** aparece apenas em desenvolvimento (`import.meta.env.DEV`). Ele autentica explicitamente como Nova pelo emissor existente e nunca substitui a navegação visitante. O endpoint de demonstração permanece como fixture do ambiente mockado. Não há OAuth ou autenticação real.

Foram corrigidas duas corridas de navegação: o efeito de normalização do catálogo agora opera somente em `/` e `/marketplace`, preservando o `returnTo` durante a saída para login; o guard do conteúdo não redireciona destinos já públicos durante o último render da rota anterior. Logout possui navegação pública no callback durável da mutation, antes de publicar a sessão anônima. A limpeza de mutations preserva apenas autenticações ainda pendentes até concluírem a transição (`gcTime: 0`), evitando perder seu estado/callback; demais mutations e caches privados continuam sendo descartados, com cancelamento das requisições antigas.

Após login/cadastro, permanece a conciliação existente por NFT + edição, limitada ao estoque, consumindo somente os itens aceitos do carrinho visitante. Recarregar não repete a mesclagem. Excedentes permanecem no visitante; logout não apaga essa persistência, nem expõe os itens privados da conta anterior. Logout retorna ao marketplace público.

Validação manual: abra uma janela anônima, explore Home/mercado, pesquise e abra um NFT; compre para adicionar ao carrinho, ajuste quantidades e aplique `KURIO10`. Recarregue. Inicie checkout, feche o login e continue explorando; inicie novamente e entre com uma fixture abaixo. Confirme a retomada de checkout e o subtotal conciliado. Saia pelo perfil e continue navegando; os dados privados da conta anterior não devem aparecer. O cenário MSW `kurio:auth-scenario=anonymous-401` permite testar deterministicamente o contrato alternativo 401, sem criar sessão.

A implementação segue o [README oficial](https://github.com/junglegaming/frontend-challenge) para os fluxos simulados de conta. React, Axios, TanStack Query/Router e MSW continuam sendo a arquitetura única. Não há OAuth, backend de produção ou conexão blockchain.

## Sessão

`GET /api/session` permanece a fonte de verdade. `kurio:session-user` é ignorado e não autoriza nenhum recurso. Cadastro e login emitem um UUID opaco registrado pelo mock, associado ao usuário e a uma expiração absoluta de 30 minutos. O cookie de sessão `kurio_session` contém somente esse identificador; refresh recupera a conta por consulta à API. Login posterior revoga a sessão anterior do navegador. Logout revoga o registro e remove o cookie. A sessão não é renovada silenciosamente a cada GET.

Resposta autenticada:

```json
{
  "user": {
    "id": "collector-demo",
    "name": "Nova Collector",
    "username": "nova",
    "email": "nova@kurio.demo",
    "avatarUrl": null
  },
  "contextId": "uuid-opaco-registrado-no-mock",
  "expiresAt": 1800000000000,
  "cartMerge": {
    "addedQuantity": 2,
    "remainingGuestQuantity": 0,
    "conflicts": []
  }
}
```

Visitante recebe `user`, `contextId` e `expiresAt` nulos. Sessão inválida ou expirada inclui `reason`. APIs privadas respondem 401. O identificador opaco só é aceito se existir no ledger do mock e não tiver expirado.

Um timer acompanha `expiresAt`. Expiração, 401, foco e alterações de storage provocam revalidação. Antes da recuperação após 401 são canceladas as chamadas privadas e a query de sessão é reiniciada; isso impede loops de requests usando uma identidade antiga. Uma trava evita múltiplas recuperações concorrentes.

## Endpoints

| Método e caminho             | Entrada                                       | Resposta                                                                 |
| ---------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| POST `/api/session/register` | `{ username, email, password, confirmation }` | Sessão após cadastro confirmado                                          |
| POST `/api/session/login`    | `{ email, password }`                         | Sessão após validação                                                    |
| GET `/api/session`           | Identificador de sessão, quando existente     | Sessão ou visitante                                                      |
| POST `/api/session/logout`   | Sessão atual                                  | Visitante; operação idempotente                                          |
| POST `/api/session/expire`   | Sessão válida                                 | `{ expired: true }`; cenário explícito de expiração                      |
| POST `/api/session/demo`     | —                                             | Atalho identificado para Nova, usando o mesmo emissor e ledger de sessão |

O atalho de demonstração já existente foi preservado e evoluído; não é um segundo sistema de autenticação. Os testes novos exercitam também cadastro e login por e-mail/senha na interface, não apenas esse atalho.

E-mail e username são normalizados/validados; conflitos retornam 409 (`EMAIL_TAKEN`, `USERNAME_TAKEN`). Username aceita 3–24 letras, números e sublinhado. Senha exige 10–128 caracteres, ao menos uma letra, um número e um símbolo. Cadastro valida confirmação e só autentica após a resposta do mock. Login inválido retorna 401 sem revelar qual credencial falhou. Erros de formulário são associados aos campos; requisições não apresentam falso sucesso. Botões de envio e trava síncrona previnem submissões duplicadas.

## Credenciais fictícias

| Conta | E-mail            | Senha           |
| ----- | ----------------- | --------------- |
| Nova  | `nova@kurio.demo` | `KurioDemo123!` |
| Luna  | `luna@kurio.demo` | `LunaDemo123!`  |

As fixtures têm IDs estáveis `collector-demo` e `collector-alt`. Nova inicia com três carteiras; Luna tem apenas sua própria carteira Polygon. Cadastro cria conta e carteiras vazias. Todas as credenciais são exclusivamente fictícias.

O mock persiste **salt e derivação PBKDF2/SHA-256 com 100.000 iterações**, nunca a senha em claro. Novas contas e alterações usam salt aleatório. As respostas de sessão/perfil não incluem hash ou salt. Campos de senha vivem somente na memória do formulário, são apagados após envio/erro e não entram em URL, drafts ou storage. O log detalhado do MSW foi desabilitado (`quiet: true`) para não registrar corpos contendo senhas. As fixtures conhecidas permanecem em testes/documentação para reprodução.

## Proteção de rotas e retorno

`beforeLoad` do Router consulta a sessão antes de renderizar `/profile`, `/profile/wallets`, `/checkout` e `/checkout/success`. Um componente protegido adicional reage à expiração e impede renderização de conteúdo privado enquanto a validação inicial está pendente ou falha. Pedidos e favoritos validam também autorização nos handlers.

Visitantes são enviados a `/login?returnTo=...`. Login/cadastro preservam o destino, inclusive query de pedido. O header retorna à página de origem; o favorito retorna ao NFT; checkout retorna à compra. Destinos externos, caminhos com barras invertidas e loops de login/cadastro são recusados. Erros de sessão têm retry. A composição visual de fundo do login usa uma consulta pública isolada: não monta a Home funcional, cujos efeitos de normalização da URL interfeririam em `returnTo`.

## Isolamento e cancelamento

- Queries privadas incluem o UUID de sessão. Pedidos/cotações incluem também usuário e parâmetros. Uma nova sessão da mesma conta não reutiliza automaticamente o cache privado antigo.
- Cada chamada privada dos hooks carrega `X-Kurio-Session` correspondente ao contexto da query/mutation. Se o cookie atual for diferente, o transporte cancela a chamada e revalida a sessão, impedindo dados novos sob uma chave antiga.
- O Axios mantém AbortControllers e uma geração de autenticação. Logout/troca cancelam requests pendentes; respostas de gerações anteriores são descartadas. A identificação considera o pathname também em URLs com query string.
- TanStack Query cancela/remove caches de carrinho, favoritos, perfil, carteiras, cotações e pedidos. Mutations têm chaves por contexto e callbacks verificam a sessão antes de escrever resultados. Favoritos mantêm atualização otimista com rollback somente no contexto correspondente.
- Formulários privados são remontados quando o contexto muda; subscriptions Socket.IO privadas não existem nesta arquitetura, portanto não há listeners desse tipo a liberar nesta etapa.
- Handlers não aceitam um userId enviado pelo cliente como autorização. Perfil, favoritos, carteiras e pedidos são resolvidos pelo proprietário da sessão. Pedido de outra conta retorna 404; alterações em carteiras de outra conta também são recusadas.

## Carrinho visitante

O armazenamento original `kurio:cart` evoluiu para versão 3, com `carts: { guest, [userId] }`, `quotes` e `orders`. Não há segundo carrinho ou nova chave para dados de compra. Listas legadas e o envelope da Etapa 5 são migrados para o bucket visitante. Os preços continuam derivados do catálogo e calculados exatamente no mock.

Ao autenticar, o mock concilia linhas por **NFT + edição**: soma o que cabe no estoque da edição atual e consome apenas essa quantidade do visitante. Itens inválidos, indisponíveis ou excedentes continuam no bucket visitante; a resposta inclui conflitos e a interface avisa que podem ser revisados ao sair. O cupom visitante é transferido somente se o carrinho da conta não tiver outro; sua compatibilidade é recalculada pela API. Refresh não executa conciliação e login repetido não reaplica quantidades já consumidas. Uma falha ao emitir a sessão restaura o estado anterior do carrinho.

Cada conta conserva seu carrinho ao sair. Logout mostra o bucket visitante, nunca o carrinho de outra conta. Quotes e pedidos continuam no mesmo envelope, com proprietário obrigatório e recibos imutáveis; o ledger global de estoque considera as compras confirmadas de todas as contas.

## Checkout e retomada

Carteiras vêm de `/api/wallets` da conta atual. Rascunhos não financeiros ficam em sessionStorage por userId; navegação ao cadastro de carteira e expiração preservam os campos. Logout explícito remove o rascunho temporário da conta. Tentativas idempotentes ficam em `kurio:checkout-attempt:<userId>` e só são lidas pela conta correspondente. Nenhuma senha é persistida nesses registros.

401 não apaga tentativa nem carrinho. Após login, um pedido recebido é consultado pela mesma chave; tentativa ainda não recebida pode ser recuperada ou revisada explicitamente com nova cotação. O mecanismo de idempotência e o snapshot da Etapa 5 foram preservados. Não há confirmação determinada pelo cliente.

## Cenários e reset

`kurio:auth-scenario=short-session` emite sessão de quatro segundos; `error` simula indisponibilidade. `kurio:account-scenario` aceita `error`, `slow`, `slow-profile` (cinco segundos para perfil) e `missing-profile`. Não são substitutos da autenticação; o usuário ainda precisa entrar pela API. `/session/expire` permite testar expiração sem alterar manualmente o ledger.

Cada teste Playwright usa BrowserContext limpo. Para reset manual completo da demonstração, saia e limpe os dados locais da origem no DevTools; isso remove contas cadastradas, imagens, carrinhos, favoritos e pedidos simulados. As duas fixtures são recriadas no primeiro acesso. Não use credenciais reais.

## Limitações

Tudo é executado no navegador. Cookie é acessível por JavaScript e não é HttpOnly; ledger, hashes, imagens e dados podem ser inspecionados/alterados localmente. Isso **não oferece segurança equivalente a um backend real**, não é autenticação de produção e não prova propriedade de endereço blockchain. Não há entrega de e-mail, recuperação de senha por e-mail, OAuth ou conexão real de carteira. Google/Facebook e o link auxiliar de senha estão explicitamente indisponíveis. Recuperação da sessão e retomada do checkout estão implementadas.
