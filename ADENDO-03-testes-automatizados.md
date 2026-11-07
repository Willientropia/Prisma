# ADENDO 03: testes automatizados e regressão contínua

Este adendo vale para **todo** o projeto, inclusive o que já foi feito. Objetivo:

1. Cada etapa nova (fase do SPEC ou adendo) entra **com os testes dela**.
2. Toda vez que algo novo é implementado, **todos os testes anteriores rodam de novo**. Nada é dado como pronto se algum teste antigo quebrar.
3. Cada critério de aceite escrito nos documentos tem **pelo menos um teste** ligado a ele, e isso é conferido automaticamente.

---

## C1. Camadas de teste

| Camada | Ferramenta | O que cobre | Pasta |
|---|---|---|---|
| Unidade | **Vitest** | Motor de cálculo, parser, `mathlinear.ts`, serialização dos arquivos, unidades, comandos | `src/**/*.test.ts` (ao lado do código) |
| Rust | **cargo test** | Leitura e gravação de arquivos, projeto `.prsp`, caminhos, LaTeX, exportação | `src-tauri/src/**` (`#[cfg(test)]`) |
| Componente | **Vitest em modo navegador** (`@vitest/browser` + Playwright, Chromium) | Componentes com MathLive e TipTap, que não funcionam em jsdom | `src/**/*.browser.test.ts` |
| Interface (E2E rápido) | **Playwright** contra o servidor do Vite, com o Tauri simulado por `@tauri-apps/api/mocks` (`mockIPC`) e um sistema de arquivos em memória | Fluxos completos: abrir, editar, digitar, calcular, salvar, exportar | `tests/e2e/` |
| Visual | **Playwright** `toHaveScreenshot` | Cada tela comparada com a imagem aprovada | `tests/visual/` |
| App real (E2E lento) | **WebdriverIO + tauri-driver** com o binário compilado | Instância única, argumentos de linha de comando, arquivos de verdade no disco, compilação LaTeX real | `tests/app/` |
| Manual | checklist | O que não dá para automatizar com confiança: instalador, duplo clique no Explorador, ícones no Windows | `tests/MANUAL.md` |

---

## C2. Identificador de critério e matriz de rastreio

Todo critério de aceite tem um ID fixo:

| Origem | Formato | Exemplo |
|---|---|---|
| Fases do SPEC (seção 12) | `F<fase>-<nº>` | `F2-03` |
| Adendo 01 (seção A9) | `A9-<nº>` | `A9-05` |
| Adendo 02 (seção B10) | `B10-<nº>` | `B10-07` |
| Checklist visual (SPEC 4.7) | `V-<nº>` | `V-02` |
| Adendos futuros | `<letra do adendo><seção>-<nº>` | `D7-01` |
| Bugs corrigidos | `BUG-<nº>` | `BUG-014` |

Os critérios das fases do SPEC que estão escritos em uma frase só devem ser quebrados em itens numerados no arquivo `tests/MATRIZ.md` (primeira tarefa deste adendo).

**Cada teste declara o critério no nome**, entre colchetes, no começo:

```ts
test('[B10-01] S:4mm^2 + Enter mostra S ≔ 4 mm² e grava "S := 4 mm^2"', async ({ page }) => { ... });
```

**`tests/MATRIZ.md`** lista todos os critérios:

```markdown
| ID | Critério | Teste(s) | Tipo |
|---|---|---|---|
| A9-05 | Abrir e salvar sem editar devolve bytes idênticos | tests/e2e/arquivos.spec.ts | e2e |
| A9-01 | Instalador em C:\Program Files\Prisma | tests/MANUAL.md#a9-01 | manual |
| B10-07 | Mudar S recalcula em até 150 ms | tests/e2e/folha-recalculo.spec.ts | e2e |
```

**Script `scripts/check-matriz.ts`** (roda dentro do `npm run verify`):

1. Lê todos os IDs de `tests/MATRIZ.md`.
2. Procura `[ID]` nos nomes dos testes (Vitest, Playwright, WebdriverIO) e nos itens de `tests/MANUAL.md`.
3. **Falha** se algum ID da matriz não tem teste, ou se algum teste cita um ID que não está na matriz.
4. Imprime a contagem por origem: `F0 6/6, F1 9/9, A9 11/11 (3 manuais), B10 11/11 ...`.

---

## C3. Testes guiados por dados (para crescer sem escrever código)

Os casos que mais vão crescer ficam em arquivos YAML. **Acrescentar um caso = acrescentar algumas linhas**; o teste que lê o arquivo já existe.

### `tests/golden/calculos.yaml` (motor de cálculo)

