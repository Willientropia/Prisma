# F04: nome dentro da expressão é sempre variável (`9j` = 9·j, `L` indefinido não vira litro)

## Contexto
Hoje, na folha, `s := 10*L` com L indefinido dá `10 L` (litros), `a := b` dá `1 b` (bit), e digitar `9j` ou `2x` grava a grandeza `9 j` / `2 x`. Decisão do usuário (10/11): dentro da expressão, nome é sempre variável, como no SMath. Unidade só entra explicitamente: pelo `'`, pelo marcador de conversão do resultado ou, no futuro, pelo assistente (A6-4).

Formato aprovado pelo usuário (opção A):
- `número espaço unidade` continua sendo a unidade (`L := 25 m`, `ρ := 0.0179 Ω*mm^2/m`, `0.00393 1/°C`, `5.4 h/dia`). Depois de `= ?` também continua igual (`= ? mV`, `= ? deg`, `= ? 10^-6`).
- Nome solto é sempre variável.
- Unidade sem número antes ganha apóstrofo, como no SMath: `x*'m`, `'A/100`. O lexer linear não aceita `'` hoje, então nenhum arquivo antigo tem esse caractere: a mudança só acrescenta.
- `9j` digitado grava `9*j`.
- Arquivos antigos: mesmos bytes e mesmo resultado. Nenhum golden, fixture ou biblioteca tem nome de unidade solto nem `2 L` com L variável (levantado pelo explorador). O `2 x` legado (x não é unidade) continua 2·x.
- Ressalva aceita: um `.prsf` convertido de `.sm` antes do F04 com unidade solta (ex.: A/100) passa a mostrar "não definida". Reconverter o `.sm` resolve.

## Causa raiz
1. **math.js:** `SymbolNode._compile` (mathjs 15.2, `lib/esm/expression/node/SymbolNode.js:71`) devolve `new Unit(null, name)` para qualquer símbolo que não está no escopo e é unidade. O motor entrega a linha ao math.js como texto (`toMath` em `src/engine/syntax.ts:31`), e `25 m` e `10*L` chegam iguais: um SymbolNode. Não há como saber qual nome é unidade.
2. **`known()`** (`src/engine/evaluate.ts:182`) aceita `isUnitName(n)`, então `missingOf` não acusa L/S/b como faltando, e a avaliação simbólica (E3.3) não entra.
3. **Conversor LaTeX para linear** (`src/format/mathlinear.ts:547-556`, `atom()` + `unitFrom()`/`unitBody(true)`): número seguido de qualquer letra (ou grega, ou `\mathrm`) vira `qty`, porque `unitBody` aceita qualquer sequência de letras como nome de unidade. `9j` vira `9 j` e `2x` vira `2 x`. Na tela (`nodeLatex` caso `qty`, `mathlinear.ts:288-295`) aparece "9 j" com espaço fino, sem ·.
4. **`\class{u}` solto** (`mathlinear.ts:569`, unidade digitada com `'` sem número antes) vira `id` e perde a marca de unidade. O importador do SMath faz o mesmo: `src/format/smath.ts:55` cria `id` com `unit: true`, e esse `id` só vira `qty` quando multiplica um número.
5. O `=` inteligente (`src/math/MathField.tsx:127`) **não** usa unidade: `L=` com L indefinido já vira definição. Nada a mudar ali. O `n in math` é o B8, que é outro ticket.

## Solução (motor): marcar a variável que colide com unidade
Não há patch global no math.js. Em `toMath`, o nome em **posição de variável** que for unidade do math.js ganha o sufixo `ǃ` (U+01C3). É o mesmo truque que o código já usa com `ǀ` e `ǂ` em `ODD_NAME`. O nome em **posição de unidade** fica como está, e o math.js segue resolvendo como unidade, igual a hoje.

