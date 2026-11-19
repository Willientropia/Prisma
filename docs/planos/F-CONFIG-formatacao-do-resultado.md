# F-CONFIG: menu de formatação do resultado (plano para execução em Sonnet)

## Contexto

Ticket F-CONFIG (`docs/TICKETS-FOLHA.md`, linha 34, lote F-A6, [R]). O pedido é um menu de formatação do resultado, com padrão do app para documentos novos e ajuste por documento e por resultado (botão direito).

Já existe e é **ampliado**, sem duplicar:
- `FormatOpts` e `DEFAULT_FORMAT` (`src/engine/format.ts:8-9`), com `fmtSmath` (`:54-79`) cobrindo casas/algarismos, zeros à direita e limite exponencial.
- O bloco `exibicao:` do cabeçalho, lido por `exibicao()` (`src/engine/prepare.ts:15-25`) e gravado pelo importador do `.sm` (`src/format/smath.ts:268`).
- `casas=`, `modo=` e `zeros_a_direita=` por região: `regionFormat()` (`prepare.ts:42-48`) e a mescla em `evaluate.ts:213`.
- A config, só de leitura: `config_read` (`src-tauri/src/appdata.rs:77-80`), o mock (`src/dev/tauri-mock.ts:84`) e `run.ts:57-63`, onde `casas_decimais`/`separador_decimal` viram a base.
- O formato chega ao worker como `EvalInput.format` (`run.ts:67`). Não há mudança no worker.
- Telas: `app.configuracoes` está registrado sem handler (`src/commands/app.ts:26`; linha "Configurações" na Home, `src/home/Home.tsx:46`). O menu da região na folha fica em `Folha.tsx:160-172`. Não existe tela de configuração.

### Decisões do usuário (12/11, nesta sessão)
1. **O padrão do app é gravado no documento novo**, e só quando é diferente do padrão do SMath. Documento sem `exibicao` usa sempre `DEFAULT_FORMAT`, em qualquer máquina. A config deixa de valer na hora de mostrar. Isso resolve a pendência do A6-1 (`casas_decimais: 2` antigo) para os arquivos existentes.
2. **Formato autorizado:** `notacao` dentro de `exibicao` e `notacao=` na região; na config, `modo_arredondamento`, `zeros_a_direita`, `notacao` e `limite_exponencial`. `casas_decimais` e `separador_decimal` ficam como estão.
3. **Sem modo graus.** `°` continua unidade (π/180), sin(30°) e fasores não mudam. Para ver em graus, usa-se `°` no campo de unidade (`arg(z) = ? deg`, já existe em `evaluate.ts:64-65`). Não entra no menu nem no arquivo.
4. **Sem separador agora.** Fica a vírgula, sem `separador` no arquivo nem no menu. Vai como pendência em `docs/TICKETS-FOLHA.md` ("resultados e expressões", se o usuário pedir).

