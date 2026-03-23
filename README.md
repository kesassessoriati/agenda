# KES Meeting Platform

Sistema full stack de agendas e compromissos inspirado no módulo legado de `atendzappy_versao2`, reescrito com:

- `React + TypeScript + MUI + React Query + Zustand`
- `Node.js + TypeScript + Express + Prisma + PostgreSQL + JWT`
- `Google Calendar` opcional com sincronização manual

## Estrutura

- `apps/api`: backend REST, regras de negócio, Prisma e autenticação
- `apps/web`: frontend React com telas de agendas e compromissos

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

- Admin: `admin@kes.local` / `admin123`
- Usuário: `consultor@kes.local` / `user12345`

## Comandos úteis

```bash
npm run build
npm run test
npm run lint
```