`src/engine/syntax.ts`:
- `export const VAR_MARK = 'ǃ'`. Cache `Map<string, boolean>` de `math.Unit.isValuelessUnit` (com try/catch), para não pesar a cada tecla.
- `toMath(s, units = false)`: quando `units` é false, aplica `markVars` **por último** (depois de REPLACE, ODD_NAME e π). `markVars` faz uma varredura linear dos tokens: string `"..."`, número, nome `[\p{L}_][\p{L}\p{N}_ǀǂ]*`, espaço ou outro caractere. A flag `chain` diz se o próximo nome é unidade:
  - `'` seguido de nome: descarta o `'` e liga `chain`.
  - número + espaço + (`/` opcional) + nome que não é seguido de `(`: liga `chain`. Isso cobre `25 m` e o `0.00393 /degC` que o REPLACE já produziu.
  - nome com `chain` ligada: copia sem marca. Depois olha à frente: pula `^`, `-` opcional e dígitos. Se vier `*` ou `/` seguido de nome, a `chain` continua; senão desliga. Assim `Ω*mm^2/m` e `h/dia` ficam inteiros.
  - nome sem `chain`: acrescenta `VAR_MARK` se `isUnit(nome) && !(nome in math)`. Funções e constantes do math.js (`min`, `pi`, `to`) ficam como estão, que é o B8.
  - Laço com avanço garantido: um token por volta.
- `fromMath`: remove `ǃ`.
- `classify`: o `target` passa a ser `toMath(t, true)` (linhas 74 e 78).

`src/engine/evaluate.ts`:
- Constante de biblioteca: `scope.set(toMath(name), …)` (linha 168). O `defined.add(name)` fica com o nome cru.
- `missing: miss.map(fromMath)` (linhas 228 e 243). `message()` aplica `fromMath` ao nome em "Undefined symbol/function".
- `plot`: `local.set(toMath(xVar), …)`. `xUnit`/`yUnit` usam `toMath(x, true)`.
- `known()` continua igual: na árvore só resta nome de unidade sem marca em posição de unidade. Atualizar o comentário.

`src/math/MathLine.tsx:20, 191, 193` e `tests/helpers/smath-corpus.ts:45, 74`: passam a chamar `toMath(x, true)`. São texto de unidade e só se adapta a chamada à API nova; o teste não fica mais fraco.

## Solução (conversor e importador)
`src/format/mathlinear.ts`:
- Nó novo `{ t: 'unit'; u: Unit }` (unidade solta). Linear: `'${unitToLinear(u)}`. LaTeX: `unitLatex(u)`. Precedência: átomo.
- Lexer: `'` entra na classe de operadores do `TOKEN`. `atom0`: `'` vira `{ t: 'unit', u: this.unit() }`.
- `latexToLine` `atom()`: depois de um número, só é unidade `\class{u}…`, `\unit`, `%` e `\degree`. Letra, grega e `\mathrm` não são mais unidade: o número fica sozinho e a justaposição do `mul()` já produz `bin '*'`, então `9j` vira `9*j` e `2R1` continua `2*R1`. `\class{undef}` e `\class{imag}` também não contam como unidade.
- `\class{u}` solto (linha 569): devolve `{ t: 'unit', u }` em vez de `id`, aceitando expoente e unidade composta.
- Exportar `mulUnit(a, op, b)`: (num ou qty) `*`/`/` unit dá qty. É a mesma regra de `smath.ts:67-75`, que passa a usar esta função. Aplicar no `mul()` do LaTeX, para que `5\class{u}{kV}\cdot\class{u}{A}` grave `5 kV*A`.
- `nodeLatex` caso `qty` com `ctx.isUnit`: se o nome único **é** unidade, sempre `unitLatex` (sai o `asVar` para unidade, opção A). Se **não é** unidade (o `2 x` legado), desenha `L(n)\cdot L(id)`. Sem `ctx.isUnit`, continua como hoje, e o B10-10 de ida e volta não muda.
- `grep "case 'qty'"` em `src/`: em todo switch sobre `Node.t`, acrescentar `case 'unit'`. A unidade não é nome livre nem definido (doc.ts, Folha `definedBefore`, `scopeOf` do smath e exportação para `.sm`, se houver). O tsc acusa os switches exaustivos.

