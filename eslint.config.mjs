// @ts-check
// Config padrão NestJS 11 (flat config / ESLint 9). Adicionada via devops-hub
// bootstrap: o repo tinha as deps do scaffold mas o arquivo de config faltava,
// então `npm run lint` quebrava. Família no-unsafe-* em warn na fase de adoção.
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist', 'node_modules', 'coverage', 'generated'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      // TODO(adoção): dívida atual do repo — promover a 'error' após a limpeza.
      // (no-redundant-type-constituents some quando o `prisma generate` rodar antes do lint.)
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
    },
  },
  // Testes (.spec.ts): parser sem o projeto type-checked — evita exigir que cada spec
  // esteja no tsconfig (erro "not found by the project service") e desliga as regras
  // type-aware, que não rodam sem type info. Mocks usam `as any` à vontade.
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: { projectService: false, project: false },
    },
  },
);
