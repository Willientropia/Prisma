# A6-4: assistente dinâmico (ADENDO 06, Parte 3), lote F-A6, [R]

## Contexto

Na folha, ao digitar um nome, o SMath abre uma lista com variáveis, funções, unidades e constantes. Tab aceita. No campo de unidade (▫) a lista abre na hora, só com unidades. O Prisma ainda não tem essa lista. Desde o F04, nome digitado é sempre variável, e unidade só entra de forma explícita (`'m`, número espaço unidade, `= ? unidade`). O assistente é o caminho que falta.

Worktree: `C:\Users\pedro\Documents\Code\Prisma\.claude\worktrees\a6-4-assistente-26f086`. Branch `claude/a6-4-assistente-26f086`, criada a partir do lote (HEAD 28953e9, com A6-1, A6-2, A6-3, A6-8, F-INST e F-CONFIG).

## Decisões (usuário, 12/11) e interpretações deste plano

1. **Enter:** aceita só depois de escolher um item com ↑/↓ (ou com um clique num item). Sem escolher, Enter grava e sai como hoje. Isso substitui o ADENDO 06, 3.5, e o 06-14 vira dois casos. Tab, Ctrl+Enter, Shift+Enter, Ctrl+Espaço (com a lista aberta) e duplo clique sempre aceitam.
   - Motivo: com "aceita se completar", `2*x` + Enter viraria `xy2pol` e `a≤b` + Enter viraria `bar`. Testes atuais como `teclado.yaml:44` e `:213` mudariam.
2. **Nomes das unidades:** tabela própria `src/engine/unidades.ts`, aprovada pelo usuário.
   - Uma linha por unidade: `[símbolo, nome pt-BR, grandeza, fator?]`, cerca de 120 linhas.
   - Nomes do SI em pt-BR (INMETRO).
   - Referência de quais símbolos entram: a lista de símbolos do SMath (abaixo), cruzada com o que o motor aceita.
   - O fator aparece na linha 2 do detalhe ("1 h = 3600 s") e é calculado pelo math.js. Só `%` (que não é unidade do math.js) traz o fator escrito.
   - Prefixadas (mm, kN, mV) não têm linha própria. Viram um item montado na hora: "mm · Metro com prefixo mili (Comprimento)".
3. **Arquivo:** sem mudança de formato. Aceitar uma unidade insere `\class{u}{\mathrm{…}}`, o mesmo que o `'` insere hoje (`MathField.tsx:192`). Então o `.prsf` grava `'mm` (sem número antes) ou `2 mm`, como no F04.
4. **Cor:** `--math-unit` / `--math-unit-paper` já existem (`tokens.css:95-96`, ligadas a `--mf-unit` em `global.css:35-40`). Tokens usados: `--accent-light`, `--type-lib`, `--text-2`, `--text-muted`, `--selection`, `--bg-raised`, `--border-strong`, `--shadow-menu`. Nenhuma cor nova.
5. **Imagens do 06-43 (assistente aberto, 06-10 e 06-11):** gravadas neste ticket. Antes do commit, mandar as imagens ao usuário (SendUserFile) e esperar o sim dele.
6. **Ordem da lista (interpretação; aprovar o plano aprova isto):** os grupos do 3.3.1 continuam (começa com, mesma caixa → começa com, sem caixa → contém).
   - Dentro de cada grupo, a ordem é: usuário → biblioteca → **nome igual ao digitado (sem caixa; a mesma caixa antes)** → nativas → unidades → constantes → alfabética (`localeCompare('pt-BR')`).
   - Sem a regra do "igual ao digitado", o 06-10 falha: o primeiro item de `s` seria `sin` (nativa vem antes de unidade), e o 06-10 pede o detalhe "s · Segundo (Tempo)".
   - O 06-12 continua valendo: `s_batata` (usuário) vem antes da unidade s.
   - A anotação do usuário também vale: com `v` definido, a variável v vem antes de V (volt).