`src/format/smath.ts:55`: operando `style="unit"` vira `{ t: 'unit', u: parseUnit(unitName(e.v)) }`. `asUnit` passa a ler `n.t === 'unit'`.

`src/math/MathField.tsx` (só se o teste de navegador mostrar que é preciso): `4'mm^2` tem que gravar `4 mm^2` e `5'kV*'A` tem que gravar `5 kV*A`. Hoje o `classify()` das teclas de operador regrava a forma canônica e põe o cursor no fim, fora do `\class`. Se o `^` ou o `*` caírem dentro do `\class{u}`, tratar como o índice: `state.script = 'unit'` no `'`, e tecla de operador ou espaço faz `moveAfterParent` antes.

## O que entra agora e o que depende do ADENDO 06
- **Agora:** motor, formato, conversor, importador, `'` como forma de digitar unidade, e o marcador de conversão do resultado que já existe (ADENDO 02 B5, `= ? mV`). A cor de unidade (`--math-unit`, classe `u`) já existe.
- **Depois:** o marcador ▫ como parte da estrutura da região (A6-1) e o assistente (A6-4). O assistente vai inserir `\class{u}{…}`, o mesmo caminho do `'`, então não muda o formato de novo. A última regra do ADENDO 06 3.5 ("nome definido vence unidade" quando o usuário não aceita a sugestão) fica superada pela decisão de 10/11: sem aceitar, é variável. Anotar em `docs/adendo-05.md`.
- **SMath:** nenhum experimento necessário. A regra foi decidida pelo usuário, e `'` para unidade é a convenção do próprio SMath (E7.1).

## Ordem de execução (CLAUDE.md)
0. `npm ci` no worktree (não há `node_modules`). Antes de cada verify, `netstat -ano | findstr :1420` tem que vir vazio.
1. `tests/MATRIZ.md`: linhas BUG-014, F04-01 a F04-04, e a nota do F3-05 corrigida.
   - **BUG-014:** nome solto que é unidade do math.js não vira unidade (`s := 10*L` dá `10·L` em aberto; caderno: "Variável não definida: L").
   - **F04-01:** `9j` grava `9*j` e a tela mostra 9·j.
   - **F04-02:** unidade solta `x*'m` faz ida e volta; `4'mm^2` grava `4 mm^2`.
   - **F04-03:** unidade solta do `.sm` importa como `'ohm`.
   - **F04-04:** arquivos antigos com o mesmo texto e resultado (B10-10, golden, corpus E8-21/22 sem cair).
2. **Testes que falham primeiro:**
   - `src/engine/engine.test.ts`, `[BUG-014]` (siga o padrão de chamada de `evaluate` do arquivo).
     - Folha (symbolic): `s := 10*L`, `s = ?` dá `symbolic` `10*L` e `missing ['L']`. `t := 3*m` e `a := b` ficam em aberto. `a := b + 1` não dá mensagem em inglês.
     - Caderno (sem symbolic): `x := 2*L` dá "Variável não definida: L".
     - Continua funcionando: `L := 25 m`, `ρ := 0.0179 Ω*mm^2/m`, `0.00393 1/°C`, `5.4 h/dia`, `= ? mV`, `k := 2*'m` (2 m), `2 x` com `x := 3` (6).
     - Nomes com colisão: `f(s) := s*2` com `f(3) = ?` dá 6. Constante de biblioteca chamada `g`.
     - Nenhum `ǃ` em `error`, `missing` ou `symbolic`.
   - `src/format/mathlinear.test.ts`, `[F04-01]` e `[F04-02]`:
     - `toLinear('9j')` dá `9*j`. `toLinear('S\\coloneq4mm^{2}')` dá `S := 4*mm^2`. `4\class{u}{\mathrm{mm}}^{2}` dá `4 mm^2`.
     - `x\cdot\class{u}{\mathrm{m}}` dá `x*'m`. `5\class{u}{\mathrm{kV}}\cdot\class{u}{\mathrm{A}}` dá `5 kV*A`.
     - Ida e volta de `x*'m`, `'A/100` e `'Ω*mm^2/m`.
     - Com ctx `isUnit`: `2 x` com x definido desenha `2\cdot x`; `2 L` desenha unidade.
   - Teste do importador SMath (achar com o explorador), `[F04-03]`: operando unidade solta grava `'…`.
   - `tests/golden/teclado.yaml`: casos novos `z:9j` (`z := 9*j`) e `S:4mm^2` (`S := 4*mm^2`).
   - `tests/regressao/bugs.spec.ts`, `[BUG-014]` e2e na folha: `s:10*L` Enter, `s=` mostra resultado em aberto com a dica "L ainda não foi definido", sem `.u` no resultado. `z:9j` grava `z := 9*j` no arquivo.
