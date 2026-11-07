# Prisma: relatório para verificação (fases 0 a 2 + ADENDOS 01 e 02)

Este documento é para um revisor (pessoa ou agente) conferir o que foi feito **antes da fase 3**. Ele diz o que existe, onde está, como rodar, o que foi verificado e como, e o que ficou de fora de propósito. Desconfie do que está escrito aqui: o objetivo é que você confira no código e rodando.

**Especificação**, nesta ordem de precedência (o adendo mais novo vence onde se sobrepõe):
1. [`ADENDO-02-edicao-matematica-visual.md`](../ADENDO-02-edicao-matematica-visual.md): edição 100 % visual, estilo SMath. Substitui a edição em texto (SPEC 3.4 na tela e "Edição" de 7.1 e 7.2).
2. [`ADENDO-01-formatos-e-arquivos.md`](../ADENDO-01-formatos-e-arquivos.md): sem cofre; extensões `.prsm/.prsf/.prsl/.prst/.prsp`; projetos; instalador. Substitui a SPEC 3.1, as extensões e os critérios da fase 1.
3. [`SPEC.md`](../SPEC.md): fonte da verdade para o resto.

**Outros documentos:**
- **Referência visual:** [`referencia-design.dc.html`](../referencia-design.dc.html) (protótipo aprovado; vale o markup e os estilos).
- **Notas:** [`fase-0.md`](fase-0.md), [`fase-1.md`](fase-1.md) (inclui o ADENDO 01), [`fase-2.md`](fase-2.md), [`adendo-02.md`](adendo-02.md).
- **Repositório:** https://github.com/Willientropia/Prisma (branch `main`).

---

## 1. Como rodar

Requisitos: Node 22, Rust 1.90+ (testado com 1.99), Windows 11 com WebView2 e Microsoft Edge (para os testes de interface).

```bash
npm install
npm test                      # Vitest: conversor, parser, motor, conformidade visual (77 testes)
npm run e2e                   # Playwright no Edge do Windows: critérios B10 do ADENDO 02 (12 testes)
cd src-tauri && cargo test    # Rust: arquivos, projeto, recentes (5 testes)
npm run dev                   # interface no navegador, porta 1420, com disco em memória
npm run tauri dev             # app desktop
npm run tauri build           # instalador NSIS em src-tauri/target/release/bundle/nsis/
```

**Rede:** na máquina onde foi feito, um firewall FortiGate intercepta `registry.npmjs.org` com certificado próprio. As instalações usaram `--registry=https://registry.yarnpkg.com` (espelho oficial). O `package-lock.json` aponta para `registry.npmjs.org`. O Playwright usa o Edge instalado (`channel: 'msedge'`), então não baixa navegador.

**Modo navegador (`npm run dev`):** sem Tauri, `src/platform.ts` usa um disco em memória com os arquivos de `resources/`. Os diálogos de abrir e salvar viram `window.prompt`. No console:

| Comando | O que faz |
|---|---|
| `prismaDev.open(caminho)` | abre um arquivo |
| `prismaDev.newDoc('folha')` | cria um documento novo |
| `prismaDev.text()` | texto do documento ativo |
| `prismaDev.disk` | lista os arquivos |
| `prismaDev.read(caminho)` | lê um arquivo |
| `prismaDev.write(caminho, texto)` | grava e simula uma edição feita fora do app |
| `prismaDev.remove(caminho)` | apaga um arquivo |

Os testes `e2e` usam esses mesmos ganchos.

**Caminhos dos exemplos** nesse modo:
- projeto: `C:/Users/voce/Documents/Usina Boa Vista/usina-boa-vista.prsp`;
- cálculos: `.../Usina Boa Vista/calculos/cabos-cc.prsm` e `string-3.prsf`;
- bibliotecas de fábrica: `C:/Program Files/Prisma/bibliotecas/`.

---

## 2. Mapa do código