### Formato aprovado (bytes)
```
cabeçalho, quando muda pelo menu (mesma linha de fluxo do importador):
exibicao: {casas: 4, modo: decimais, zeros_a_direita: false, limite_exponencial: 5, notacao: engenharia}
notacao: automatica | cientifica | engenharia ; ", notacao: …" só sai quando ≠ automatica
região: ```calc {#r3 x=40 y=80 casas=2 modo=decimais zeros_a_direita=sim notacao=cientifica}   (sem aspas)
config.yaml: casas_decimais: 4 (já existe) + modo_arredondamento: decimais, zeros_a_direita: false, notacao: automatica, limite_exponencial: 5
```
Sem as chaves: automática. O arquivo abre com os mesmos bytes e o mesmo resultado.

### Regras de notação (decididas aqui; aparecem na aprovação do plano)
- **automatica:** o comportamento atual (exponencial quando o expoente ≥ limite ou ≤ −limite).
- **cientifica:** sempre mantissa·10ⁿ com 1 ≤ |m| < 10, inclusive 10⁰ (1,5 → 1,5·10⁰). Zero → 0.
- **engenharia:** sempre com expoente múltiplo de 3 e 1 ≤ |m| < 1000 (12345,678 → 12,3457·10³).
- O limite exponencial só vale em automática (o campo fica desabilitado nas outras).

## Ambiente (antes de tudo)
- A worktree **não tem `node_modules`**: rodar `npm ci`.
- Antes de cada Playwright, conferir se a porta 1420 está livre (outra worktree pode estar com o Vite). Verify uma sessão por vez.
- Se o `verify` avisar que há menos de 5 GB livres: parar e avisar o usuário.

## Passo 1: MATRIZ (`tests/MATRIZ.md`)
Linha em **Etapas**: `| Folha livre: menu de formatação do resultado (TICKETS-FOLHA) | FCFG | em andamento |` (vira `concluída` no fim). Critérios, no fim da tabela:

| ID | Critério | Teste | Tipo |
|---|---|---|---|
| FCFG-01 | Notação científica: 1234,5678 → `1,2346e3`; 1,5 → `1,5e0`; 0 → `0`; −0,00123 → `-1,23e-3` | src/engine/engine.test.ts | unit |
| FCFG-02 | Engenharia: 12345,678 → `12,3457e3`; 0,00123 → `1,23e-3`; 0,000012 → `12e-6`; 123456789 → `123,4568e6`; 999999,99 → `1e6` (arredondamento sobe de faixa); 4 significativos: 12345,678 → `12,35e3` | src/engine/engine.test.ts | unit |
| FCFG-03 | `notation: 'automatica'` dá o mesmo que hoje (valores do A6-05) | src/engine/engine.test.ts | unit |
| FCFG-04 | `exibicao()` lê `notacao` (valor inválido → automática); `regionFormat` lê `notacao=cientifica`; região sem `notacao=` herda a do documento | src/engine/prepare.test.ts (novo) | unit |
| FCFG-05 | `setExibicao`: troca só a linha `exibicao:` (resto do arquivo byte a byte igual); sem a linha, insere antes de `versao_formato:`; `exibicao:` em bloco de várias linhas vira uma linha; `notacao` só sai quando ≠ automática; ida e volta `exibicao(parse(setExibicao(t,f)).meta.exibicao)` = f | src/engine/prepare.test.ts | unit |
| FCFG-06 | `appFormat(config)`: config de fábrica → `DEFAULT_FORMAT`; `casas_decimais: 2` → 2 casas; chaves novas lidas; valor inválido ignorado. `stampFormat`: com o padrão, o modelo novo tem os mesmos bytes de hoje; com 2 casas, insere `exibicao: {casas: 2, modo: decimais, zeros_a_direita: false, limite_exponencial: 5}` antes de `criado:` | src/engine/prepare.test.ts | unit |
| FCFG-07 | `withAttr(…, quote=false)` grava `casas=2` sem aspas; o padrão continua com aspas (descricao, titulo) | src/format/doc.test.ts | unit |
| FCFG-08 | Golden: `exibicao: {…, notacao: engenharia}` com `12345.678 m` dá `12,3457e3 m`; `notacao: cientifica` com 2·7 dá `1,4e1` | tests/golden/calculos.yaml | unit |
| FCFG-09 | `evaluate` com bloco `fmt: {notation: 'cientifica'}` formata só aquele bloco | src/engine/engine.test.ts | unit |
| FCFG-10 | Folha: botão direito na área vazia → "Formato do documento..." → Notação Engenharia → OK: o resultado mostra 12,3457·10³ e o cabeçalho ganha `notacao: engenharia`; o corpo não muda | tests/e2e/folha.spec.ts | e2e |
| FCFG-11 | Home → Configurações → Casas 2 e zeros à direita → OK: a config simulada tem `casas_decimais: 2` e `zeros_a_direita: true`; uma folha nova nasce com `exibicao: {casas: 2, modo: decimais, zeros_a_direita: true, limite_exponencial: 5}`; uma folha já aberta sem `exibicao` continua com 4 casas | tests/e2e/folha.spec.ts | e2e |
| FCFG-12 | Botão direito num resultado → "Formato do resultado..." → Casas 2 → OK: a cerca dessa região ganha `casas=2 modo=decimais zeros_a_direita=nao notacao=automatica` (sem aspas) e só ela muda; "Usar o do documento" tira os quatro atributos | tests/e2e/folha.spec.ts | e2e |

## Passo 2: testes unitários que falham (FCFG-01 a 09)
Escrever primeiro e confirmar que falham pelo motivo certo.
- `engine.test.ts`: no `describe` de formatação (ao lado de `[A6-05]`, linha 91), `it('[FCFG-01] …')`, `[FCFG-02]`, `[FCFG-03]`, `[FCFG-09]`, usando `{ ...DEFAULT_FORMAT, notation: … }`.
- `src/engine/prepare.test.ts` (novo): FCFG-04, 05, 06.
- `src/format/doc.test.ts`: FCFG-07.
- `tests/golden/calculos.yaml`: casos `FCFG-08` (dois itens com o mesmo ID, no formato dos casos das linhas 62-72). Em `golden.test.ts`, acrescentar `notacao?: 'automatica'|'cientifica'|'engenharia'` ao tipo `exibicao` (linha 19) e `notation: x.notacao` ao objeto da linha 36. Não mudar os outros padrões dessa linha.

## Passo 3: motor e funções puras
1. **`src/engine/format.ts`**
   - Em `FormatOpts` (linha 8), somar `notation?: 'automatica' | 'cientifica' | 'engenharia'`. Não mexer em `DEFAULT_FORMAT` (ausente = automática). Atualizar o comentário das linhas 2-7.
   - Em `fmtSmath` (linhas 71-77), trocar o bloco exponencial por:
     ```ts
     const always = o.notation === 'cientifica' || o.notation === 'engenharia';
     const step = o.notation === 'engenharia' ? 3 : 1;
     if (a !== 0 && (always || exp10 >= th || exp10 <= -th)) {
       let e = Math.floor(exp10 / step) * step;
       let m = x / 10 ** e;
       if (Math.abs(Number(plain(m).replace(o.sep, '.'))) >= 10 ** step) { e += step; m = x / 10 ** e; }
       return `${plain(m)}e${e}`;
     }
     ```
     Em automática, `step = 1` reproduz o código de hoje. `numberLatex` (`MathLine.tsx:40-47`) já desenha `e0`/`e3` como ·10⁰/·10³; não mexer.
2. **`src/engine/prepare.ts`** (só funções puras):
   - `exibicao()`: somar `notation: NOTACOES.has(o.notacao) ? o.notacao : 'automatica'`, com `const NOTACOES = new Set(['automatica','cientifica','engenharia'])`.
   - `regionFormat()`: `if (NOTACOES.has(a.notacao)) f.notation = a.notacao`.
   - `export const exibicaoYaml = (f: FormatOpts) => \`exibicao: {casas: ${f.decimals}, modo: ${f.mode ?? 'decimais'}, zeros_a_direita: ${!!f.trailingZeros}, limite_exponencial: ${f.expThreshold ?? 5}${f.notation && f.notation !== 'automatica' ? \`, notacao: ${f.notation}\` : ''}}\``.
   - `export function setExibicao(text: string, f: FormatOpts): string`. Usa `parse(text).frontmatterRaw`, que inclui o BOM: separar com `lines()`, achar `^exibicao:` mais as linhas seguintes indentadas (`/^\s+\S/`) e trocar tudo por `exibicaoYaml(f) + '\n'`. Sem a linha, inserir antes de `^versao_formato:`; sem esse, antes do `---` final. Sem frontmatter, devolver o texto igual. Devolve o texto inteiro; o corpo vem de `text.slice(frontmatterRaw.length)`.
   - `export function appFormat(cfg: Record<string, unknown>): FormatOpts`: `DEFAULT_FORMAT` mais `casas_decimais` (inteiro de 0 a 15), `modo_arredondamento`, `zeros_a_direita` (boolean), `notacao` e `limite_exponencial` (inteiro de 1 a 15). Valor inválido fica no padrão. Não lê `separador_decimal` (decisão 4).
   - `export const sameFormat = (a, b) => ['decimals','mode','trailingZeros','expThreshold','notation'].every(k => (a[k] ?? DEFAULT_FORMAT[k] ?? 'automatica') === (b[k] ?? DEFAULT_FORMAT[k] ?? 'automatica'))`.
   - `export const stampFormat = (template: string, f: FormatOpts) => sameFormat(f, DEFAULT_FORMAT) ? template : template.replace(/^criado:/m, \`${exibicaoYaml(f)}\ncriado:\`)`.
3. **`src/engine/run.ts:57-63`**: tirar o `base` montado da config. Fica `const format = exibicao(parsed.meta.exibicao);` (decisão 1). `cfg` continua para `margem` (linha 66). Atualizar o comentário. `DEFAULT_FORMAT` deixa de ser importado aqui (knip).
4. **`src/format/doc.ts:106`** `withAttr`: somar o parâmetro `quote = true`. Com `false`, o pedaço é `${name}=${value}`. Não mexer no resto da função. Ver o follow-up da linha 110.
5. **`src/store/workspace.ts:224`** (`newDoc`): para `caderno` e `folha`, `text: stampFormat(TEMPLATES[type](name), appFormat(get().config))`. Procurar os outros usos de `TEMPLATES[` (ex.: `projectNewFile`) e aplicar o mesmo para caderno/folha.

Rodar os unitários: FCFG-01 a 09 verdes, e os antigos (A6-05, F2-16, golden) sem mudança de valor esperado.

## Passo 4: e2e que falham (FCFG-10 a 12), depois a interface
Escrever os três testes em `tests/e2e/folha.spec.ts`, no padrão dos testes vizinhos (helpers de `tests/e2e/helpers.ts`; o texto do arquivo vem de `window.prismaDev.read`). Confirmar que falham.

1. **Rust:** em `src-tauri/src/appdata.rs`, depois de `config_read`:
   ```rust
   #[tauri::command]
   pub fn config_write(app: AppHandle, content: String) -> Res<()> {
       let dir = config_dir(&app)?;
       fs::create_dir_all(&dir).map_err(err)?;
       write_atomic(&dir.join("config.yaml"), &content).map_err(err)
   }
   ```
   Registrar em `src-tauri/src/lib.rs:36` ao lado de `appdata::config_read`. Se o Tauri tiver capabilities/permissões por comando, conferir como `config_read` está liberado e fazer igual.
2. **`src/platform.ts`**: na interface (linha 30), `writeConfig(text: string): Promise<void>;`; na implementação (linha 60), `writeConfig: (content) => invoke('config_write', { content })`.
3. **`src/dev/tauri-mock.ts:84`**: `let configText = '…'` (o mesmo texto de hoje); `config_read: () => configText`; `config_write: (a) => { configText = String(a.content); return null; }`; em `prismaDev`, somar `config: () => configText`.
4. **Store** (`workspace.ts`): campo `formatDialog: null | { scope: 'app' } | { scope: 'doc'; docId: string } | { scope: 'region'; docId: string; regionId: string }` no tipo `State` (perto de `exportOpen`, linha 46) e `formatDialog: null` no estado inicial (perto da linha 194). Em `App.tsx:19`, somar `formatDialog: null` ao Escape.
5. **`src/components/FormatDialog.tsx`** (novo; `<button>/<input>/<select>` só aqui). Recebe props e não acessa o store:
   `{ title: string; note: string; value: FormatOpts; showThreshold: boolean; extra?: { label: string; run: () => void }; onSave(v: FormatOpts): void; onCancel(): void }`.
   Estado local com cópia de `value`. Usa as classes de `../shell/shell.module.css` (`overlay`, `dialog`, `choice`, `dlgHead`, `dlgOpts`, `choiceInput`, `dlgFoot`, `btn`, `btnPrimary`), a mesma moldura do `ChoiceDialog`, sem medida nem cor nova. `role="dialog"`, `aria-label={title}`, Escape cancela (`stopPropagation`), Enter no último campo salva.
   Campos (textos para aprovar):
   - "Arredondamento": `<select>` com "Casas decimais" (`decimais`) e "Algarismos significativos" (`significativos`).
   - "Casas decimais" ou "Algarismos", conforme o modo: `<input type="number" min={modo==='significativos'?1:0} max={15}>`.
   - `<input type="checkbox">` "Mostrar zeros à direita".
   - "Notação": `<select>` com "Automática", "Científica", "Engenharia".
   - Se `showThreshold`: "Limite para exponencial (expoente)": `<input type="number" min=1 max=15>`, desabilitado fora de Automática.
   - Rodapé: [extra], "Cancelar", "OK" (primário).
6. **`src/shell/FormatDialogHost.tsx`** (novo container; montar em `App.tsx` ao lado de `<ChoiceDialog />`, linha 38). Lê `formatDialog`, `config` e `openDocs` do store:
   - `app`: título "Configurações", nota "Formato do resultado em documentos novos", `value = appFormat(config)`, `showThreshold`. Ao salvar: `text = await platform.config()`; `const y = parseDocument(text)` (lib `yaml`; preserva comentários); `y.set('casas_decimais', v.decimals)`, `y.set('modo_arredondamento', v.mode)`, `y.set('zeros_a_direita', !!v.trailingZeros)`, `y.set('notacao', v.notation ?? 'automatica')`, `y.set('limite_exponencial', v.expThreshold)`; `await platform.writeConfig(String(y))`; `set({ config: y.toJS(), formatDialog: null, status: 'Formato salvo para documentos novos' })`. Em caso de erro, status com a mensagem.
   - `doc`: título "Formato do resultado", nota "Vale para este documento", `value = exibicao(parse(doc.text).meta.exibicao)`, `showThreshold`. Ao salvar: `const fm = parse(doc.text).frontmatterRaw; const novo = setExibicao(doc.text, v); edit(doc.id, 0, fm.length, novo.slice(0, novo.length - (doc.text.length - fm.length)))`, ou seja, troca só o cabeçalho. O recálculo vem do `useEffect` em `doc.text` (`Folha.tsx:124`).
   - `region`: título "Formato do resultado", nota "Vale só para esta região", `value = { ...formato do doc, ...regionFormat da região }` (exportar `regionFormat` de `prepare.ts`), `showThreshold=false`, `extra = { label: 'Usar o do documento', run: tira os 4 atributos }`. Ao salvar: pegar a primeira linha da região (o mesmo cálculo de `setAttr`, `Folha.tsx:154-159`; achar a região com `parse` e `blocks` pelo `id`) e aplicar `withAttr(l, 'casas', String(v.decimals), false)`, `modo`, `zeros_a_direita` (`sim`/`nao`) e `notacao`, tudo encadeado, com um único `edit`. Para não duplicar, exportar de `Folha.tsx` a localização da região, ou pôr um helper puro `regionFence(text, id) → {start, line}` em `src/format/views.ts`, que já tem `byPosition`; preferir o helper, usado pelos dois.
7. **Entradas**:
   - `src/commands/app.ts:26`: `register('app.configuracoes', { label: 'Configurações', run: () => st().set({ formatDialog: { scope: 'app' }, menuOpen: false }) })`.
   - `Folha.tsx` `regionMenu` (linha 164): quando `EVALUATED.has(r.seg.type)`, somar o item `{ label: 'Formato do resultado...', run: () => set({ formatDialog: { scope: 'region', docId: doc.id, regionId: r.id } }) }`.
   - `Folha.tsx`, div da folha (linha 436): `onContextMenu={(e) => { if (e.target !== e.currentTarget) return; e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, items: [{ label: 'Formato do documento...', run: () => set({ formatDialog: { scope: 'doc', docId: doc.id } }) }] }); }}`.
   - Não mexer no ribbon nem no menu do app: `tests/e2e/shell.spec.ts` (F0-01/F0-02, linhas 16-24 e 120) confere as listas exatas da SPEC 6.

Rodar FCFG-10 a 12: verdes.

## Passo 5: verificação, revisão, notas e commit
1. `testador` com `npm run verify:rapido` (porta 1420 conferida antes). Tudo verde, testes antigos incluídos. Nenhum valor esperado antigo muda; se algum mudar, **parar e pedir autorização** com a lista.
2. `revisor` no diff ([R]). Corrigir o que ele achar e repetir o `verify:rapido`.
3. `docs/adendo-06.md`: seção **F-CONFIG**. Feito: notação, menus de app/documento/região, padrão gravado no documento novo, config gravável. Pendente: (a) separador decimal ("resultados e expressões", se pedido); (b) sem modo graus, por decisão do usuário (usar `°` no campo de unidade); (c) entrada no caderno (só a folha tem os menus); (d) config antiga com `casas_decimais: 2` agora só afeta documentos novos, e a pessoa vê e troca em Configurações; (e) `config_write` sem teste no app real.
4. `docs/TICKETS-FOLHA.md` linha 34: marcar F-CONFIG como feito, com uma linha das decisões, e a pendência do separador.
5. MATRIZ: FCFG `ok` e etapa `concluída`.
6. Commit local: `F-CONFIG: notação científica/engenharia, menus de formato (app, documento, resultado) e padrão gravado no documento novo` com a linha `Co-Authored-By`. **Sem push.**

## Arquivos
Mudam: `src/engine/format.ts`, `src/engine/prepare.ts`, `src/engine/run.ts`, `src/format/doc.ts`, `src/format/views.ts`, `src/store/workspace.ts`, `src/platform.ts`, `src/dev/tauri-mock.ts`, `src/commands/app.ts`, `src/App.tsx`, `src/editors/folha/Folha.tsx`, `src-tauri/src/appdata.rs`, `src-tauri/src/lib.rs`, `src/engine/golden.test.ts`, `src/engine/engine.test.ts`, `src/format/doc.test.ts`, `tests/golden/calculos.yaml`, `tests/e2e/folha.spec.ts`, `tests/MATRIZ.md`, `docs/adendo-06.md`, `docs/TICKETS-FOLHA.md`.
Novos: `src/components/FormatDialog.tsx`, `src/shell/FormatDialogHost.tsx`, `src/engine/prepare.test.ts`.

## Follow-ups (fora do escopo, só registrar)
- `src/format/doc.ts:110`: o texto de troca do `replace` está corrompido (`'\\export const blocks = (doc: PrismaDoc) =>'` em vez de `'\\$&'`). Nome de atributo com caractere especial geraria uma regex errada. Hoje todo nome é simples. Merece um BUG-nº com teste.
- `scripts/check-camadas.ts`, citado no CLAUDE.md, não existe no repositório.
