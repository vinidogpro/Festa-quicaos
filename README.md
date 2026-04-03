# Festas Dashboard

Plataforma de gestao de eventos em Next.js para organizar multiplas festas ao longo do ano.

## Stack

- Next.js 14 + React 18
- Tailwind CSS
- Recharts
- Base preparada para futura integracao com Supabase

## Fluxo atual

- `/` e `/festas`: visao geral com festa atual, proximas festas, festas passadas e comparacao entre eventos
- `/festas/[id]`: dashboard individual de cada festa
- `/historico`: resumo visual das festas passadas

## Estrutura

- `app/`: rotas do App Router
- `components/`: componentes reutilizaveis de plataforma, eventos e paineis
- `lib/types.ts`: contratos centrais de eventos, vendas, financeiro e tarefas
- `lib/mock-data.ts`: mocks organizados por evento
- `lib/supabase/queries.ts`: camada de acesso preparada para trocar mocks por banco no futuro

## Como rodar

```bash
npm install
npm run dev
```

## Proxima etapa sugerida

- autenticar usuarios e mapear roles por evento
- mover `lib/mock-data.ts` para tabelas reais no Supabase
- adicionar edicao de vendas, despesas, tarefas e comunicados
- conectar realtime por evento
