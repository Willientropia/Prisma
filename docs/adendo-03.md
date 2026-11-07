# ADENDO 03: testes automatizados e regressão contínua

## O que foi feito

### Camadas (C1) e comandos (C5)

| Comando | O que roda | Onde |
|---|---|---|
| `npm run test:unit` | Vitest em Node: motor, conversor, formato, conformidade visual, testes meta | `src/**/*.test.ts`, `tests/meta/` |
| `npm run test:browser` | Vitest no Edge (Playwright): campo MathLive com teclado de verdade | `src/**/*.browser.test.tsx` |
| `npm run test:rust` | `cargo test` | `src-tauri/src/**` |
| `npm run test:e2e` | Playwright no Edge contra o Vite, Tauri simulado | `tests/e2e/`, `tests/regressao/` |
| `npm run test:visual` | Playwright `toHaveScreenshot` | `tests/visual/` |
| `npm run test:app` | `tauri build --debug --no-bundle` + tauri-driver + WebdriverIO | `tests/app/` |
| `npm run test` | unidade + navegador + Rust (pre-commit) | |
| `npm run verify` | tipos + lint + tudo acima menos `test:app` + matriz + cobertura + relatório (pre-push) | `scripts/verify.ts` |
| `npm run verify:full` | `verify` + `test:app` | |

### Peças

- **Tauri simulado** (`src/dev/tauri-mock.ts`): substitui o antigo disco em memória do `platform.ts`. Usa `mockIPC`/`mockWindows` do `@tauri-apps/api/mocks`, então o app chama os mesmos comandos do Rust. Disco em memória montado de `tests/fixtures/` e `resources/`, relógio fixo, registro dos diálogos pedidos (`prismaDev.dialogLog`). Só entra em `npm run dev` fora do Tauri.
- **Matriz** (`tests/MATRIZ.md`) com todos os critérios: SPEC 12 quebrada em itens (F0 a F7), A9, B10, B7, B4, V (checklist 4.7), C7, C9 e BUG. `scripts/check-matriz.ts` lê `[ID]` nos testes, `id:` nos YAML e os títulos do `tests/MANUAL.md`.
- **Dados (C3):** `tests/golden/calculos.yaml` (motor), `conversao.yaml` (linear ⇄ LaTeX), `teclado.yaml` (teclas no campo). O teste de ida e volta acha sozinho os arquivos de `tests/fixtures/` e `resources/`.
- **Visual (C4):** 9 telas em `tests/visual/__snapshots__/` (1440 × 900, escala 1, relógio fixo, sem animação nem cursor; o "Calculado em X ms" é mascarado porque muda a cada execução).
- **Desempenho (C7.7):** medido dentro da página (da última tecla ao resultado novo), sem o atraso do Playwright.
- **Cobertura (C7.5):** soma Vitest (unidade + navegador) com a cobertura V8 dos testes Playwright (`tests/e2e/fixtures.ts` grava, `scripts/coverage.ts` converte com o mesmo conversor do Vitest). Valor guardado em `tests/coverage-baseline.json`.
- **App real:** em build de depuração, a variável `PRISMA_HOME` troca Documentos, AppData e LocalAppData por uma pasta temporária, para os testes não mexerem nos arquivos de quem roda. Em build de produção ela é ignorada.
- **Lint:** `.skip`, `.only` e `fixme` são erro em qualquer teste (plugins do Vitest e do Playwright + uma regra própria para `test.fixme`, que o plugin não pega).
- **Ganchos do Git:** pre-commit `npm run test`, pre-push `npm run verify` (`simple-git-hooks`).

### Bugs achados pelos testes novos

| ID | Bug | Correção |
|---|---|---|
| BUG-005 | Na folha, `ir cabos-cc` não achava o arquivo da mesma pasta sem projeto aberto | a folha passa a listar a própria pasta, como o caderno (`Folha.tsx`) |
| BUG-006 | Abrir um `.prsm` de 1 MB levava 728 ms (limite 500) | o editor de texto serializava o Markdown inteiro ao montar só para comparar; agora compara com o último texto sincronizado (148 ms) |

Também: a prévia do arraste de região na folha passou a mostrar a posição já encaixada na grade (antes mostrava a posição solta e "pulava" 10 px ao soltar).

## Decisões para o usuário julgar

1. **Contraste (V-09).** Três pares de tokens definidos na SPEC ficam abaixo de 4,5:1: `--tex-comment` sobre `--bg-code` (4,34), `--text-linenum` sobre `--bg-code` (2,74) e `--text-dim` sobre `--bg-tabsbar` (3,33). A SPEC proíbe mudar tokens por conta própria, então o teste lista esses três como exceção conhecida. Precisa de decisão.
2. **Variável com nome de unidade.** Na folha, se `S` deixa de estar definido (por exemplo, região movida para baixo do uso), o math.js lê `S` como siemens e o erro vira "Não é possível converter ... em V" em vez de "Variável não definida: S". O teste F3-05 confere só que os resultados viram erro.
3. **A9-02 no app real.** O msedgedriver entrega `args` ao WebView2, não ao programa; então o teste automático cobre "com o Prisma aberto, o segundo arquivo abre outra aba". A abertura a frio com arquivo está no teste Rust e no item manual A9-03.

## Pendente

- F3-02 (ATENÇÃO na `string-3`), F4-02/03/04/06, F5, F6-01/02 e F7: ficam `pendente` na matriz até a fase chegar.
- Integração contínua no GitHub (opcional no C5): não criada.
- Itens manuais (`tests/MANUAL.md`): A9-01, A9-03 e C9-01 sem data de conferência.
