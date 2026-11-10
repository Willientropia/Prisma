# Auditoria independente (Fable), 10/11/2026

Revisão só de leitura do `main` em `8cc4843`, feita no worktree `claude/fable-audit-8911be`. Nenhum arquivo do código foi alterado; só este relatório foi criado. Os scripts dos experimentos ficaram em `test-results/audit/` (pasta ignorada pelo git), para quem quiser repetir.

## 0. O que foi rodado

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | passa |
| `npx eslint .` | passa |
| `npx vitest run --project unit` | 212 de 213 passam; falha só o C9-08 (gancho do Git): num worktree `.git` é um arquivo e `.git/hooks/pre-commit` não existe. Mesmo achado da auditoria anterior; M7 da MANUTENÇÃO 01 resolve |
| Vitest no navegador, Playwright (e2e, regressão, visual), `cargo test`, app real | **não rodados** |
| Experimentos próprios, cada caso num processo com prazo de 12 s | BUG-008; casos de borda dos dois parsers; ida e volta de todas as 713 linhas de cálculo importadas dos 17 `.sm`; semântica do motor (simbólico, ciclos, nomes reservados, limites); formatação; XML quebrado; tempo de importar e recalcular cada `.sm` |

## 1. Conformidade: testes fracos

Critérios marcados `ok` cujo teste não prova o que o critério diz:

| ID | Problema |
|---|---|
| E8-21, E8-22 | O corpus guarda **197** resultados (`<result action="numeric">`); o teste compara **85** (`test-results/smath-corpus.md`). Os três `AED_*`, `AED_Harm_nicas`, `Test_ExcelOUT*` e `Motor.sm` têm **0 comparados**: tudo é "não comparável" porque depende de função de plugin ou de nome que não está no arquivo, e a contaminação se propaga para todas as regiões abaixo. E8-21 passa para `Motor.sm` com zero comparações; E8-22 "100 % batem" vale sobre 3 resultados de `Teste_Pot_ncia_Com_Harm_nica` e nenhum dos AED. Os 57 não comparáveis e os 55 em regiões desativadas no SMath ficam fora. A matriz deveria dizer "85 de 197" |
| E8-21/22 (método) | Os dois lados são formatados pelo formatador do Prisma a partir do valor numérico; não se compara o **texto** que o SMath exibiu |
| A9-01, A9-03, C9-01, D6-06 | Manuais; as tabelas de `tests/MANUAL.md` estão vazias, nunca foram executados. `C9-01` (verify numa cópia limpa) nunca foi feito, e o C9-08 mostra que numa cópia limpa o verify falha |
| C9-08 | Depende do `.git/hooks` da máquina |
| F3-05 (e2e) | Confere só "2 erros" depois de mover `s`; os erros existem porque `S` vira a unidade siemens, não por "variável não definida". Passa pelo motivo errado (ver B9) |
| B10-10 | A tabela B9 e os exemplos não têm nome com dígito (`R1`, `I1`), texto com espaço nem `for`; justamente onde a ida e volta quebra (B2 a B4) |
| E8-20 "sem travar" | Sem prazo explícito; vale só o timeout padrão de 5 s do Vitest |
| E8-08 | O ADENDO 06 (2.5) já diz que o comportamento está errado |
| B10-09 | Só `cabos-cc` e `string-3`, sem o texto livre |
| A9-07 "mover a pasta" | Só no disco em memória do mock |
| V-09 | Pares escolhidos à mão; 3 exceções abaixo de 4,5:1 esperando decisão desde o ADENDO 03 |

## 2. Bugs

### 2.1 Travam ou corrompem dados (corrigir antes de tudo)

**B1. BUG-008 confirmado, e mais amplo.** `latexToLine` entra em laço infinito com memória crescente para **qualquer** `.` que não seja seguido de dígito, não só depois de nome com várias letras. Reproduzido com prazo de 12 s (todos estouraram): `batata.`, `a.b`, `s_{batata}.`, `2.`, `x.`, `Relação.`, `\rho .`, `ab.c`, `.`, `..`, `a..b`. Causa em `src/format/mathlinear.ts`: `atom()` (linha 523) entra no ramo de número com `.` solto, não consome nada e devolve `{t:'num', v:''}`; `mul()` (linha 433) vê o mesmo token como início de átomo e chama `unary()` de novo. Roda na thread principal (`handleKey` → `classify()` e `onInput` → `toRaw`). O `case '.'` de `MathField.tsx` (linha 135) só aceita nome de **uma letra ASCII**: `Relação.`, `batata.` e `x1.` caem no bug. A correção da MANUTENÇÃO 02 R1 está certa; acrescentar `2.`, `x.`, `.`, `Relação.` ao teste BUG-008. O `LinearParser` não tem o problema.

