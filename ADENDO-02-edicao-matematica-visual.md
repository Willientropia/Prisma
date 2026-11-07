# ADENDO 02: edição matemática 100 % visual (estilo SMath)

Este adendo **substitui** a seção 3.4 do SPEC.md no que diz respeito à **edição**, e as partes de "Edição" das seções 7.1 e 7.2. A sintaxe linear da seção 3.4 continua existindo, mas **só dentro do arquivo**. O usuário nunca vê nem digita a forma linear.

## B0. O problema hoje

A folha mostra `S := 4 mm^2`, `ΔV(L, I, S) = ? V` e o gráfico "Sem valores calculados". Isso está errado em dois pontos:

1. A expressão aparece em texto linear. Ela tem que aparecer sempre formatada: S ≔ 4 mm², com expoente de verdade e unidade em azul.
2. `= ?` nunca pode aparecer na tela. No lugar dele aparece o resultado calculado: ΔV(L, I, S) = 3,29 V.

## B1. Regra principal

**Não existe modo texto.** Toda expressão matemática é editada e exibida no mesmo formato visual, o tempo todo, igual ao SMath Studio:

- Ao clicar numa expressão, o cursor entra **dentro da fórmula formatada** (numa fração, num expoente, num índice). Nada vira texto ao ganhar foco.
- Ao sair da expressão (Enter, Esc, clique fora), **nada muda de aparência**, a não ser a moldura de foco sumir.
- O mesmo motor de renderização é usado na edição e na exibição, para não haver "pulo" visual entre os dois estados.
- O mesmo vale para o **texto** do caderno: é editado formatado (negrito, títulos, listas), sem Markdown cru aparecendo.

A forma linear só aparece se o usuário pedir **Exibir → Código-fonte** (guia Exibir do ribbon), que abre o arquivo inteiro num CodeMirror lado a lado. Essa opção é para usuário avançado e fica desligada por padrão.

## B2. Componentes

| Parte | Biblioteca | Observação |
|---|---|---|
| Expressão matemática | **MathLive** (`<math-field>`) | Uma linha de cálculo = um `math-field`. Sem teclado virtual (`mathVirtualKeyboardPolicy = "manual"`), sem menu de contexto do MathLive (usar o do Prisma) |
| Resultado à direita do `=` | `MathLive.convertLatexToMarkup` | Renderização estática, **fora** do `math-field`, alinhada pela linha de base |
| Unidade de conversão do resultado | um segundo `math-field` pequeno | Ver B5 |
| Texto do caderno e regiões de texto da folha | **TipTap** (ProseMirror) com `tiptap-markdown` | Salva como Markdown, edita formatado |

O conversor **linear ⇄ LaTeX do MathLive** fica em `src/format/mathlinear.ts` e tem que ser **simétrico**: `toLinear(toLatex(x)) === x` para todo `x` dos testes da seção B9.

## B3. Aparência das expressões

Fonte STIX Two Text, como no SPEC. Tamanho 20 px na folha, 19 px no caderno.

| Elemento | Estilo na folha (fundo escuro) | Estilo no caderno (página branca) |
|---|---|---|
| Variável e nome de função | itálico, `--math-var` | itálico, `--paper-text` |
| Número | reto, `--math-var` | reto, `--paper-text` |
| Unidade | reta, `--math-unit` | reta, `--math-unit-paper` |
| Operadores (≔, =, ·, +, −) | retos, `--math-op` | retos, `--paper-text-2` |
| Resultado calculado | reto, peso 600, `--math-result` | reto, peso 600, `--paper-text` |
| Índice (subscrito de nome, ex.: mp em V_mp) | **reto**, 70 % do tamanho | igual |
| Expoente | 70 % do tamanho | igual |

Acrescentar a `tokens.css`:

```css
  /* matemática */
  --math-var: #e9e6f0;
  --math-op: #cbc6d6;
  --math-unit: #8fb4ff;        /* unidades em azul, como no SMath */
  --math-unit-paper: #1d4ed8;
  --math-result: #ffffff;
  --math-error: #f19a9a;
  --math-focus-frame: #a78bfa; /* moldura da região em edição */
```