| Caminho | O que faz |
|---|---|
| `src/styles/tokens.css` | Única fonte de cores (SPEC 4.1, extras do protótipo e tokens de matemática da B3, todos marcados) |
| `src/styles/global.css` | Base, estilos dos campos MathLive e do texto TipTap |
| `src/components/` | Icon (SPEC 4.4 + negrito, itálico, título, lista), Logo, Tag, PanelHeader, PropGrid, Row, Badge |
| `src/shell/` | Barra de título, ribbon (`ribbons.ts` como dados), abas, status, menu, diálogos, painel Projeto |
| `src/commands/` | Registro único de comandos (ribbon, menu, atalhos, busca) e handlers |
| `src/home/Home.tsx` | Tela inicial |
| `src/format/doc.ts` | Parse/serialize simétrico dos arquivos (segmentos com o texto original) |
| `src/format/views.ts` | Estrutura, variáveis, ordem da folha, funções da biblioteca, seções do `.tex`, tipo do arquivo |
| `src/format/mathlinear.ts` | **ADENDO 02:** conversor linear ⇄ LaTeX do MathLive, classificação de unidades |
| `src/format/display.ts` | Caminhos e formatação |
| `src/math/MathField.tsx` | **ADENDO 02:** campo MathLive com as teclas da B4 e renderização estática |
| `src/math/MathLine.tsx` | **ADENDO 02:** linha de cálculo (campo, resultado, marcador de unidade, selo) |
| `src/editors/caderno/` | Caderno: blocos com campos MathLive, texto TipTap |
| `src/editors/folha/` | Folha: regiões, cursor em cruz, arrastar, seleção, gráfico uPlot (`Plot.tsx`) |
| `src/editors/TextEditor.tsx`, `SourceView.tsx` | TipTap (Markdown) e Exibir > Código-fonte (CodeMirror) |
| `src/editors/latex/`, `biblioteca/` | LaTeX (só leitura do código até a fase 5) e biblioteca |
| `src/engine/` | Motor: sintaxe para math.js, unidades e nativas, avaliação, worker (2 s por linha), gráficos, formatação |
| `src/store/workspace.ts` | Abas, documento ativo, projeto, ciclo de vida CAD, recuperação |
| `src/platform.ts` | Ponte com o Rust (ou disco em memória no navegador) |
| `src-tauri/src/` | `files.rs`, `project.rs`, `appdata.rs`, `recent.rs`, `lib.rs` |
| `resources/exemplos/Usina Boa Vista/` | Projeto de exemplo |
| `resources/bibliotecas/`, `resources/modelos/` | Biblioteca e modelo de fábrica |
| `e2e/adendo02.e2e.ts`, `playwright.config.ts` | Testes de interface |

---

## 3. Situação por parte

### Fase 0: shell estático

| Item | Situação | Como foi verificado |
|---|---|---|
| Ribbon por tipo (SPEC 6), todas as guias | Feito; o caderno ganhou o grupo Texto (B7) e caderno e folha ganharam "Código-fonte" (B1) | Script no navegador comparou com a tabela da SPEC 6 |
| Medidas (SPEC 4.3) | Feito | Medidas no navegador: título 38, guias 32, ribbon 92, abas 32, linhas 28, status 26 px |
| Cores só em `tokens.css`; nenhum emoji ou símbolo como ícone | Feito | Teste `src/conformance.test.ts` |
| Igual ao protótipo lado a lado | **Não conferido por pessoa** | Há capturas de tela do caderno e da folha tiradas pelos testes, mas sem a comparação lado a lado |

### Fase 1 + ADENDO 01

