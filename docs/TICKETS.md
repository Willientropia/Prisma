# Tickets — AUDITORIA-FABLE e documentos seguintes

Legenda: **[R]** = revisão do diff pelo subagente `revisor` (Opus) antes do commit.
Modelo = quem abre a sessão. Cada ticket: teste de regressão primeiro, depois a causa raiz.

## Lote A — travamentos e corrupção no editor (urgente)

| # | Achado | Modelo | Arquivos | Pronto quando |
|---|--------|--------|----------|---------------|
| T01 | B1 `.` solto trava (`2.`, `x.`, `.`, `Relação.`, `batata.`) | Sonnet [R] | `src/format/mathlinear.ts` (`atom`, `mul`), `src/math/MathField.tsx` (`case '.'`/`','`) | `atom()` não aceita `.` solto; `mul()` tem guarda de progresso; teste com cada entrada termina em < 100 ms |
| T02 | B2 nome com dígito vira produto (`R1`→`R*1`) | Sonnet [R] | `mathlinear.ts` (`name()`), regex do `MathField.tsx` | as 63 linhas do corpus que corrompem fazem ida e volta idênticas |
| T03 | B3 texto entre aspas perde espaços | Sonnet | `mathlinear.ts` | as 10 linhas do corpus fazem ida e volta |
| T04 | B4 `for`, `Z%`, `U1_1ϕ` não editáveis | Opus (opusplan) [R] | `mathlinear.ts`, `MathField.tsx` | as 54 + 24 linhas editáveis e com ida e volta |

→ **Ponto de controle Fable nº 1** (prompt B, só o diff do lote).

## Lote B — robustez (MANUTENCAO-02)

| # | Achado | Modelo | Arquivos | Pronto quando |
|---|--------|--------|----------|---------------|
| T05 | B5 `holdKeys` sem prazo prende o teclado | Sonnet | `MathField.tsx` | prazo de 1 s; solta se `!mf.isConnected` ou somente leitura |
| T06 | B6 `creating.current` preso na Folha | Sonnet | componente da Folha | sempre reiniciado em `finally` |
| T07 | B7 + B18 `range`/`for`/`integral` sem limite; prazo do worker | Sonnet [R] | worker | limites de passos; prazo vale desde a 1ª linha; `calculating:false` não sobrescrito |
| T08 | B17 profundidade + TypeError/RangeError nos parsers + fuzz fast-check | Sonnet | parsers, `tests/` | fuzz roda sem exceção não tratada |
| T09 | B15 `withAttr` em `doc.ts:110` com substituição corrompida | Haiku | `src/.../doc.ts` | substituição `'\\$&'` + teste |
| T10 | B14 `fmtSmath` NaN para < 1e-6 | Sonnet | formatação | teste com 1e-7, limite 7 |
| T11 | B11 definição circular → stack overflow | Sonnet | motor | mensagem em PT, sem estouro |
| T12 | B13 mensagens do math.js em inglês, índices 0-based | Sonnet | camada de erros | mensagens em PT, índices 1-based |
| T13 | B10 função não enxerga definição em aberto | Opus (opusplan) [R] | motor | comportamento igual ao SMath, documentado |
| T14 | B12 simbólico com complexo não renderiza | Sonnet | render simbólico | teste visual/unitário |
| T15 | B16 bordas da sintaxe linear | Sonnet | `mathlinear.ts` | casos listados na auditoria passam |
| T16 | B8/B9 nomes reservados e unidades | Opus [R] | motor da folha | **só depois da decisão do usuário** |
| T17 | Testes fracos: E8-21/22 (85 de 197), F3-05 motivo errado | Sonnet | `tests/`, `tests/MATRIZ.md` | **pedir autorização ao usuário antes de mudar teste**; manuais listados para ele rodar |
| T18 | Log em `%LOCALAPPDATA%\Prisma\logs`, ErrorBoundary, cão de guarda (R3/R4) | Sonnet | conforme MANUTENCAO-02 | critérios R5 |

→ **Ponto de controle Fable nº 2**.

## Lote C — engenharia (MANUTENCAO-01)

| # | Item | Modelo |
|---|------|--------|
| T19 | M1 knip + M2 Prettier | Haiku |
| T20 | M3 biblioteca de componentes (sem `<button>` fora de `src/components/`) | Sonnet |
| T21 | M4 store em fatias | Opus (opusplan) [R] |
| T22 | M5 `check-camadas` | Sonnet |
| T23 | M6 `docs/ARQUITETURA.md` | Haiku (revisar por Sonnet) |
| T24 | M7 C9-08 robusto + M8 critérios | Sonnet |

## Lote D — ADENDO-06

Opus planeja o lote (prompt C) e quebra em tickets por parte (1 a 5). Cada parte
em Sonnet. B19 entra aqui. A parte 1 exige autorização antes de mudar testes.

→ **Ponto de controle Fable nº 3**.

## Lote E — estudo do SMath

Opus, sessão própria, saída em `docs/SMATH-LACUNAS.md`. Escopo limitado: uma área
por sessão (formatação, unidades, funções, matrizes).