**B2. Nome com dígito vira produto ao editar: corrupção silenciosa do arquivo.** `R1 := 5` → tela `R1 ≔ 5` → ao confirmar, `latexToLine` lê `R` e depois `1` como justaposição → grava `R*1 := 5`. Reproduzido: `R1`→`R*1`, `I1 := 2 A`→`I*1 := 2 A`, `x1 + x2`→`x*1 + x*2`, `ρ1`→`ρ*1`, `xy2pol(z)`→`xy*2*pol(z)`, `sys2mat(v)`→`sys*2*mat(v)`, `log10(x)`→`log*10*(x)`. Causa: `name()` (linha 446) só aceita letras; dígito só dentro de `_{...}`. **No corpus do usuário, 63 das 713 linhas importadas mudam de significado na ida e volta** (todas as `sys2mat`, `xy2pol`, `I1`, `V1`…). Dispara em qualquer edição da linha (Enter, Esc, perda de foco com edição, espaço ou operador que chama `classify()`); linha não tocada não é regravada (B10.11). As funções `xy2pol` e `sys2mat` do próprio ADENDO 05 não sobrevivem a uma edição. Teste a acrescentar em `conversao.yaml`: `R1 := 5`, `I1 + I2`, `xy2pol(z)`.

**B3. Texto entre aspas perde os espaços.** `llex` descarta espaço em branco, e `plain()` os perde: `mat("3º Harmônica", ...)` volta como `mat("3ºHarmônica", ...)`. 10 linhas do corpus (`Legenda := mat(N, "Nº de harmônicas sem a fundamental", ...)`). Mesma classe que B2: corrupção na primeira edição.

**B4. Linhas que não podem ser editadas visualmente** (caem no `\text{...}` e qualquer edição é recusada): `for(i, range(1, 8), v[i] := ...)` (54 linhas do corpus; o `LinearParser` não aceita `:=` dentro de argumento), nomes com `%` (`Z%_modulo`, 24 linhas; `\%` não é lido como parte de nome), `#` solto do SMath (1 linha), `U1_1ϕ := 100 kV` (letra grega depois do índice). O ADENDO 05 (item 5 e E8-31) dá `for` e `Z%` como feitos; funcionam no motor, não na tela.

**B5. `holdKeys` sem prazo prende o teclado do app inteiro** (`src/math/MathField.tsx`, linhas 162 a 185). O ouvinte global `keydown` em captura com `preventDefault` + `stopPropagation` só é removido quando o próximo campo ganha foco. Ninguém solta quando:
- `Caderno.newLineAfter`/`deleteEmpty`/`addLine` chamam `holdKeys()` **antes** de `edit()`; num documento somente leitura (`versao_formato: 2`) o `edit` recusa, a linha nova não existe e nenhum campo monta: todas as teclas, inclusive Ctrl+S, ficam presas até clicar num campo e dar Enter de novo;
- `tryFocus` devolve sem `releaseKeys()` quando o campo foi desmontado (`!mf.isConnected`, linha 251);
- `tryFocus` depende de `requestAnimationFrame`: com a janela em segundo plano as teclas ficam presas até ela voltar.
Bate com o "não dá para apagar" da MANUTENÇÃO 02 R3.3. (Por leitura; precisa do teste de interface de R3.3.)

**B6. `creating.current` fica preso na folha** (`src/editors/folha/Folha.tsx`, linhas 313 a 327): se a região nova não monta (folha somente leitura, ou `MathLine` que nunca chama `onReady`), toda tecla seguinte na folha é engolida em `pendingKeys` e nenhuma região mais é criada.