Símbolos exibidos:

- Definição: **≔** (nunca `:=`).
- Multiplicação: **·** (ponto centralizado). Entre número e unidade **não** aparece ponto: só um espaço fino (`\,`). Ex.: 4 mm², não 4·mm².
- Divisão: sempre **fração empilhada**, nunca barra `/`.
- Raiz: símbolo de radical com barra sobre o radicando.
- Menor ou igual: ≤. Diferente: ≠.
- Separador decimal na tela: **vírgula** (padrão pt-BR, configurável). No arquivo é sempre ponto.

Moldura da região em edição (folha): retângulo de 1 px `--math-focus-frame` com 3 px de folga, sem fundo. Expressão selecionada (não em edição): fundo `--region-selected-bg`.

## B4. Digitação (atalhos iguais ou próximos ao SMath)

Todas estas transformações acontecem **na hora da tecla**, sem precisar de Enter:

| Tecla | Efeito |
|---|---|
| `:` | Insere **≔** (definição). O cursor vai para o lado direito |
| `=` | Pede o resultado. A expressão fica à esquerda, e o resultado aparece à direita **imediatamente** (B5). O cursor sai da expressão |
| `/` | Cria fração. O operando à esquerda do cursor vai para o numerador e o cursor vai para o denominador. Se o operando à esquerda for um grupo entre parênteses, os parênteses somem: `(a+b)/` → fração com a+b em cima |
| `^` | Abre expoente. Sair: seta → ou espaço |
| `_` ou `.` logo depois de letra | Abre **índice de nome** (subscrito reto que faz parte do nome da variável: V_mp). Sair: seta → ou espaço |
| `\` | Raiz quadrada |
| `*` | Multiplicação (exibe ·) |
| `(` | Abre e fecha parênteses automaticamente, cursor no meio |
| `'` | Força o próximo identificador a ser **unidade** (ex.: `4'm` quando existe uma variável chamada m) |
| `"` como primeira tecla numa área vazia da folha | Cria região de **texto** em vez de cálculo |
| Letra latina + `Ctrl+G` | Troca pela letra grega correspondente (a → α, D → Δ, r → ρ, f → φ, w → ω, como no SMath) |
| `\rho`, `\Delta` + espaço | Também viram ρ, Δ |
| `<=`, `>=`, `!=` | ≤, ≥, ≠ |
| Setas | Navegam dentro da estrutura (entrar e sair de fração, expoente, índice) |
| Backspace logo depois de uma estrutura | Primeiro seleciona a estrutura inteira; segundo Backspace apaga |
| Enter | Confirma a expressão e sai da edição (folha). No caderno, cria a próxima linha de cálculo no mesmo bloco |
| Shift+Enter | Na folha, confirma e cria uma região nova logo abaixo, alinhada à esquerda |
| Esc | Sai da edição sem criar nada |

### Separadores (pt-BR, igual ao SMath em português)

Com o separador decimal configurado como vírgula (padrão):

- `,` logo depois de um dígito: **vírgula decimal** (4,5).
- `;` separa **argumentos** de função: o usuário digita `ΔV(L;I;S)`, e a tela mostra ΔV(L; I; S).
- No arquivo, tudo é gravado no padrão da seção 3.4: ponto decimal e vírgula entre argumentos (`ΔV(L, I, S)`, `4.5`).

Se o usuário mudar a configuração para ponto decimal, `.` vira decimal e `,` separa argumentos.

### Reconhecimento de unidades

Quando o cursor sai de um identificador (espaço, operador, `^`, seta, fim da expressão), o identificador é classificado:

1. Se uma **variável ou função com esse nome foi definida antes** (pela ordem de avaliação), é variável: itálico.
2. Senão, se é uma **unidade conhecida** do math.js (m, mm, A, V, W, kWh, Ω, °C, h, dia, %...), é unidade: reta e `--math-unit`.
3. Senão, é variável ainda não definida: itálico e sublinhado ondulado em `--math-error`, com a dica "Variável não definida: S".

O `'` (apóstrofo) força a regra 2. Prefixos SI são aceitos (mm, kW, mA, MΩ). Unidade com expoente (mm²) fica toda em azul, incluindo o expoente.

## B5. Resultado e conversão de unidade

Depois do `=`:

- O resultado aparece à direita, no formato do SPEC (casas decimais da configuração, vírgula decimal, unidade simplificada): **ΔV(L; I; S) = 3,29 V**.
- Logo após a unidade do resultado fica um **marcador de unidade**: um quadradinho de 6 × 6 px em `--text-dim`, que só aparece com o mouse em cima ou com a região em edição. Clicar nele abre um `math-field` pequeno no lugar da unidade, e o usuário digita a unidade desejada (`mV`, `%`). Enter converte. A unidade escolhida vai para o arquivo como `= ? mV`.
- Unidade incompatível (pedir `m` num resultado em V): o campo fica com borda `--math-error` e a barra de status mostra `Não é possível converter V em m`.
- **Recalcular sempre**: qualquer edição recalcula as expressões dependentes em até **150 ms** depois da última tecla (debounce), sem precisar de "Calcular". Os botões Calcular e Calcular tudo continuam existindo para forçar o recálculo completo.
- Enquanto calcula (se passar de 300 ms), o resultado anterior fica em `--text-dim`. Nunca mostrar `?`.
- Com erro: a parte com problema fica sublinhada em `--math-error`, o resultado não aparece, e a mensagem vai para a dica (hover) e para a barra de status. Ex.: `Unidades incompatíveis: m + A`.

## B6. Folha livre: comportamento das regiões

- Clicar numa área vazia da grade posiciona um **cursor em cruz** no ponto da grade mais próximo (como no SMath). Começar a digitar cria uma região de cálculo ali. Clicar de novo em outra área vazia move o cursor.
- Clicar numa região: entra em edição com o cursor no ponto clicado da fórmula.
- Arrastar a região pela moldura: move, com encaixe na grade de 20 px.
- Selecionar várias: arrastar um retângulo numa área vazia.
- Delete com regiões selecionadas (fora de edição): apaga as regiões.
- A ordem de cálculo continua por posição (y, depois x). Ao mover uma região para cima de outra que depende dela, o erro de "variável não definida" aparece na hora.

## B7. Caderno: blocos de cálculo

- Cada linha do bloco `calc` é um `math-field`. Enter no fim de uma linha cria a próxima linha e põe o cursor nela. Backspace numa linha vazia apaga a linha e volta para a anterior.
- Bloco `funcao`: uma linha só, já com **≔** quando o usuário digita `:`.
- Bloco `verificar`: uma linha só. Ao lado direito, o selo APROVADO / REPROVADO / ATENÇÃO (seção 4.5 do SPEC) aparece na hora.
- Texto entre blocos: editor TipTap, com a barra de formatação **no ribbon** (guia Início, grupo novo **Texto**: Negrito, Itálico, Título, Lista, Link). Nada de barra flutuante.

## B8. O que muda no código que já existe

1. Trocar a exibição em texto das regiões e linhas de cálculo por `math-field` do MathLive, configurado como em B2.
2. Criar `src/format/mathlinear.ts` com `toLatex(linear)` e `toLinear(latex)`, cobrindo a tabela de B9.
3. Implementar as transformações de teclado de B4 com `inlineShortcuts` e `keybindings` do MathLive. O que não der para fazer por configuração (`/` puxando o operando, `'` de unidade, `Ctrl+G`, `;` de argumento), fazer interceptando `beforeinput`/`keydown` no `math-field`.
4. Implementar a classificação de unidades de B4 depois de cada identificador, usando a lista de variáveis já definidas que o motor devolve.
5. Ligar o motor de cálculo (seção 8 do SPEC) a cada `math-field` com o debounce de 150 ms de B5. Na folha `string-3`, os resultados e o gráfico têm que aparecer sem nenhum clique.
6. Trocar a edição de texto por TipTap com saída em Markdown.
7. Acrescentar os tokens de B3 em `tokens.css`.

## B9. Tabela de conversão linear ⇄ visual (base dos testes)

| No arquivo (linear) | Na tela | LaTeX no MathLive |
|---|---|---|
| `S := 4 mm^2` | S ≔ 4 mm² | `S\coloneq 4\,\unit{mm^{2}}` |
| `L := 32 m` | L ≔ 32 m | `L\coloneq 32\,\unit{m}` |
| `I := 11.5 A` | I ≔ 11,5 A | `I\coloneq 11.5\,\unit{A}` |
| `V_mp := 400 V` | V<sub>mp</sub> ≔ 400 V | `V_{\mathrm{mp}}\coloneq 400\,\unit{V}` |
| `ΔV(L, I, S) := 2*ρ_cu*L*I/S` | ΔV(L; I; S) ≔ fração (2·ρ<sub>cu</sub>·L·I sobre S) | `\Delta V(L,I,S)\coloneq\frac{2\cdot\rho_{\mathrm{cu}}\cdot L\cdot I}{S}` |
| `ΔV(L, I, S) = ? V` | ΔV(L; I; S) = 3,29 V | expressão à esquerda; resultado renderizado à parte |
| `ΔV(L, I, S)/V_mp = ? %` | fração (ΔV(L; I; S) sobre V<sub>mp</sub>) = 0,82 % | `\frac{\Delta V(L,I,S)}{V_{\mathrm{mp}}}` |
| `(a + b)/(c + d)` | fração sem parênteses | `\frac{a+b}{c+d}` |
| `sqrt(x^2 + y^2)` | radical | `\sqrt{x^{2}+y^{2}}` |
| `x <= 1 %` | x ≤ 1 % | `x\le 1\,\unit{\%}` |
| `T := 25 °C` | T ≔ 25 °C | `T\coloneq 25\,\unit{°C}` |
| `M := [1, 2; 3, 4]` | matriz 2 × 2 entre colchetes | `M\coloneq\begin{bmatrix}1&2\\3&4\end{bmatrix}` |
| `abs(x)` | \|x\| | `\left\lvert x\right\rvert` |

`\unit{...}` é uma macro registrada no MathLive (`macros: { unit: '\\mathrm{\\class{u}{#1}}' }` ou equivalente) para a renderização dar a classe/cor de unidade. O número no LaTeX usa ponto, porque a vírgula é só exibição (o MathLive deve ser configurado com `decimalSeparator: ","`).

## B10. Critérios de aceite

Testes automatizados (Vitest + Playwright, simulando teclado no `math-field`):

1. Na folha, digitar `S:4mm^2` e Enter → tela mostra S ≔ 4 mm² (mm² em `--math-unit`, 2 como expoente). Arquivo grava `S := 4 mm^2`.
2. Digitar `V_mp:400V` → V com índice reto "mp", ≔ e 400 V. Arquivo: `V_mp := 400 V`.
3. Digitar `(a+b)/2` → fração com a+b no numerador, **sem** parênteses, e 2 no denominador.
4. Digitar `rCtrl+G` → ρ.
5. Digitar `I:11,5A` → I ≔ 11,5 A na tela e `I := 11.5 A` no arquivo.
6. Na folha `string-3`, sem clicar em nada: ΔV(L; I; S) = 3,29 V e ΔV/V<sub>mp</sub> = 0,82 %, e o gráfico com as 4 seções e a linha de limite.
7. Mudar S de 4 para 6 → em até 150 ms depois da última tecla, os resultados mudam para 2,20 V e 0,55 %.
8. Clicar no marcador de unidade do resultado 3,29 V e digitar `mV` → 3 293,6 mV (ou o arredondamento da configuração; o valor exato é 3,2936 V); arquivo grava `= ? mV`.
9. Nenhum texto `:=`, `^`, `?` ou `_` aparece na tela em nenhum caderno ou folha (exceto em Exibir → Código-fonte).
10. `toLinear(toLatex(x)) === x` para todas as linhas da tabela B9.
11. Clicar numa expressão e sair dela sem editar não muda nenhum pixel da renderização (comparação de captura de tela).
