# Análise inicial do desafio

Fonte: [README oficial completo](https://github.com/junglegaming/frontend-challenge), consultado em 30/10/2026 antes da implementação. O diretório local continha template Vite, assets e dependências, sem Git ou instruções AGENTS.md nos diretórios ancestrais verificados.

## Requisitos e restrições gerais

React e TypeScript; TanStack Router e Query; Axios com REST; Socket.IO; Tailwind; shadcn/ui; MSW; Playwright e Lighthouse. A stack deve participar efetivamente da entrega final. Backend, conta, pagamentos e carteiras são simulados, sem integrações reais.

A entrega completa exige descoberta, compra e conta em desktop/mobile, contratos tipados, cancelamento, cache coerente, cenários determinísticos, persistência, isolamento por usuário, idempotência, atualizações otimistas e reconciliação de eventos. Há exigências de acessibilidade, fidelidade ao Figma, regressão visual, auditorias de performance e publicação reproduzível.

A avaliação cobre visual, experiência, integração, tempo real, mocks, testes, acessibilidade, performance e arquitetura. Stack sem uso real, compra sem confirmação simulada, dados privados expostos, eventos que contornam o cliente e ausência de E2E executável são eliminatórios.

## Recorte desta etapa

O pedido limita a implementação à infraestrutura, oito placeholders, health, tokens e teste inicial. Portanto, recursos de negócio e avaliações de produto completo ficam pendentes. Socket.IO fica instalado; Lighthouse, binding Socket.IO e cenários serão configurados quando houver conteúdo a avaliar.

## Pendências para as próximas etapas

- Catálogo com parâmetros na URL, detalhe, favoritos e respectivos estados de rede.
- Conta, sessão, perfil, carteiras e dados isolados.
- Carrinho persistente, valores ETH precisos, cupons e cotações.
- Checkout idempotente e recibos imutáveis, com recuperação de falhas.
- Eventos pelo protocolo Socket.IO, ordenação, reconexão e reconciliação REST.
- Cenários MSW completos, falhas controladas e reset.
- Figma, assets finais, skeletons e acessibilidade de todos os fluxos.
- Cobertura E2E de negócio, baselines visuais e Lighthouse.
- Deploy público com acesso direto às rotas e documentação final.

Detalhes normativos permanecem no README oficial; esta análise não substitui o enunciado.