3. **Testes existentes (autorizados pelo usuário em 11/11).** Muda **só a entrada**: põe `'`. O esperado fica igual. A única exceção é o F3-05.
   - Sequência digitada passa a usar `'`, com o esperado igual: `tests/golden/teclado.yaml:10,17,33,71`; `tests/e2e/edicao-visual.spec.ts:15,29,51,75`; `desempenho.spec.ts:12`; `smath.spec.ts:65` (`S.trafo:5'kV*'A`); `tests/regressao/bugs.spec.ts:23` (`1234'm`).
   - `tests/golden/conversao.yaml:34,36,38,39`: a entrada `digitado` passa a ter `\class{u}{\mathrm{…}}`, com o esperado igual.
   - `tests/e2e/folha.spec.ts:39` (F3-05): em vez de 2 `.mline-error`, espera 2 `.mresult-symbolic` em `#resultado` com a dica "S ainda não foi definido".
   - **Qualquer outro teste antigo que falhar:** parar e perguntar. Não ajustar sozinho.
4. Implementar na ordem: syntax.ts, depois evaluate.ts, depois mathlinear.ts, depois smath.ts, depois MathLine e helper, e MathField só se o teste exigir.
5. `testador` com `npm run verify:rapido`. Conferir que o corpus E8-21/22 continua com o mesmo número de acertos.
6. `revisor` no diff (o ticket é [R]).
7. `docs/adendo-05.md`: uma ou duas linhas (regra, formato `'`, ADENDO 06 3.5 superado, ressalva dos `.prsf` antigos). Em `docs/TICKETS-FOLHA.md`:
   - Marcar o F04 como feito.
   - **Lote F3, linha nova** depois do F13: `| F-U1 | Unidades do usuário em biblioteca (ex.: kWp como apelido de kW). **Pendente:** o usuário confirmar no SMath como ele define unidade nova | Opus |`. **Não implementar agora.** O F04 não cria unidade nova; continuam só as do `src/engine/math.ts`.
   - **A6-4, acrescentar na coluna de observação:** "No SMath (usuário, 11/11): digitar `v` abre o assistente com a variável v (se existir) antes da unidade volt; Tab ou Enter aceita. A unidade também entra pelo campo de unidade (▫) do resultado. Quando o assistente existir, os testes de unidade ganham uma versão digitando com o assistente, além da versão com `'`." Acrescentar também: "Conferir com o ADENDO 06 3.5, que diz que Enter não aceita." O texto do usuário vem depois do adendo; a decisão fica para o A6-4.
8. Commit local `F04: nome na expressão é sempre variável; unidade só explícita` com o rodapé Co-Authored-By. Sem push. Não tocar nos `.sm`.

## Verificação
- `verify:rapido` verde, com os testes novos e os antigos (B10-10, golden de conversão e de cálculo, corpus SMath, e2e da folha).
- Manual no app, opcional: folha nova, `s:10*L` e `s=` mostram 10·L em aberto. `z:9j` mostra 9·j. `L:25'm` mostra 25 m em azul. Abrir `string-3.prsf` dá 3,29 V e 0,82 %, como antes.