7. **Textos de interface:**
   - Categorias, com os nomes da tabela 3.2: "Variável do usuário", "Função do usuário", "Função de biblioteca", "Função nativa", "Unidade", "Constante".
   - Última linha do detalhe: "Tab para inserir" (3.4 e 06-10; o "Pressione TAB para inserir" é o texto do SMath).
   - Botão do ribbon: "Assistente dinâmico" (3.1).
   - **Textos novos fora dos documentos:** barra de status "Assistente dinâmico ligado" / "Assistente dinâmico desligado" ao alternar, porque o ribbon não mostra estado ligado. Aprovar o plano aprova esses dois textos.
8. **Escopo:**
   - Só a folha: `Folha.tsx` passa o assistente; o caderno não (fica pendente).
   - A6-3-52 fica parcial. A ordem (`x` → xy2pol primeiro) é feita aqui. A assinatura e a descrição de função **nativa** precisam do catálogo de funções (A6-7): hoje não há descrição pt-BR de função nativa no código. Para nativa, o detalhe mostra só "xy2pol · Função nativa".

## Arquivos

| Arquivo | O quê |
|---|---|
| `src/engine/unidades.ts` (novo) | `UNIDADES: [símbolo, nome, grandeza, fator?][]`; `PREFIXOS_PT` (m→mili, k→quilo, µ/u→micro, n→nano, c→centi, M→mega, G→giga…); `unitInfo(sym)` → `{ nome, grandeza, fator? } \| null`, que também resolve prefixadas pelo math.js (`math.unit(toMath(sym)).units[0]` → `unit.name` + `prefix.name`) |
| `src/math/assistente.ts` (novo, lógica pura) | tipos `AssistItem`, `AssistKind`; `partialName(latexBefore)`; `filterItems(items, typed, opts)`; `unitItems()` (memo estático); `nativeItems()`; `constItems()`; `acceptLatex(item)` |
| `src/math/assistente.test.ts` (novo) | A6-4-01 a -07, -30 |
| `src/components/Assistente.tsx` + `Assistente.module.css` (novos) | lista e detalhe, só props |
| `src/components/Icon.tsx` | 3 ícones de traço novos: `varbox` (x itálico no quadrado), `fnbox` (f itálico no quadrado), `fnboxup` (f reto no quadrado) |
| `src/math/MathField.tsx` | prop `assist`, estado da lista em `FieldState`, teclas, renderização por portal |
| `src/math/MathLine.tsx` | repassa `assist` ao campo; `UnitInput` com `assist` só de unidades e `openOnFocus` |
| `src/engine/evaluate.ts` | `LineResult.assigned` (valor de definição sem `= ?`) |
| `src/format/views.ts` | `definedBefore` ganha `.list(key, line)` |
| `src/editors/folha/assistente.ts` (novo) + teste | `sheetItems(defs, results, libFns)` |
| `src/editors/folha/Folha.tsx` | monta e passa `assist` (linha 383) |
| `src/commands/library.ts` | `allFunctions()` devolve também `why` |
| `src/commands/app.ts`, `src/shell/ribbons.ts`, `src/shell/FormatDialogHost.tsx` | comando `exibir.assistente`, botão na guia Exibir da folha, gravação da config compartilhada |
| `tests/golden/teclado.yaml`, `src/math/teclado.browser.test.tsx` | campo `assistente: true`, casos 06-13 e A6-4-20 a -27 |
| `tests/e2e/assistente.spec.ts` (novo) | 06-10, -11, -12, -14b, -15, -16, A6-4-10, -12, -13, -14 |
| `tests/visual/telas.spec.ts` | `assistente-s.png`, `assistente-f.png` (06-43 parcial) |
| `tests/MATRIZ.md`, `docs/adendo-06.md` | linhas novas; nota do ticket |

## Detalhe de implementação

### 1. `src/engine/unidades.ts`
- **Quais símbolos entram:** os do SMath que o motor aceita (`isKnownUnit` de `MathLine.tsx:19`; `%` é aceito à parte).
  - Lista do SMath: % ‰ ppm ppb rad ° deg arcmin arcsec grad gon rev rpm rph acre barn a F farad kat C Fr statC Gy Sv A J cal BTU erg eV N dyn lbf gf kgf tonf kip Hz lx H bit B byte m micron mi nmi Å au ly pc in ft yd cd T G g ct t ton oz lb slug V W hp Pa atm bar torr mmHg inHg psi ksi Ω ohm mol K °C °F s sec yr month week day hr min kph mph knot P St L gal Bq Ci sr lm Wb Mx S R D Oe.
  - Também entram `h` (hora, se o motor aceitar), `Wp` e `dia` (próprias do Prisma, `math.ts:8-11`).
  - Fica de fora o que o motor não aceita. Ficam de fora `'` e `"`, que no Prisma são sintaxe.