**B7. Laços sem limite no worker.** Reproduzidos (processo morto por prazo): `range(1, 1/0)`, `range(1, 10^8)` (15 s), `for(i, range(1, 10^7), q[i] := i)` (20 s), `integral(f, 0, 1)` com `f(x) := sin(10^6·x)` ou `f(x) := random()` (15 s; `math.ts` linha 74: profundidade 40 sem limite de avaliações = até 2⁴⁰ chamadas). No app o cão de guarda de 2 s mata o worker, **mas** `range` aloca sem limite e um estouro de memória do worker derruba o renderer inteiro antes dos 2 s ("Out of Memory", o mesmo sintoma do BUG-008). Pôr limite de elementos em `range`/`for` e de avaliações em `integral`.

### 2.2 Semântica do motor (folha, ADENDO 05)

**B8. Nomes do math.js escondem variáveis do usuário.** `known()` em `evaluate.ts` (linha 182) e o `=` inteligente em `MathField.tsx` (linha 123) usam `n in math`. A instância tem as constantes `E`, `PI`, `phi`, `tau`, `LN2`, `SQRT2`, `NaN`, `null`, `true`, `false`, `version` e funções curtas (`re`, `im`, `to`, `on`, `off`, `or`, `and`, `not`, `arg`, `row`, `col`, `std`, `num`, `den`, `fix`…). Reproduzido na folha: `E = ?` → 2,72; `tau = ?` → 6,28; `phi = ?` → 1,62; `version = ?` → "15,2,0". Consequências: digitar `E=5` vira **avaliação** `E = 2,72` em vez de `E ≔ 5`; `re=5` mostra "função"; `s := 10*E` com E indefinido não fica em aberto. `E`, `tau` e `phi` são nomes correntes em engenharia. A lista de reservados deve ser explícita (π, 𝐢, 𝐞 e as funções do catálogo).

**B9. Unidade esconde variável indefinida no modo simbólico.** `known()` aceita qualquer unidade do math.js. Reproduzido: `s := 10*L` com L indefinido → `10,00 L` (litros); `t := 3*m` → `3,00 m`; `a := b` → `1,00 b` (bit!) e `a := b + 1` → erro em inglês "Unexpected type of argument in function addScalar (expected: Unit, actual: number)". O ADENDO 02 B4 manda classificar unidade **na tela**; no motor da folha (E3.3) o nome indefinido deveria ficar simbólico, como no SMath, onde unidade só existe com `'`. É também o motivo pelo qual F3-05 passa.

**B10. Funções do usuário não enxergam definições "em aberto" e caem na unidade.** `s := 10*x` (x indefinido), `x := 2`, `f(a) := a + s`, `f(1) = ?` → erro "Unexpected type of argument in function addScalar (…actual: Unit | identifier)", porque `s` dentro da função resolve para a unidade segundo; `s = ?` logo abaixo dá 20. `open` não é consultado no corpo da função (`evaluate.ts`, linha 235, ramo `func` sem `expand`). O SMath daria 21 (E3.4).

**B11. Definição circular.** `x := x + 1` (x indefinido) e depois `x = ?` → erro "Maximum call stack size exceeded" na linha (`expand()`, linha 185, recorre sem limite). Fica na região (o `catch` por linha segura), mas a mensagem é em inglês e o custo é uma pilha inteira a cada recálculo. `a := b`, `b := a` nem chega lá por causa de B9.

**B12. Resultado simbólico com complexo não renderiza.** `z := 3 + 2*i`, `s := z*x`, `s = ?` → `symbolic: "3 + 2i*x"` (toString do math.js); `symbolicLatex` tenta `parseLinear` disso, falha em `2i` e cai no `\text{}`.

**B13. Mensagens em inglês e índices 0-based vazam do math.js:** `M[3, 1]` → "Index out of range (2 > 1)"; `v[1.5]` → "Index must be an integer (value: 0.5)" (mostra 0,5 para quem digitou 1,5); `x(3)` com x número → "'x' is not a function; its value is: 2"; `x := "abc"`, `x + 1` → "Cannot convert "abc" to a number"; `1/0` mostra `Infinity`, `0/0` mostra `NaN`, `10^400` mostra `Infinity` (texto cru). `message()` em `evaluate.ts` só traduz quatro padrões.

**B14. `fmtSmath` devolve "NaN"** (`src/engine/format.ts`, linha 203) para |x| < 10⁻⁶ quando `limite_exponencial` ≥ 7: `fmtNum(1e-8, {casas: 4, modo: 'decimais', limite_exponencial: 10})` → `"NaN"` (reproduzido). Causa: `${Number(av.toPrecision(12))}` vira `"1e-8"` e `"1e-8e4"` não é número. Com `significativos`, `99999.5` com 4 algarismos e limite 5 sai `100000` em vez de `1·10⁵` (o arredondamento muda o expoente depois do teste). Os 17 `.sm` do usuário usam limite 3 ou 5, então hoje não aparece.