```yaml
- id: F2-04
  descricao: queda de tensão CC, 6 mm²
  definicoes: ["ρ_cu := 0.0179 Ω*mm^2/m", "ΔV(L, I, S) := 2*ρ_cu*L*I/S"]
  expr: "ΔV(25 m, 12 A, 6 mm^2)"
  esperado: {valor: 1.79, unidade: V, tolerancia: 0.5%}
- id: F2-05
  expr: "1 m + 1 A"
  erro: "Unidades incompatíveis"
```

### `tests/golden/teclado.yaml` (edição visual, Adendo 02)

```yaml
- id: B10-01
  contexto: folha
  teclas: "S:4mm^2{Enter}"
  latex: 'S\coloneq 4\,\unit{mm^{2}}'
  linear: "S := 4 mm^2"
  tela_contem: ["≔", "mm"]
  tela_nao_contem: [":=", "^"]
- id: B10-05
  teclas: "I:11,5A{Enter}"
  linear: "I := 11.5 A"
```

`{Enter}`, `{Ctrl+G}`, `{ArrowRight}` etc. são teclas especiais. O teste roda no Vitest em modo navegador.

### `tests/golden/conversao.yaml` (tabela B9 do Adendo 02)

Uma linha por par linear/LaTeX. O teste confere `toLatex`, `toLinear` e a ida e volta.

### Arquivos de exemplo

`tests/fixtures/` guarda todos os arquivos de exemplo (`cabos-cc.prsm`, `string-3.prsf`, `eletrica.prsl`, `usina-boa-vista/` com o `.prsp`, um `.prst`, um arquivo com CRLF e BOM). O teste de ida e volta **descobre os arquivos sozinho** (glob em `tests/fixtures/**/*.{prsm,prsf,prsl,prst,prsp}`). Arquivo novo na pasta já entra no teste.

---

## C4. Testes visuais

- Janela fixa de **1440 × 900**, escala 1, fontes do `resources/fonts/` (nunca do sistema).
- Relógio e datas congelados (`page.clock.setFixedTime('2026-11-07T14:06:00-03:00')`), para que "hoje, 14:06" seja sempre igual.
- Animações e cursor piscando desligados durante a captura.
- Tolerância: `maxDiffPixelRatio: 0.01`.
- Telas com imagem aprovada, no mínimo: tela inicial; caderno `cabos-cc` (guias Início e Exibir); folha `string-3` com resultados; documento LaTeX com PDF; biblioteca `eletrica` com `ΔV` selecionada; diálogo Exportar; menu do app aberto; painel Projeto aberto.
- As imagens aprovadas ficam versionadas em `tests/visual/__snapshots__/`.
- **Atualizar imagem aprovada** (`npx playwright test --update-snapshots`) só quando a mudança visual foi pedida. O commit tem que dizer qual pedido justificou a mudança.

---

## C5. Comandos

No `package.json`:

| Comando | O que faz | Quando |
|---|---|---|
| `npm run test:unit` | Vitest (unidade) | a todo momento |
| `npm run test:browser` | Vitest em modo navegador | a todo momento |
| `npm run test:rust` | `cargo test` em `src-tauri` | a todo momento |
| `npm run test:e2e` | Playwright com Tauri simulado | antes de concluir uma tarefa |
| `npm run test:visual` | Playwright visual | antes de concluir uma tarefa |
| `npm run test:app` | `tauri build --debug` + WebdriverIO + tauri-driver | ao fechar uma fase ou adendo |
| `npm run test` | unidade + navegador + Rust | atalho do dia a dia |
| **`npm run verify`** | `tsc --noEmit` + lint + **todos** os testes acima (menos `test:app`) + checklist 4.7 do SPEC + `check-matriz` + relatório | **ao fim de cada tarefa** |
| `npm run verify:full` | `verify` + `test:app` | **ao fim de cada fase ou adendo** |

`verify` tem que terminar com código de saída 0. Qualquer falha devolve código diferente de 0.

### Ganchos do Git (`simple-git-hooks`)

- **pre-commit**: `npm run test` (rápido).
- **pre-push**: `npm run verify`.

### Integração contínua (opcional, se o projeto for para o GitHub)

`.github/workflows/verify.yml` com `runs-on: windows-latest`, rodando `npm ci` e `npm run verify:full`, com upload de `test-results/` como artefato.

---

## C6. Relatório

O `verify` gera `test-results/RELATORIO.md` com:

```markdown
# Relatório de verificação, 2026-11-07 14:40

Resultado: APROVADO (412 testes, 0 falhas, 0 pulados)

| Origem | Critérios | Automatizados | Manuais | Falhando |
|---|---|---|---|---|
| F0 | 6 | 6 | 0 | 0 |
| A9 | 11 | 8 | 3 | 0 |
| B10 | 11 | 11 | 0 | 0 |

Cobertura: motor 94 % (mínimo 90), formato 97 % (mínimo 90), geral 78 % (mínimo 70)
Desempenho: recálculo string-3 41 ms (limite 150), abertura de arquivo 120 ms (limite 500)
Novos testes nesta tarefa: 14
```

Ao terminar cada tarefa, o Claude Code mostra esse relatório resumido para o usuário.

---

## C7. Regras (valem para o Claude Code e para qualquer pessoa)

1. **Teste antes de concluir.** Uma etapa só está pronta quando: os critérios dela estão na `MATRIZ.md`, cada um tem teste, e `npm run verify` passa **inteiro**, não só os testes novos.
2. **Regressão é bloqueante.** Se um teste antigo quebrou, a etapa nova não está pronta. Corrigir o código, não o teste.
3. **Proibido enfraquecer teste sem autorização do usuário.** Não pode: apagar teste, usar `.skip`/`.only`/`test.fixme`, aumentar tolerância, trocar o valor esperado ou atualizar imagem aprovada para "fazer passar". Se o teste estiver errado de verdade, explicar ao usuário e esperar o OK. O lint bloqueia `.skip` e `.only` (`eslint-plugin-vitest` e `eslint-plugin-playwright`, regras `no-skipped-tests` e `no-focused-tests` como erro).
4. **Todo bug vira teste.** Antes de corrigir um bug, escrever o teste que reproduz o bug (ele tem que falhar), com ID `BUG-<nº>` em `tests/regressao/`. Depois corrigir e ver o teste passar. Registrar na `MATRIZ.md`.
5. **Cobertura não pode cair.** Mínimos: `src/engine/` e `src/format/` com 90 % de linhas, projeto inteiro com 70 %. O valor atual fica em `tests/coverage-baseline.json`, e o `verify` falha se a cobertura de qualquer área ficar abaixo do valor guardado (com folga de 0,5 ponto). Quando a cobertura sobe, o arquivo é atualizado.
6. **Teste instável não é tolerado.** Se um teste falha às vezes, corrigir a causa (espera por condição em vez de tempo fixo, dados determinísticos). Proibido `retries` maior que 0 no Playwright local.
7. **Orçamentos de desempenho também são testes:** recálculo da `string-3` ≤ 150 ms; abrir um `.prsm` de 1 MB ≤ 500 ms; abrir o app até a tela inicial ≤ 3 s (só em `test:app`).

---

## C8. Primeira tarefa deste adendo (no código que já existe)

1. Instalar e configurar Vitest (unidade e modo navegador), Playwright, WebdriverIO + tauri-driver, ESLint com as regras de C7.3, `simple-git-hooks`.
2. Criar `tests/MATRIZ.md` com **todos** os critérios já escritos: SPEC seção 12 (fases 0 a 7, quebrados em itens), SPEC 4.7 (`V-01` a `V-09`), Adendo 01 A9, Adendo 02 B10.
3. Escrever os testes de tudo que **já está implementado**. O que ainda não foi implementado entra na matriz com o status `pendente`, e o `check-matriz` aceita `pendente` só para fases futuras: critério de fase marcada como concluída nunca pode estar pendente.
4. Criar os YAML de C3 com os casos dos documentos.
5. Gerar as imagens aprovadas das telas que já existem e **mostrar ao usuário** antes de versionar.
6. Rodar `npm run verify` e entregar o relatório. Se algo do que já foi feito falhar, listar o que falhou e corrigir.

## C9. Critérios de aceite deste adendo

| ID | Critério |
|---|---|
| C9-01 | `npm run verify` roda tudo de C5 (menos `test:app`) e termina com código 0 |
| C9-02 | `check-matriz` falha se um ID da matriz ficar sem teste (testar removendo um teste numa cópia temporária) |
| C9-03 | Um `.skip` em qualquer teste faz o lint falhar |
| C9-04 | Um arquivo novo em `tests/fixtures/` entra no teste de ida e volta sem mudar código |
| C9-05 | Um caso novo em `tests/golden/calculos.yaml` vira teste sem mudar código |
| C9-06 | Mudar uma cor em `tokens.css` faz o teste visual falhar |
| C9-07 | O relatório `test-results/RELATORIO.md` é gerado com as seções de C6 |
| C9-08 | O pre-commit roda `npm run test` e bloqueia commit com teste falhando |