- **Grandeza:** escrita na linha, não calculada. rad é "Ângulo", % é "Adimensional", Hz é "Frequência", Bq é "Atividade".
- **Exemplos de linha:** `['s','Segundo','Tempo']`, `['S','Siemens','Condutância elétrica']`, `['%','Porcentagem','Adimensional','0,01']`, `['V','Volt','Potencial elétrico']`.
- **Fator** (linha 2 do detalhe): `1 <unidade> = <valor SI>`.
  - Calcular com `math.unit(1, toMath(sym)).toSI()`, formatado por `show()` (`evaluate.ts:56`) e desenhado com `resultLatex` (`MathLine.tsx:25`).
  - Usar um formato com algarismos significativos (6), para `ppb` sair `1·10⁻⁹`, não `0`. Ver `FormatOpts` em `src/engine/format.ts`.
  - Omitir a linha quando a unidade já é de base do SI, quando der erro e nas unidades com deslocamento (°C, °F).
- **Prefixadas:** `unitInfo('mm')` → `{ nome: 'Metro com prefixo mili', grandeza: 'Comprimento' }`, quando `isKnownUnit('mm')` e `mm` não está na tabela. A base vem pela correspondência `toMath(símbolo)` ↔ `unit.name`, montada uma vez.

### 2. `src/math/assistente.ts`
- `AssistKind = 'var' | 'userfn' | 'lib' | 'native' | 'unit' | 'const'`.
- `AssistItem = { name; kind; lower /* name.toLowerCase(), pré-calculado */; nameLatex; insert /* latex inserido */; title /* "Segundo (Tempo)" / "Variável do usuário" */; detail?: string /* latex da linha 2 */; note?: string /* texto da linha 2 (biblioteca) */ }`.
- **`partialName(before)`:** usa só os **últimos 64 caracteres** de `before`. Isso evita backtracking O(n²) com regex ancorada no fim.
  - Pega a sequência `/[\p{L}\d]+$/u`. Se o caractere antes dela for `\`, é comando (`\rho`, `\cdot`) e devolve `null`.
  - Tira os dígitos do começo: `400V` → `V`, `R1a` → `R1a`, `2` → `null`.
  - Dentro de índice ou expoente (`state.script`), o MathField nem chama.
  - **Conferir no browser** o que `beforeCaret` devolve dentro da unidade do `'` (o comentário em `MathField.tsx:150` diz que o `\class` não aparece). O caso do teste A6-4-03 usa a string real observada.
- **`filterItems(items, typed, { units })`:**
  - `items` já vem ordenado por (categoria, alfabética), ordenado uma vez ao abrir a lista.
  - O filtro faz três passadas O(N), uma por grupo do 3.3.1. Em cada grupo vale a ordem da decisão 6: o item com `lower === typed.toLowerCase()` sobe para depois de usuário e biblioteca.
  - Se `typed` for unidade prefixada válida fora da tabela (nos dois modos), acrescenta o item montado (`unitInfo`) no lugar do "igual ao digitado".
  - Com `units`, filtra só itens `unit`.
  - `typed` com mais de 64 caracteres devolve `[]`.
- **`acceptLatex(item)`:**
  - variável: `nodeLatex({ t: 'id', name }, ctx)` (`mathlinear.ts:298`);
  - unidade: `unitLatex(parseUnit(name))` (`mathlinear.ts:290` e `:210`);
  - nativa com estrutura (`sqrt`, `nthroot`, `abs`, `int`, `sum`): `STRUCTURE[name]` (`MathField.tsx:79`; exportar);
  - outra nativa: `name\left(#0\right)`;
  - função do usuário ou de biblioteca com n parâmetros: `name\left(#0;#?;…\right)`;
  - constante: `\pi `, `\infty `, `e`.
