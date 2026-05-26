# Auth Service

Serviço de autenticação centralizada para TecnoAging e IVCF.

## Requisitos

- Node.js 22+
- pnpm
- PostgreSQL

## Configuração

1) Copie o arquivo de variáveis de ambiente:

```bash
cp .env.example .env
```

2) Ajuste a variável `DATABASE_URL` e as demais configurações no `.env`.

## Instalação

(eu recomendo pnpm, mas pode ser npm ou yarn)

```bash
pnpm install
```

## Prisma

Gere o client e aplique as migrations:

```bash
pnpm prisma:generate
pnpm migrate:dev
```

## Rodando localmente

```bash
pnpm dev
```

O serviço inicia em `http://127.0.0.1:3001` (ou o host/porta definidos no `.env`).

## Swagger

Por padrão:

- `http://127.0.0.1:3001/api-docs`

Se `SWAGGER_USER` e `SWAGGER_PASSWORD` estiverem definidos, será solicitado basic auth.
Padrão: admin/admin

## Scripts uteis

- `pnpm dev` - modo watch
- `pnpm build` - build de produção
- `pnpm start:prod` - roda o build
- `pnpm prisma:studio` - Prisma Studio

## Observações

- Ajuste `JWT_SECRET` e `JWT_REFRESH_SECRET` no `.env` antes de usar em prod.
- Para ambiente em container, configure `NEST_HOST=0.0.0.0`.
