// ESLint (ADENDO 03, C7.3): teste pulado ou focado é erro. O parser é o do Babel porque o
// typescript-eslint recusa o TypeScript 7 do projeto; estas regras não precisam de tipos.
import babelParser from '@babel/eslint-parser';
import vitest from '@vitest/eslint-plugin';
import playwright from 'eslint-plugin-playwright';

const parser = {
  parser: babelParser,
  parserOptions: {
    requireConfigFile: false,
    babelOptions: { babelrc: false, configFile: false, presets: ['@babel/preset-typescript', ['@babel/preset-react', { runtime: 'automatic' }]] },
  },
  sourceType: 'module',
  ecmaVersion: 'latest',
};

export default [
  { ignores: ['dist/**', 'src-tauri/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
  { files: ['**/*.{ts,tsx,js,mjs}'], languageOptions: parser },
  {
    files: ['src/**/*.test.{ts,tsx}', 'tests/meta/**/*.ts'],
    plugins: { vitest },
    rules: { 'vitest/no-disabled-tests': 'error', 'vitest/no-focused-tests': 'error' },
  },
  {
    files: ['tests/e2e/**/*.ts', 'tests/visual/**/*.ts', 'tests/regressao/**/*.ts', 'tests/app/**/*.ts'],
    plugins: { playwright },
    rules: { 'playwright/no-skipped-test': 'error', 'playwright/no-focused-test': 'error' },
  },
  {
    // o plugin do Playwright não pega test.fixme; o CLAUDE.md proíbe também
    files: ['src/**/*.test.{ts,tsx}', 'tests/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: 'CallExpression > MemberExpression.callee[property.name=/^(skip|only|fixme)$/]',
        message: 'Teste pulado, focado ou fixme é proibido sem autorização (ADENDO 03, C7.3).',
      }],
    },
  },
];