- **Nativas:** lista explícita `BUILTINS` (`mathlinear.ts:32`, exportar se não for) mais `mat el range stack augment length row col xy2pol sys2mat fft invert vectorize for` (`smathfns.ts:101`).
- **Constantes:** π (casa com `pi`), ∞ (casa com `inf`), e.

### 3. Motor: `LineResult.assigned` (`evaluate.ts`)
- Novo campo `assigned?: Partial<Shown>` (text, numText, unit, unitRaw) nas definições **sem** `show`.
  - Ramos das linhas 250 e 255: `assigned: isScalar(v) ? safeShow(v, undefined, bfmt) : undefined`.
  - Matriz e vetor ficam sem `assigned`, para não formatar matrizes grandes à toa (C7-01/02).
- Não usar `text`/`numText` no nível de cima: o `MathLine` decide mostrar resultado por `parsed.show` (`MathLine.tsx:105`), então o campo novo não aparece na região.
- Antes de mudar, buscar testes que comparem `LineResult` inteiro (`toEqual(` em resultados de `evaluate`). Se algum quebrar por causa do campo novo, **parar e perguntar ao usuário**.

### 4. `definedBefore(...).list(key, line)` (`views.ts:187`)
- No mesmo laço, guardar para cada nome `{ n, raw, key, i }` da primeira definição.
- `list(key, line)` devolve os nomes com `n < here`, com `raw`, `key` e `i`. A assinatura atual continua (a função devolvida ganha a propriedade `.list`).
- Isso cumpre o 06-15: nunca aparece nome definido depois.

### 5. `src/editors/folha/assistente.ts`
`sheetItems(defs, blocks, libFns)`:
- **Função do usuário:** `raw` casa `/^\s*([^\s(:=#[]+)\s*\(([^)]*)\)\s*:=/`.
  - `userfn`, aridade = número de parâmetros.
  - `detail` = `lineToLatex(parseLinear(raw))` (mostra f(x) ≔ x + 2).
- **Variável:** `var`; `detail` = `nodeLatex(id) + ' = ' + resultLatex({ kind: 'eval', ...blocks[key][i].assigned })` quando houver `assigned`.
- **Biblioteca:** os nomes de `result.defined` que a folha não define (como em `Folha.tsx:102-103`), cruzados com `allFunctions()`.
  - `lib`; aridade pela `sig`; `detail` = a `sig`; `note` = a primeira frase de `why`.
  - Em `library.ts:107`, acrescentar `why: f.fields['Por que e quando usar'] ?? ''`.
- **Montagem:** `[...sheetItems, ...nativeItems(), ...unitItems(), ...constItems()]`, ordenada uma vez.
- `Folha.tsx` guarda `libFns` em estado com `useEffect(() => { void allFunctions().then(setLibFns) }, [result?.libs])`.
- Na linha 383 passa `assist={{ items: () => itemsFor(r.key, i), auto: assistOn }}`. As funções montam os itens só quando a lista abre, não a cada render.
- `assistOn = useWorkspace(x => x.config.assistente_dinamico !== false)`.

### 6. `src/components/Assistente.tsx` (só props, sem store)
- **Props:** `{ items: { key; kind; nameLatex; category }[]; sel; detail: { titleLatex; title; line2Latex?; note? } | null; x; y; theme; onSelect(i); onAccept(i) }`.
- **Desenho:** `<div role="listbox">` com `role="option"` e `aria-selected`. Nenhum `<button>`.
  - Lista: 220 px, itens de 24 px, no máximo 8 visíveis (`max-height: 192px; overflow-y: auto`), o item selecionado rola para a vista.
  - Cada item: ícone de 14 px (cores do 3.2), nome por `MathMarkup` (`MathField.tsx:404`; unidade com `\class{u}` sai em `--mf-unit`) e a categoria à direita em Inter 11 px `--text-muted`.
  - Item selecionado: fundo `--selection`.
  - Painel de detalhe de 260 px ao lado: linha 1 é o nome, " · " e o título; linha 2; "Tab para inserir" em Inter 11 px `--text-muted`.
  - Fundo `--bg-raised`, borda `--border-strong`, `box-shadow: var(--shadow-menu)`.
