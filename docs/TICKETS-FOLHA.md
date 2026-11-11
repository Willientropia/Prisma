# Tickets — foco na folha livre

Até a folha ficar redonda, só estes tickets. MANUTENCAO-01, ADENDO-06 e o resto do app ficam parados.
Legenda: **[R]** = `revisor` no diff antes do commit. Arquivo principal: `src/editors/folha/Folha.tsx`.

## Lote F1 — o que você vê quebrado hoje

| # | Problema | Modelo | Causa (já localizada) | Pronto quando |
|---|----------|--------|-----------------------|---------------|
| F00 | Verificação pesada e instável | Sonnet | `npm run verify` roda tsc, lint, Vitest com cobertura, cargo, Playwright inteiro e visual a cada ticket; o teste de desempenho C7-02 reprova por 3 ms (503 ms/500) | existe `npm run verify:rapido` (tsc + `vitest related` dos arquivos mudados + `playwright test tests/e2e/folha.spec.ts tests/regressao`); desempenho só no `verify:full`; CLAUDE.md passo 4 atualizado |
| F01 | Região só anda para a direita/baixo; depois não volta | Sonnet | `snap()` (linha 40) faz `Math.max(0, …)` e é usado no **deslocamento** do arrasto (linhas 296 e 301): todo dx/dy negativo vira 0 | deslocamento negativo funciona; só a posição final é limitada a ≥ 0; teste e2e arrastando para a esquerda e para cima |
| F02 | Várias regiões selecionadas não arrastam juntas | Sonnet [R] | provável: `moveRegions` (linha 241) edita o texto região por região com offsets calculados antes da 1ª edição; a 1ª edição desloca os seguintes. Confirmar com teste antes de corrigir | arrastar 3 regiões selecionadas move as 3 e o arquivo continua íntegro |
| F03 | Teclado para de responder na folha | Sonnet [R] | B6: `creating.current` só volta a `false` no `onReady` do campo; se o campo não montar, toda tecla vai para `pendingKeys` para sempre. B5: `holdKeys` sem prazo | `creating` tem prazo e `finally`; `holdKeys` com prazo de 1 s; teste que simula campo que não monta |
| F04 | `x` indefinido e `j` viram unidade (`*x`, `j`) | opusplan [R] | B9: o motor resolve nome desconhecido como unidade do math.js; no formato linear, número + espaço + nome vira grandeza (`prepare.ts` linhas 135–136) | **Decisão do usuário (10/11):** dentro da expressão, nome é sempre variável: `9j` = 9·j, e `j` indefinido dá erro "não definida", como no SMath. Unidade só entra pelo marcador ▫ à direita do resultado (ADENDO 06, 1.2) ou escolhida no assistente (Parte 3), com cor própria. Propor como a unidade fica no arquivo e **perguntar antes de mudar o formato**; arquivos antigos continuam abrindo igual |

→ Teste manual seu na folha.

## Lote F-A6 — ADENDO 06 na folha (prioridade do usuário)

Documento: `ADENDO-06-teclado-assistente-ribbon-e-graficos.md` (raiz). Cada ticket lê só a parte indicada.
Visual do ribbon: `referencia-ribbon-matematica.dc.html`.

| # | Parte | Modelo | Observação |
|---|-------|--------|------------|
| A6-1 | Parte 1: estrutura da região (um só `=`, reclassifica a cada edição) e formato padrão (4 casas, sem zeros) | Sonnet [R] | **mostrar a lista de valores que mudam e esperar autorização antes de mexer em teste ou imagem** |
| A6-2 | Parte 2.1 e 2.2: tabela de atalhos e funções digitadas pelo nome viram estrutura | Sonnet | um caso por linha em `teclado.yaml` |
| A6-3 | Parte 2.3 a 2.5: Espaço amplia a seleção, `Ctrl+.`, comportamentos conferidos no SMath | Sonnet [R] | 2.5 corrige o E8-08 |
| A6-4 | Parte 3: assistente dinâmico (lista ao digitar, Tab/Enter aceita, unidades em cor própria) | opusplan [R] | liga com a decisão do F04 |
| A6-5 | Parte 4.1, 4.2, 4.7, 4.8: guias e guia Matemática (operadores, integral, derivada, raiz…) | Sonnet [R] | seguir a referência visual exata |
| A6-6 | Parte 4.3 a 4.5: Matrizes, Lógica e programação, Símbolos (letras gregas) | Sonnet | |
| A6-7 | Parte 4.9: catálogo de funções (`Ctrl+E`) e de unidades (`Ctrl+W`) | Sonnet | |
| A6-8 | Parte 5.3: integral (Gauss-Kronrod) e derivada no motor | Sonnet [R] | critérios 06-35, 06-36, 06-24 |
| A6-9 | Parte 5.1, 5.2, 5.4 e 4.6: gráfico 2D com `@` e ferramentas de gráfico | opusplan [R] | critérios 06-37 a 06-44 |

→ **Fable nº 1** depois do A6-4 (diff de F01 a A6-4) e **Fable nº 2** no fim do lote. `verify:full` no fim do lote.


## Lote F2 — motor da folha (achados da auditoria, depois do F-A6)

| # | Achado | Modelo |
|---|--------|--------|
| F05 | B4 `for`, `Z%`, `U1_1ϕ` editáveis (antigo T04) | opusplan [R] |
| F06 | B7 + B18 limites no worker (`range`/`for`/`integral`) e prazo | Sonnet [R] |
| F07 | B11 definição circular sem estouro de pilha | Sonnet |
| F08 | B10 função enxerga definição em aberto | opusplan [R] |
| F09 | B8 nomes reservados (`E`, `tau`, `phi`…) — **decisão do usuário** | Opus |
| F10 | B13 mensagens em português e índices a partir de 1 | Sonnet |
| F11 | B12 simbólico com complexo; B14 `fmtSmath` NaN | Sonnet |
| F12 | B16 bordas da sintaxe linear; B17 profundidade + fuzz | Sonnet |

## Lote F3 — completar a folha

| # | Item | Modelo |
|---|------|--------|
| F13 | Levantar o que falta para a folha igualar o SMath no uso do usuário → `docs/FOLHA-CHECKLIST.md` (seleção, arrasto, copiar/colar, desfazer, áreas, teclado, formatação) | Opus, sessão curta, só ADENDO-05 e `Folha.tsx` |
| F14+ | Um ticket por item do checklist | Sonnet |
