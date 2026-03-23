# KES Meeting Platform

Sistema full stack de agendas e compromissos com arquitetura multi-tenant por workspace/empresa.

- `React + TypeScript + MUI + React Query + Zustand`
- `Node.js + TypeScript + Express + Prisma + PostgreSQL + JWT`
- `Google Calendar` opcional com sincronização manual

## Estrutura

- `apps/api`: backend REST, regras de negócio, Prisma, autenticação tenant-scoped e gestão de equipe
- `apps/web`: frontend React com telas de agendas, compromissos, administração e convites

## Multi-tenancy

- Cada `Company` funciona como tenant/workspace isolado.
- Usuários são globais e entram em workspaces via `Membership`.
- A sessão sempre opera com um workspace ativo (`membershipId` + `companyId` validados no backend).
- Owners/Admins gerenciam equipe, convites e acesso às agendas.
- Agendas, compromissos, integrações e dados operacionais continuam sempre escopados por `companyId`.

## Convites por e-mail

O repositório atual não possui um provedor de envio de e-mail configurado.

Por isso, o fluxo implementado é:

- owner/admin cria o convite
- o backend gera um token seguro hasheado e armazena apenas o hash
- a API retorna um `invitationUrl` para entrega manual
- o convidado acessa `/convites/:token` e aceita o workspace correto

Quando um serviço de e-mail for adicionado, basta conectar a entrega ao retorno do endpoint de criação de convite.

## Execução local

1. Copie `apps/api/.env.example` para `apps/api/.env`
2. Copie `apps/web/.env.example` para `apps/web/.env`
3. Instale dependências:

```bash
npm install
```

4. Gere o client Prisma e aplique a base:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

5. Suba backend e frontend em terminais separados:

```bash
npm run dev:api
npm run dev:web
```

## Credenciais demo

- Admin/Owner: `admin@kes.local` / `admin123`
- Usuário membro: `consultor@kes.local` / `user12345`

## Comandos úteis

```bash
npm run build
npm run test
npm run lint
```