- **Mouse:** `onMouseDown={e => e.preventDefault()}` no contêiner, para o campo não perder o foco. Clique seleciona (`onSelect`, conta como escolhido); duplo clique aceita.
- **Posição:** `position: fixed` em (x, y). Renderizar por `createPortal(…, document.body)`.

### 7. `MathField.tsx`
- O arquivo já tem 407 linhas: atualizar a justificativa da linha 1 dizendo que o assistente mora em `assistente.ts`. Meta: a integração em cerca de 50 linhas.
- **Prop:** `assist?: { items: () => AssistItem[]; auto: boolean; units?: boolean; openOnFocus?: boolean }`.
- **Estado:** `FieldState.assist?: { all: AssistItem[]; shown: AssistItem[]; sel: number; typed: string; moved: boolean; units: boolean }`, mais `state.letter` (a última tecla foi letra; ou `'` com o assistente ligado).
- **Desenho:** um `useState` no componente. `state.paint = () => setView(...)`, ligado no `useEffect` de montagem.
- **Quando recalcula:** no evento `input` (`MathField.tsx:340`), se a lista está aberta, ou se `state.letter && assist.auto && !state.script`.
  - Recalcular: `typed = partialName(beforeCaret(mf))`. Com `state.unit` vale `units = true`; depois do `'` sem letra ainda, `typed = ''` mostra todas as unidades.
  - `shown = filterItems(...)`. Sem itens, fecha.
  - Operador digitado esvazia o `typed` e fecha a lista sozinho.
- **Teclas com a lista aberta:** bloco no **começo** de `handleKey`, antes do Ctrl+G.
  - ↑/↓: move `sel`, `moved = true`.
  - Tab (sem Shift), Ctrl+Enter, Shift+Enter, Ctrl+Espaço: aceitam.
  - Enter: com `moved` aceita; senão fecha a lista e segue para o `commit('enter')` de hoje.
  - Esc: só fecha a lista (não faz `commit('escape')`).
  - Espaço, ←, →, Home, End: fecham e seguem o caminho normal.
- **Com a lista fechada:** Ctrl+Espaço abre (mesmo com `auto = false`; `typed` vazio mostra tudo). Ao ganhar foco, `openOnFocus` abre.
- **Aceitar:**
  - `deleteBackward` × `typed.length`, depois inserir `acceptLatex(item)` com o `insert()` local.
  - Dentro da unidade do `'` (`state.unit`): inserir só o texto da unidade dentro do `\mathrm`, depois `moveAfterParent` e `state.unit = false`.
  - Fechar a lista; o `state.letter = false` impede que o `input` da inserção a reabra.
- **Fecha:** em `focusout` (`MathField.tsx:342`).
- **Posição:**
  - `x` = `mf.getElementInfo(mf.position - 1)?.bounds?.right ?? host.left`;
  - `y` = `host.current.getBoundingClientRect().bottom + 2`.
- Nenhum `window.addEventListener` novo.

### 8. `MathLine.tsx`
- Prop `assist` repassada ao `MathField` da linha 180.
- `UnitInput` (linha 241) recebe `assist={{ items: unitItems, auto, units: true, openOnFocus: true }}`, se `auto` estiver ligado.
- Conferir que `latexToUnit` (linha 223) lê `\class{u}{\mathrm{mm}}`. Ele já lê o próprio `unitLatex`.

### 9. Liga e desliga (06-16)
- **Gravar a config:** extrair o trecho de `FormatDialogHost.tsx:24-31` (`parseDocument` → `y.set` → `writeConfig` → `set({ config })`) para `saveConfig(patch)` exportada do mesmo arquivo, e usar nos dois lugares.
- **Comando:** `register('exibir.assistente', { run })` em `src/commands/app.ts`, seguindo o `exibir.codigo` da linha 31. Ele grava `assistente_dinamico: true | false` e mostra o texto de status da decisão 7. Sem a chave, vale ligado.
- **Ribbon:** em `ribbons.ts:49` (guia Exibir da folha), acrescentar `['exibir.assistente', 'Assistente dinâmico', 'fn']`.

## Ordem de execução

0. **Ambiente:**
   - `npm ci` se `node_modules` for um link ou não existir.
   - Antes de cada Playwright, conferir que a porta 1420 está livre (sessões paralelas).
   - Se o `verify` avisar que há menos de 5 GB livres, parar e avisar o usuário.
