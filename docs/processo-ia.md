# processo-IA — auth-service

> Como aplicar **testes unitários com IA, code review com IA e automação** neste repositório.
> Documento de orientação (o "como"). **Não contém código.** Task: [86e1tmk1q](https://app.clickup.com/t/86e1tmk1q).

## 1. Contexto do repo

- **Stack:** NestJS (TypeScript) · **Package manager:** npm (`package-lock.json`).
- **Teste hoje:** Jest **já configurado** (bloco `jest` no `package.json`, `ts-jest`, `testRegex: .*\.spec\.ts$`), porém **0 testes escritos**.
- **Scripts existentes:** `test` (`jest`), `test:cov` (`jest --coverage`), `lint` (`eslint --fix`), `build` (`nest build`). Não há `typecheck` dedicado (o `build` cobre).
- **CI:** `.github/workflows/ci.yml` chama o reutilizável `ci-node-backend.yml` do `devops-hub` (jobs Lint / Typecheck / Unit tests / Build).
- **Cobertura:** gate **60%** definido em [`devops-hub/scripts/repos.config.ts`](https://github.com/lifesystemsufpr/devops-hub/blob/main/scripts/repos.config.ts).
- **Papel:** é o **piloto** do rollout — menor superfície, maior criticidade (autenticação).

## 2. Testes unitários com IA

Framework: **Jest** (já pronto, não precisa instalar). Gerar `*.spec.ts` ao lado de cada alvo, seguindo
**AAA + casos adversariais** (regra [`60-testing`](https://github.com/lifesystemsufpr/ai-toolkit/blob/main/source/rules/60-testing.md)) via a skill
[`generate-tests`](https://github.com/lifesystemsufpr/ai-toolkit/blob/main/source/skills/generate-tests.md).

**Alvos prioritários (do mais puro/alto-valor ao mais acoplado):**

| Prioridade | Alvo | Por quê / como testar |
|---|---|---|
| 1 | `src/shared/functions/hash-password.ts` | Função pura — hash/compare; casos: senha vazia, unicode, hash inválido. Sem mocks. |
| 1 | `src/shared/functions/normalize-string.ts` | Pura — acentos, caixa, espaços, string vazia. |
| 2 | `src/modules/auth/dto/*.ts` | `class-validator` — validar aceite/recusa por campo (login, reset, recovery); valores de fronteira. |
| 3 | `src/modules/auth/auth.service.ts` | Mock de Prisma + JWT + bcrypt; cenários: credencial válida/ inválida, usuário inexistente, token expirado. |
| 3 | `src/modules/auth/guards/*` + `strategy/*` | Mock de contexto/execução; allow/deny por papel e por token. |
| 4 | `src/modules/users/user.service.ts` | Mock Prisma; create/update, colisão de e-mail, normalização. |
| 4 | `src/shared/services/email/email.service.ts` | Mock do nodemailer; assunto/destinatário corretos, falha de envio. |

**Cobertura:** mirar o gate **60%**. Se a baseline só com unidades não cruzar 60%, **documentar a rampa**
(baixar threshold em `repos.config.ts` para a baseline atingida e subir gradualmente) — isso é config de
teste, permitido. Não relaxar para esconder área não testada de auth.

## 3. Code review com IA

- Rodar a skill [`review-pr`](https://github.com/lifesystemsufpr/ai-toolkit/blob/main/source/skills/review-pr.md) em cada PR, com a regra
  [`75-code-review`](https://github.com/lifesystemsufpr/ai-toolkit/blob/main/source/rules/75-code-review.md) como contexto: a IA revisa correção,
  **contrato cross-repo** (este serviço alimenta `ivcf-front` e `tecnoaging-front`), **segurança/auth**,
  presença de testes e simplicidade.
- **Revisão humana obrigatória:** qualquer mudança em **autenticação, autorização ou schema/migration**
  (Prisma) → acionar a skill [`review-clinical-change`](https://github.com/lifesystemsufpr/ai-toolkit/blob/main/source/skills/review-clinical-change.md).
  IA **não** faz merge autônomo nessas áreas.

## 4. Automação / CI

- Workflow reutilizável aplicável: **`ci-node-backend.yml`** (já em uso via `ci.yml`).
- **Gate pré-PR local** com a skill [`pre-pr-gate`](https://github.com/lifesystemsufpr/ai-toolkit/blob/main/source/skills/pre-pr-gate.md):
  `lint` + `build`(typecheck) + `test:cov` antes de abrir PR, ciente do impacto nos fronts consumidores.
- Atenção ao **setup do CI**: o job de teste roda `prisma generate` antes — manter no workflow do hub.

## 5. Guard-rails específicos

- **Auth é área de risco máximo:** segredos (JWT secret, credenciais) nunca em teste/fixture/log.
- Nada de dado pessoal real em fixtures — usar dados sintéticos.
- Mudança de `prisma/schema.prisma` → review humano + atenção a migration.

## 6. Passo a passo "como fazer"

1. Rodar `generate-tests` nos alvos de prioridade 1 (funções puras) → validar local.
2. Rodar o `pre-pr-gate` (lint + build + test:cov).
3. Abrir **PR só de testes** → acompanhar o CI (`ci-node-backend`) ficar verde.
4. Medir cobertura; se < 60%, documentar rampa em `repos.config.ts` (config-only) e regenerar `ci.yml` se preciso.
5. Avançar para prioridades 2→4, um PR pequeno por vez.
6. Rodar `review-pr` em cada PR; em mudança de auth/schema, **parar e pedir revisão humana**.
7. **Merge só com OK explícito** do responsável (guard-rail de repo de produto).