**B15. `withAttr` corrompido no commit** (`src/format/doc.ts`, linha 110): o texto de substituição do escape de regex é literalmente `'\\export const blocks = (doc: PrismaDoc) =>'` em vez de `'\\$&'` (conferido nos bytes de `HEAD`). Não dói porque os nomes de atributo são só letras (`withAttr(..., 'a.b', null)` não remove, reproduzido). Sinal de edição acidental; corrigir e cobrir.

**B16. Casos de borda da sintaxe linear:** `"a = ?" = ?` é partido dentro da string (`classify`); `x := "a := b"` tem o `:=` de dentro da string trocado por `=` (`inner()`); `"x" := 1` conta como definição de `"x"` (`definedNames`); `M := [[1, 2], [3, 4]]` (forma aceita pelo motor e usada nos golden) não é lida por `mathlinear`; `a^(b)` volta como `a^b` e `1 Ω*mm^2/m*A/mm^2` volta com os termos reordenados (mesmo valor, texto do arquivo muda ao editar); `\sin x` colado vira `sin()` (argumento perdido); `{v}_{\lbrack \rbrack}` vira `el(v)`; `\mathrm{}` vira nome vazio.

**B17. Parsers sem limite de profundidade e com erros do tipo errado.** `parseLinear` com 2 000 parênteses aninhados lança `RangeError`; `latexToLine` de `a\` ou `\` lança `TypeError` (`llex`, linha 339, `exec` devolve `null`); `\sin` sozinho lança `TypeError` (`callArgs` sem token seguinte). Tudo cai em `catch` genérico hoje, mas viola R2.1/R2.2. Fora isso, o `LinearParser` se comportou bem: 110 entradas malformadas (`)`, `a[1`, `1 m^`, `"abc`, `f(,)`, `a**b`, `(((`, `1..2`…) terminaram em menos de 3 ms, todas com `MathSyntaxError`; só `--a` e `sqrt()` passam sem reclamar.

**B18. Prazo do worker antes da primeira linha** (`client.ts`/`run.ts`): se o tempo é gasto nas constantes ou funções de biblioteca (sem `onLine`), o timeout chega com `key: ''`, o documento fica sem resultado e sem mensagem. E quando `stop()` interrompe uma avaliação para começar outra, a primeira ainda escreve `calculating: false` (`run.ts`, linha 407), apagando o indicador da segunda.

**B19. Bugs já previstos no ADENDO 06 (1.1):** `=` duplicado e `14,00`, confirmados na leitura de `MathLine.onCommit` e `DEFAULT_FORMAT`.

## 3. Segurança e robustez

- **Caminhos:** o Rust (`files.rs::checked`) exige caminho absoluto e extensão da lista, mas não trata `..`; `joinPath` resolve `..` no front. Um `.prsp` malicioso só consegue listar, abrir ou renomear arquivos com extensões Prisma/LaTeX, e só por ação do usuário. `dir_list` e `file_stat` aceitam qualquer caminho (só metadados). `file_write_base64` sanitiza o nome e o Rust limita a extensões de imagem. Risco baixo.
- **Gravação atômica:** `write_atomic` grava `<arquivo>.prisma-tmp` e renomeia (correto no NTFS). Travamento no meio deixa o `.prisma-tmp` órfão, sem limpeza. O arquivo novo não herda atributos nem ACL do original.
- **Arquivo corrompido:** `parse()` nunca lança (YAML inválido vira `metaError`); cerca sem fechamento vai até o fim. `.sm`: vazio, lixo, truncado pela metade, `</x>` sobrando, `<region>` vazia, `args="99999999"`, `args="-5"`, área sem terminador e `ppi="0"` foram testados: nenhum trava; todos viram "não suportado" ou erro claro. XML com 1 000 000 níveis de aninhamento: 1,3 s, sem recursão (o parser é iterativo).
- **Codificações:** BOM e CRLF cobertos. Latin-1 ou UTF-16 falha em `read_to_string` com mensagem em inglês. `\r` solto (Mac antigo) não é tratado em `lines()`/`strip()`.
- **Ouvintes globais:** `holdKeys` (B5); `pointermove`/`pointerup` da folha são removidos no `up`; `ContextMenu` e `App` limpam. `useEffect` sem dependências em `Caderno` (linha 191) e `Folha` (linha 197) re-registram comandos a cada render.
- **Thread principal:** `latexToLine`/`lineToLatex` a cada tecla; `recalc` relê **todas** as bibliotecas do disco a cada recálculo (`readLibraryFiles` em `run.ts`) e o `Caderno` as lê de novo a cada mudança de texto (`useEffect`, linha 115); `SourceView` substitui o documento inteiro a cada tecla, disparando recálculo completo.
- **`dangerouslySetInnerHTML`** com `convertLatexToMarkup` a partir do arquivo: CSP sem `unsafe-inline` para script; risco baixo.

## 4. Desempenho (Node, i.e. sem o custo do React e do MathLive)

| Arquivo | Regiões | Importar | Preparar | Avaliar (3 vezes) | Parte "tela" (parse + ordem + toLatex de cada linha) |
|---|---|---|---|---|---|
| `AED_Completa_Qualidade.sm` | 318 | 49 ms | 6 ms | 198, 114, 92 ms | 19 ms |
| `AED_Completa_Qualidade_Relat_rio_at__a_50h.sm` | 243 | 21 ms | 4 ms | 59, 58, 59 ms | 14 ms |
| `Teste_Pot_ncia_Com_Harm_nica.sm` | 141 | 12 ms | 1 ms | 51, 53, 49 ms | 8 ms |
| `Prova_de_Qualidade_2.sm` | 83 | 6 ms | 2 ms | 25, 15, 16 ms | 5 ms |
| `08do10.sm` | 29 | 8 ms | 17 ms | 33, 5, 5 ms | 14 ms |
| demais 12 arquivos | ≤ 30 | ≤ 5 ms | ≤ 2 ms | ≤ 35 ms | ≤ 3 ms |

- Abrir: importação + parse fica abaixo de 100 ms em todos. Sem risco.
- Recalcular: como não há recálculo incremental (E3.5), cada tecla numa `AED_*` custa ~100 ms de motor mais a re-renderização de 318 `math-field` (não medida; precisa do navegador). O orçamento de 150 ms (C7-01) é medido só na `string-3`; para as `AED_*` provavelmente estoura, e o incremental de E3.5 continua pendente. Além disso o `before` da `Folha` refaz `definedBefore` sobre todas as regiões a cada mudança de `result`.

## 5. Prioridade

Corrigir antes do ADENDO 06 (entram na MANUTENÇÃO 02):
1. **B1** (BUG-008 com os casos extras), **B2** e **B3** (nome com dígito e texto com espaço: corrompem o arquivo do usuário na primeira edição; 73 linhas do corpus), **B4** (`for`, `%`: linhas não editáveis que o ADENDO 05 dá como prontas).
2. **B5**, **B6** (teclado preso), **B7** (`range`/`for`/`integral` sem limite), **B17** (limite de passos e profundidade, erros do tipo certo), **B18**.
3. **B8** e **B9**: `n in math` e `isUnitName` em `known()` e no `=` inteligente. Mudam o que aparece na tela; precisam de decisão do usuário sobre quais nomes são reservados e sobre unidade sem `'` no motor da folha.
4. **B15** (`withAttr`) e **B14** (`NaN`): pequenos.
5. Corrigir a matriz: E8-21/22 dizem "100 %" sobre 85 de 197 resultados; registrar os 112 fora e o motivo.

Pode esperar: B10, B11, B12, B13, B16, mensagens em inglês do Rust, `.prisma-tmp` órfão, testes fracos manuais da seção 1 (resolver junto com M7 e com a reescrita do E8-08 no ADENDO 06).

## 6. Não feito

- Testes de navegador, Playwright (e2e, regressão, visual), `cargo test` e app real: não rodados nesta auditoria (o relatório do agente anterior diz que passam; não conferi).
- B5 e B6 estão por leitura; o teste de interface de R3.3 confirma.
- Markdown gerado pelo TipTap (se reescreve parágrafos não editados do mesmo segmento): não conferido.
- Custo de re-render dos 318 `math-field` da `AED_Completa` no navegador: não medido.