1. **`tests/MATRIZ.md`:**
   - Linhas novas: 06-10 a 06-16, 06-13, A6-4-01 a A6-4-30 e 06-43 (parcial: só o assistente).
   - Formato: `| ID | descrição | arquivo | camada | pendente |`.
   - Atualizar A6-3-52 e A6-3-60: "ordem feita no A6-4 (A6-4-12); assinatura e descrição de função nativa: A6-7".
2. **Testes que falham, primeiro:**
   - Escrever todos (lista abaixo), com o ID entre colchetes no nome.
   - O `testador` roda e confirma que falham. A saída vai para a pasta de notas compartilhadas, em `a6-4-falha-antes.log`.
3. **Implementar** nesta ordem: `unidades.ts` → `assistente.ts` → `assigned` no motor → `views.list` → `folha/assistente.ts` → ícones e `Assistente.tsx` → `MathField` → `MathLine`/`UnitInput` → `Folha` → comando e ribbon.
4. `testador` com `npm run verify:rapido`. Tudo verde, testes antigos incluídos.
5. **Imagens:**
   - Rodar só os dois testes visuais com `--update-snapshots`.
   - Mandar as duas imagens ao usuário e **esperar a aprovação**.
6. `revisor` no diff. Nota em `docs/adendo-06.md`, seção "A6-4": feito, pendente, decisões. Commit local `A6-4: assistente dinâmico (lista, Tab aceita, unidades com nome, campo de unidade)`. **Sem push.**

## Testes (ID → esperado)

### Unidade (Vitest)

**`src/math/assistente.test.ts`**
- **A6-4-01:** toda linha de `UNIDADES` passa em `isKnownUnit`, e nenhum símbolo se repete.
- **A6-4-02:** toda nativa da lista existe no motor (`name in math` ou `smathFunctions`).
- **A6-4-03** `partialName`:
  - `x` → `x`; `2\cdot x` → `x`; `400V` → `V`; `R1a` → `R1a`;
  - `\rho` → null; `2` → null; `a+` → null;
  - a string real de dentro da unidade do `'` → `mm`.
- **A6-4-04** ordem (decisão 6):
  - sem definições, `s` → primeiro é a unidade s, e a lista contém S;
  - com `s_batata` → `s_batata` primeiro, unidade s em seguida;
  - com `v` definido → v antes de V;
  - `x` → xy2pol primeiro.
- **A6-4-05:**
  - `mm` → item montado "Metro com prefixo mili (Comprimento)";
  - `m` não lista mm;
  - a prefixada aparece nos dois modos: `mm` também lista no modo geral (`units: false`), para `2mm{Tab}` funcionar.
- **A6-4-06** detalhe de unidade:
  - `%` → "Porcentagem (Adimensional)", fator 0,01;
  - `h` → `1 h = 3600 s`;
  - `s` sem linha de fator;
  - `ppb` com potência de 10, não 0.
- **A6-4-07:** com `units`, só aparecem itens `unit`.
- **A6-4-30** desempenho, mediana de 20 execuções, cada uma < 5 ms:
  - `partialName` em latex de 10 000 caracteres;
  - `filterItems` com 5 000 itens e consulta de 1 letra;
  - `filterItems` com consulta de 10 000 letras.

**Outros arquivos**
- **A6-4-08** (`src/engine/engine.test.ts` ou o teste de evaluate existente):
  - `s_batata := 2*7` → `assigned.text === '14'`, nos dois modos (normal e `symbolic`);
  - `M := mat(...)` sem `assigned`;
  - a linha com `= ?` não muda.
- **A6-4-09** (`src/format/views.test.ts` ou o teste existente de `definedBefore`): `list` só traz nomes de linhas anteriores, com o `raw` da definição.
- **A6-4-11** (`src/editors/folha/assistente.test.ts`):
  - variável com detalhe `= 14`;
  - `f(x) := x + 2` → `userfn` de aridade 1 e detalhe com ≔;
  - função de biblioteca com `sig` e a primeira frase de `why`.

### Browser (`teclado.yaml` com `assistente: true`)
O `Harness` passa `assist` com nativas, unidades e constantes, mais as variáveis de `definidos`. Os casos antigos não passam `assist` e não mudam.