Critérios A9 com a situação: tabela em [`fase-1.md`](fase-1.md#critérios-a9).
- **Verificados no navegador:** 4, 5, 6, 8 e 9.
- **Cobertos por teste automático:** 5, 6 e 7 (só a criação).
- **Só dá para testar com o app instalado:** 1, 2, 3, 7 (mover a pasta) e 10. O instalador é gerado sem erros, mas não foi executado.

### Fase 2: motor e caderno

- **Testes da SPEC 8:** os 6 passam (`src/engine/engine.test.ts`).
- **`cabos-cc`:** mostra 1,79 V, 0,45 % e APROVADO (teste automático e Playwright).
- **Limite de 2 s por linha:** funciona (verificado no navegador).
- **Edição:** substituída pelo ADENDO 02, abaixo.

### ADENDO 02: edição visual

| Critério B10 | Situação | Teste |
|---|---|---|
| 1. `S:4mm^2` Enter → S ≔ 4 mm² com mm² em azul; arquivo `S := 4 mm^2` | Passa | e2e (confere também a cor computada da unidade) |
| 2. `V_mp:400V` → índice reto; arquivo `V_mp := 400 V` | Passa | e2e |
| 3. `(a+b)/2` → fração sem parênteses | Passa | e2e |
| 4. `r` Ctrl+G → ρ | Passa | e2e |
| 5. `I:11,5A` → 11,5 na tela, `11.5` no arquivo | Passa | e2e |
| 6. `string-3` sem clique: 3,29 V, 0,82 %, gráfico com 4 seções e linha de limite | Passa | e2e (pontos conferidos pelo `aria-label` do gráfico) |
| 7. S de 4 para 6 → 2,20 V e 0,55 % em até 150 ms | Passa: **~97 ms** medidos da última tecla ao resultado na tela | e2e (o teste aceita até 400 ms, para dar margem ao próprio Playwright) |
| 8. Marcador de unidade + `mV` → 3293,60 mV; arquivo `= ? mV` | Passa | e2e |
| 9. Nenhum `:=`, `^`, `?` ou `_` na tela | Passa, **sem contar o texto livre do usuário** (ver seção 5) | e2e |
| 10. `toLinear(toLatex(x)) === x` para a tabela B9 | Passa (13 linhas da B9 + todas as linhas dos exemplos) | Vitest |
| 11. Clicar e sair sem editar não muda nenhum pixel | Passa | e2e (compara capturas da região) |

Também no e2e, para a B7:
- no caderno, Enter cria a próxima linha e Backspace numa linha vazia apaga e volta;
- texto formatado pelo teclado é gravado como `**Nota:**` e nenhum símbolo de Markdown aparece na tela.

---

## 4. O que conferir (roteiro sugerido)

### Automático

1. `npx tsc` sem erros; `npm test` (77); `npm run e2e` (12, rode duas ou três vezes para ver se é estável); `cd src-tauri && cargo test` (5).
2. Os comandos de grep do checklist 4.7 da SPEC (cores fora de `tokens.css`, símbolos como ícone).

### Pontos de risco no código

1. **`src/format/mathlinear.ts`.** É o coração do ADENDO 02: tudo que o usuário digita passa por `latexToLine` antes de ir para o arquivo. Confira:
   - expressão incompleta é recusada (não grava);
   - número seguido de letras vira quantidade com unidade (`4mm` → `4 mm`), mas `2 f(x)` vira chamada de função;
   - `,` entre dígitos é decimal, fora disso separa argumentos;
   - a classificação de identificadores (variável definida, unidade conhecida, não definida).
2. **`src/math/MathField.tsx`:**
   - `handleKey` (teclas da B4);
   - o foco tentado a cada quadro até `document.activeElement` ser o campo (o `hasFocus()` do MathLive diz "sim" antes do documento);
   - `holdKeys` (teclas guardadas entre Enter e o foco na linha nova);
   - sair sem editar não grava e volta a mostrar o valor do arquivo;
   - a reescrita do valor no `/` depois de parênteses (`setValue` + `moveToNextPlaceholder`).
3. **`src/editors/caderno/Caderno.tsx`:**
   - as linhas são componentes indexados pela posição; depois de inserir ou apagar uma linha, o mesmo componente passa a representar outra linha;
   - o item 2 acima ("sair sem editar não grava") evita que isso grave por cima da linha errada. Vale tentar quebrar isso à mão.
4. **`src/editors/folha/Folha.tsx`:**
   - criação de região pela primeira tecla (`pendingKeys`, `creating`);
   - mover regiões (`withPos` reescreve a linha de abertura do bloco);
   - apagar várias (de trás para a frente).
5. **`src/editors/TextEditor.tsx`:**
   - `[[links]]` viram links `prisma:` no editor e voltam ao gravar;
   - um texto que não foi editado não é regravado.

   Confira se o Markdown gerado pelo `tiptap-markdown` não muda texto que o usuário não tocou.
6. **Pontos do ADENDO 01** (continuam valendo):
   - `src/store/workspace.ts` (`save`, `saveAs`, `close`, `externalChange`);
   - `src-tauri/src/files.rs` (caminho absoluto com lista de extensões permitidas);
   - `lib.rs` (single-instance como primeiro plugin).

### À mão, no app (precisa de Windows)

1. **Instalação:** instalar o `.exe` de `npm run tauri build`. Conferir os critérios A9 1, 2, 3 e 10: Program Files, menu Iniciar, os 5 tipos no Explorador, duplo clique e segunda instância, `Documentos\Prisma`.
2. **Folha:**
   - clicar na grade e digitar;
   - arrastar regiões pela moldura (encaixe de 20 px);
   - selecionar várias com retângulo e apagar com Delete;
   - Shift+Enter cria uma região abaixo;
   - `"` cria região de texto.
3. **Caderno:**
   - digitar fórmulas grandes (frações aninhadas, raiz, matriz);
   - usar o marcador de unidade com uma unidade incompatível (deve aparecer `Não é possível converter V em m`);
   - Ctrl+clique num `[[link]]`;
   - Exibir > Código-fonte, editando nos dois lados.
4. **Mudança externa:** editar `cabos-cc.prsm` no Bloco de Notas com o app aberto.
5. **Comparação visual** com `referencia-design.dc.html`.

---

## 5. Decisões e desvios (para o revisor julgar)

### ADENDO 02

| Tema | O que foi feito | Por quê |
|---|---|---|
| `a*b/c` digitado | O MathLive cria a·(b/c); ao confirmar, a tela mostra (a·b)/c | Mesmo valor; a linear do arquivo (B9: `2*ρ_cu*L*I/S`) não distingue os dois sem parênteses |
| `\rho` + espaço (B4) | Não suportado no campo | `\` é raiz (SMath, também na B4); grego vem do Ctrl+G |
| Cor dos operadores (`--math-op`) | Não aplicada | O MathLive não marca operadores com classe própria |
| Unidade forçada com `'` | Aparece como unidade na tela, mas a linear não guarda "forçada" | Se existir variável com o mesmo nome, o math.js usa a variável |
| Gráfico | Avaliado com todas as definições da folha | No `string-3` o gráfico fica acima de L, I e V_mp; pela ordem estrita daria erro, e o B10.6 pede o gráfico |
| B10.9 e texto livre | O teste não verifica o texto livre do usuário | "ρ_cu é a resistividade" está escrito assim no exemplo; é conteúdo do usuário |
| Backspace depois de estrutura (B4) | Comportamento padrão do MathLive | Não implementado o "primeiro seleciona, depois apaga" |
| Erro "na parte com problema" (B5) | A linha inteira fica sublinhada | O motor não informa qual pedaço causou o erro |
| Formatação | Casas fixas: 2,20 V, 712,80 kWh, 1,79 V; abaixo de 0,1, 3 algarismos (0,0214) | A B10.7 pede 2,20 V. Na SPEC 8, "712,8 kWh" é valor esperado (tolerância), não formato |
| Recálculo | Linha gravada 100 ms depois da última tecla; cálculo logo depois | A B5 pede resultado em até 150 ms; medido ~97 ms |
| Pacote principal | 2,7 MB | MathLive, math.js, TipTap e CodeMirror; app desktop carregado do disco |

### ADENDO 01 e anteriores

| Tema | O que foi feito | Por quê |
|---|---|---|
| `%APPDATA%\Prisma` | `config_dir()/"Prisma"` em vez de `appConfigDir()` | `appConfigDir()` usaria `app.prisma` como nome da pasta |
| Criar projeto | "Salvar como" escolhe pasta e nome; o app cria `<Nome>/<nome-slug>.prsp` e as subpastas | Estrutura sugerida no A2 sem diálogo próprio |
| Link quebrado | `--paper-error` | `--error-text` tem contraste ~2:1 sobre a página branca |
| Recente não encontrado | `--text-dim`, como pede o A6 | Contraste ~3,3:1, abaixo dos 4,5:1 da SPEC 4.5 (conflito entre os documentos) |
| ATENÇÃO | Passou com 80 % ou mais do limite | A SPEC não define; a fase 3 pede ATENÇÃO para 0,82 % de 1 % |
| `log` | Base 10; `ln` natural | Convenção de engenharia |
| Barra de título | A nativa do Windows continua acima da do app | Tirar exige botões próprios |
| Recálculo incremental (SPEC 8.3) | Reavalia o documento inteiro | Os exemplos levam ~10 a 25 ms |
| Cache `.prisma-cache/` | Não é gravado | Quem lê é a fase 5 |

---

## 6. Não feito ainda

- **Fase 0:** splash, janela "Sobre", avatar configurável.
- **Fase 2:**
  - desfazer/refazer do app fora dos campos (dentro do campo MathLive e do TipTap, Ctrl+Z funciona);
  - Exibir > Justificativas e Só resultados;
  - Unidades > Sistema e Converter;
  - Inserir função e Salvar na biblioteca (fase 4).
- **ADENDO 01:** SKILL.md (A7, fase 6); ícones diferentes por tipo de arquivo.
- **ADENDO 02:**
  - a folha não tem Dependências nem Alinhar;
  - linha de comando só com `calcular` e `ir <nome>`;
  - regiões de matriz e imagem pelo ribbon.
- **Fase 3 em diante:**
  - **Fase 3:** grande parte da folha já entrou com o ADENDO 02 (regiões, arrastar, gráfico, recálculo). Falta conferir os critérios da fase 3, por exemplo o ATENÇÃO no `string-3`, que não tem bloco `verificar`.
  - **Fases 4 a 7:** bibliotecas com testes, LaTeX completo, exportação e modelos.
