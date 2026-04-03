# Festas Dashboard

Plataforma de gestao de festas com Next.js + Supabase, suporte a multiplos eventos, autenticacao, permissoes e colaboracao operacional.

## O que esta implementado

- login real com e-mail e senha via Supabase
- protecao de rotas privadas com middleware
- papeis `admin`, `organizer` e `seller`
- eventos reais no banco
- dashboard por festa alimentado por dados do Supabase
- criacao de festa por admin
- cadastro e edicao de vendas
- cadastro de despesas
- cadastro e atualizacao de tarefas
- cadastro de comunicados
- ranking, comparativos e indicadores calculados a partir das vendas

## Estrutura principal

- `app/`: rotas e paginas
- `components/`: interface e formularios operacionais
- `lib/actions/`: server actions de auth e mutacoes
- `lib/supabase/`: clients, tipos e queries
- `supabase/schema.sql`: estrutura do banco e politicas RLS
- `supabase/seed.sql`: dados iniciais para testes

## Configuracao do Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor, execute o arquivo `supabase/schema.sql`.
3. Depois execute `supabase/seed.sql`.
4. Crie um `.env.local` com:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Como rodar

```bash
npm install
npm run dev
```

## Usuarios de teste do seed

- `admin@festas.app` / `Admin123!`
- `organizador@festas.app` / `Organizador123!`
- `vendedor@festas.app` / `Vendedor123!`

## Regras de permissao

- `admin`: cria festas e edita tudo
- `organizer`: edita vendas, tarefas e comunicados
- `seller`: visualiza os eventos liberados para ele e edita apenas as proprias vendas

## Validacao local

- `npm run lint`
- `npm run build`

## Proxima etapa sugerida

- subscriptions em tempo real por evento
- edicao inline mais rica com feedback visual
- upload de anexos/comprovantes
- convites de usuarios e atribuicao de papeis via UI