| ID | Teclas | Esperado |
|---|---|---|
| 06-13 | `x:2'mm{Tab}{Enter}` | `x := 2 mm` |
| A6-4-20 | `V_mp:400V{Tab}{Enter}` | igual ao linear do caso `V_mp:400'V` (linha 17) |
| A6-4-21 | `I:11,5A{Tab}{Enter}` | igual ao caso `I:11,5'A` (linha 33) |
| A6-4-22 | `L:25m{Tab}{Enter}` | igual ao caso `L:25'm` (linha 71) |
| A6-4-23 | `k:x*m{Tab}{Enter}` | `k := x*'m` (igual ao caso da linha 99) |
| A6-4-24 (06-14a) | `y:s{Enter}` | `y := s` (s variável; Enter sem setas não aceita) |
| A6-4-25 | `s{Escape}+1{Enter}` | `s + 1` (Esc só fechou a lista) |
| A6-4-26 | `sq{Tab}4{Enter}` | `sqrt(4)` |
| A6-4-27 | `antes: g(a, b) := a + b`; `g{Tab}1{ArrowRight}2{Enter}` | `g(1, 2)`; antes, conferir o linear real de chamada com 2 argumentos |

### E2E (`tests/e2e/assistente.spec.ts`)
Usa o `sheet()` de `smath.spec.ts:7`; mover para `helpers.ts` se precisar.

- **06-10:** folha nova, digitar `s` → lista visível com os itens s e S; o primeiro selecionado é s; o detalhe tem "Segundo (Tempo)" e "Tab para inserir".
- **06-11:** com `f(x):=x+2` acima, digitar `f` → o primeiro item é f, categoria "Função do usuário"; o texto do detalhe contém f(x) ≔ x + 2.
- **06-12:** com `s_batata:2*7` acima, digitar `s` → s_batata é o primeiro, antes de qualquer unidade; o detalhe contém 14.
- **06-14b:** `s`, ↓, Enter → aceita o 2º item (o arquivo tem o nome dele) e o campo continua com foco; outro Enter sai.
- **06-15:** com `zz:5` numa região **abaixo**, digitar `z` numa região acima → a lista não tem zz.
- **06-16:** Exibir → Assistente dinâmico; digitar `s` → sem lista; Ctrl+Espaço → lista; `prismaDev.config()` tem `assistente_dinamico: false`.
- **A6-4-10:** `L:25'm`, `L=`, → → o campo de unidade abre com a lista **na hora**, só com unidades e com o detalhe; `mm{Tab}{Tab}` → o arquivo tem `L = ? mm`.
- **A6-4-12** (A6-3-52 parcial): digitar `x` → o primeiro item é xy2pol, "Função nativa".
- **A6-4-13:** duplo clique num item aceita.
- **A6-4-14:** depois de desligar e recarregar, a lista continua desligada.

### Visual (06-43 parcial, `tests/visual/telas.spec.ts`)
- `assistente-s.png`: o cenário do 06-10.
- `assistente-f.png`: o cenário do 06-11.
- Gravar como aprovadas só depois do sim do usuário.

## Verificação
- `testador`: `npm run verify:rapido` (tsc, `vitest related`, `folha.spec`, `tests/regressao`), mais o `assistente.spec.ts` e os testes de browser do teclado. Os testes antigos continuam verdes **sem mudar entrada nem valor esperado**. Se algum mudar, parar e mostrar a lista ao usuário.
- Conferência manual pelo preview, se der tempo: folha nova, `s`, setas, Tab, campo de unidade.
- `verify` / `verify:full` (C7-01/02) ficam para o fim do lote, com o orquestrador.

## Pendências a anotar (`docs/adendo-06.md`)
- O caderno ainda sem assistente.
- Assinatura e descrição de função nativa no detalhe: A6-7 (catálogo).
- O campo de unidade lista todas as unidades, não só as compatíveis com o resultado.
- **Prioridade alta (usuário, 12/11): nomes com letra grega (ρ, θ, φ, ω) abrirem o assistente. Entra logo depois do lote F-A6.**
- Os símbolos `'`/`"` (arcmin/arcsec) não entram, porque são sintaxe do Prisma.
