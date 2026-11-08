# ADENDO 05: folha livre com o comportamento do SMath Studio

Este adendo **substitui** o modelo de avaliação da folha livre (SPEC seção 8, itens 2 e 3) e **complementa** o ADENDO 02 (digitação) e o ADENDO 01 (formatos). Quando conflitar com eles, vale este.

A base dele são **17 arquivos `.sm` reais do usuário**, entregues em `fixtures-smath.zip`. Descompactar em `tests/fixtures/smath/` sem renomear (os nomes já estão sem acento para não dar problema em caminho). Eles mostram como o usuário trabalha de verdade: 1 002 regiões, 197 resultados calculados pelo SMath, 44 conversões de unidade ou escala, funções definidas pelo usuário, números complexos, matrizes, laços `for`, áreas recolhíveis, tabelas e gráficos.

Objetivo: quem usa SMath tem que conseguir usar a folha livre do Prisma **sem reaprender nada**.

---

## E1. O problema relatado

O usuário digita, como no SMath:

```
x=2
s,tensao=10*x
s,tensao=
```

E espera ver:

```
x ≔ 2
s_tensao ≔ 10·x
s_tensao = 20
```

Hoje isso não funciona, porque o Prisma exige `:` para definir e não trata `,` depois de letra como índice. As regras abaixo corrigem isso.

---

## E2. Regras de digitação (acrescentam e substituem partes do ADENDO 02, seção B4)

### E2.1 O `=` inteligente (regra mais importante)

Quando o usuário digita `=`, o app olha para o que está à **esquerda** do cursor:

| Situação à esquerda | O `=` vira | Exemplo |
|---|---|---|
| Um nome (variável) **ainda não definido** antes deste ponto da folha | **≔** (definição) | `x=2` → x ≔ 2 |
| Um nome com argumentos `f(a;b)` cujo nome ainda não foi definido | **≔** (definição de função) | `f(a;b)=a+b` → f(a; b) ≔ a + b |
| Um nome **já definido** antes deste ponto | **=** (avaliação) | `x=` → x = 2 |
| Qualquer expressão que não é um nome sozinho | **=** (avaliação) | `10*x=` → 10·x = 20 |
| Uma definição já completa (já tem ≔ e lado direito) | acrescenta **= resultado** no fim | `Z_0 ≔ √(L/C)` + `=` → Z₀ ≔ √(L/C) = 387,3 |

- O `:` continua existindo e **sempre** cria definição, mesmo para nome já definido. É assim que o usuário redefine uma variável que já existe (`x:3`).
- Na avaliação, o cursor vai para o **marcador de conversão** (E5). O que for digitado depois do `=` vai para a conversão, e não para a expressão.
- Igualdade lógica (comparação, que devolve 1 ou 0): `Ctrl+=` insere **=** em negrito. No arquivo é gravada como `==`.

### E2.2 Índice no nome (subscrito literal)

Depois de uma **letra**, qualquer uma destas teclas abre o índice do nome: `.` `,` `_`.

- `s,tensao` → s com índice "tensao". `S.trafo` → S com índice "trafo". `V_mp` → V com índice "mp".
- O índice termina com espaço, seta para a direita ou qualquer operador.
- Pontos dentro do índice fazem parte do índice: `Relação.invest.Lucro` → Relação com índice "invest.Lucro".
- Vírgula **depois de dígito** continua sendo decimal (4,5), como no ADENDO 02. Argumentos de função continuam separados por `;`.
- No arquivo, o índice sempre é gravado com `_`: `s_tensao`, `S_trafo`, `Relação_invest.Lucro`.

### E2.3 Outras teclas do SMath que os arquivos usam

| Tecla | Efeito |
|---|---|
| `[` depois de um nome | Índice de elemento de vetor ou matriz: v[2] aparece como v com subscrito **2** dentro de colchetes finos. No arquivo: `v[2]`; para matriz, `M[2;3]` na tela e `M[2, 3]` no arquivo |
| `Ctrl+M` | Insere matriz; abre um diálogo pequeno com linhas e colunas (padrão 3 × 3) |
| `i` sozinho (sem estar definido como variável) | Unidade imaginária. Aparece em **negrito reto** para não confundir com variável |
| `e` sozinho (não definido) | Número de Euler |
| `p` + `Ctrl+G` | π |
| `'` | Força unidade (já está no ADENDO 02) |

---

## E3. Modelo de avaliação (substitui SPEC 8.2 e 8.3)

### E3.1 Ordem

- As regiões são avaliadas na **ordem de leitura**: por `top` (de cima para baixo). Regiões com `top` diferente em menos de 4 px contam como mesma linha e seguem por `left` (da esquerda para a direita).
- Regiões dentro de uma **área** (E6) entram na ordem normal, pela posição.
- Cada região só enxerga o que foi definido **antes dela** nessa ordem.

### E3.2 Definição guarda o valor naquele ponto

- `≔` avalia o lado direito **no momento da definição**, com os valores que existem até ali.
- Redefinir é permitido e comum (`P_custo ≔ P_custo·p`): o lado direito usa o valor anterior.
- Exemplo: `x ≔ 2`, `s ≔ 10·x`, `x ≔ 3`, `s =` → **20**. O s foi calculado quando x valia 2.

### E3.3 Variável indefinida não é erro: fica simbólica

Esse é o comportamento do SMath que o usuário descreveu ("fica salvo como a variável tendo esse 10·x").

- Se o lado direito de uma definição usa um nome **ainda não definido**, a definição guarda a **expressão** com esse nome em aberto, sem erro. Ex.: `s ≔ 10·x` antes de x existir guarda `10·x`.
- Na **avaliação** (`=`), a expressão é resolvida com os valores definidos **até o ponto da avaliação**:
  - `s ≔ 10·x` → `x ≔ 2` → `s =` mostra **20**
  - depois `x ≔ 3` → `s =` mostra **30**
- Se ainda sobrar nome indefinido na hora da avaliação, o resultado é a **expressão simplificada**, sem erro: `s = 10·x`. O nome que falta fica sublinhado em `--math-error`, e a dica diz "x ainda não foi definido".
- Implementação sugerida com math.js: guardar a árvore da expressão; na definição, `math.resolve(arvore, escopoAtual)` (substitui só os nomes conhecidos); na avaliação, `resolve` de novo com o escopo daquele ponto, depois `simplify` e `evaluate` se ficou tudo numérico.

### E3.4 Funções do usuário

- `f(a;b) ≔ expressão` não é avaliada na definição: os argumentos são locais, e os outros nomes são resolvidos **na hora da chamada**, com os valores definidos até o ponto da chamada.
- Os arquivos do usuário usam muito isto (ex.: `Zt_1(S_trafo; V_trafo1; Z) ≔ V_trafo1²/S_trafo·Z` e depois `Zt_1(5 kV·A; 13,8 kV; 2,6 %) = 990,288 Ω`).

### E3.5 Recálculo

- Qualquer edição recalcula **a região editada e todas as que vêm depois dela** na ordem de leitura (não só as que dependem diretamente, porque a semântica simbólica de E3.3 faz qualquer região depois poder mudar).
- Continua valendo o limite de 150 ms do ADENDO 02 para folhas do tamanho da `string-3`. Para folhas grandes (as `AED_*` têm até 318 regiões), recalcular de forma incremental a partir da região editada, mostrando os resultados ainda não atualizados em `--text-dim`.

### E3.6 Região desativada

- Menu de contexto → **Desativar avaliação**. A região continua visível, mas não é avaliada e não define nada. Aparece com opacidade de 45 % e um traço vertical de 2 px `--text-dim` à esquerda.
- No arquivo: atributo `desativado` no bloco (`calc {#id x=.. y=.. desativado}`).
- Os arquivos do usuário têm 141 regiões assim (blocos inteiros de exemplo desativados).

---

## E4. Números e exibição

### E4.1 Tipos de valor que o motor precisa suportar

Todos aparecem nos arquivos do usuário:

- **Complexos** (`a + b·i`), com `abs`, `arg`, `exp`, `re`, `im`, `conj`, forma polar `xy2pol` e `Polar`.
- **Unidades**, inclusive com complexos (impedância em Ω), e as unidades usadas nos arquivos: %, deg, A, kA, V, kV, Ω, ohm, volt, m, kN, kW, Hz, rpm, J. Unidade que o math.js não tiver (ex.: `rpm`, `volt`, `ohm` como apelido) é criada com `math.createUnit` em `src/engine/units.ts`.
- **Vetores e matrizes**: `mat`, `stack`, `augment`, `row`, `col`, `length`, `rows`, `cols`, `el` (índice), `range`, `sum`, `max`, `min`, `invert`/inversa, transposta, determinante, `vectorize`.
- **Sistemas** (`sys`): vetor exibido com chave à esquerda.
- **Laços e programação**: `for(i; range; corpo)`, `if`, `while`, blocos de várias linhas. Índices de vetor **começam em 1**, como no SMath.
- **Texto** (string): `"Roteiro de Lab.xlsx"`, exibido em reto, entre aspas, na cor `--math-op`.
- **FFT** (`fft`, `ifft`).

### E4.2 Formato do resultado

Configurável por **arquivo** (cabeçalho) e por **região** (atributo), com os mesmos nomes de conceito do SMath:

```yaml
exibicao:
  casas: 4                 # casas decimais (SMath: precision 4)
  modo: decimais           # decimais | significativos (SMath: significantDigitsMode)
  zeros_a_direita: false   # SMath: trailingZeros
  limite_exponencial: 5    # notação científica a partir de 10^5 e abaixo de 10^-5
```

- Padrão de arquivo **novo** do Prisma: o que já está nos testes atuais (não mudar sem autorização). Arquivo **importado** do SMath (E7): os valores do próprio `.sm`.
- Por região: `casas=2` no bloco (`calc {#id casas=2}`), igual ao `decimalPlaces` do SMath.
- Notação científica na tela: 1,475·10⁻³ (expoente sobrescrito, nunca "e-3").
- Complexo na tela: 0,11 + 0,5655·**i**. Parte imaginária negativa com o sinal de menos no lugar do mais: 389,7 − 27,15·**i**.

### E4.3 Conversão do resultado (amplia o ADENDO 02, seção B5)

O marcador depois do resultado aceita **qualquer expressão**, não só unidade. É o "contract" do SMath, usado 44 vezes nos arquivos:

| Digitado no marcador | Resultado exibido |
|---|---|
| `deg` | arg(γ) = 82,98 deg |
| `%` | Relação = 4,295 % |
| `10^-6` | Y = (0,2 + 3,77·**i**)·10⁻⁶ |
| `mV` | 3 293,6 mV |

No arquivo: `= ? deg`, `= ? %`, `= ? 10^-6`.

---

## E5. Aparência adicional

- **Moldura** (o `border` do SMath, usado 159 vezes): menu de contexto → **Moldura**. Retângulo de 1 px `--text-muted` com 4 px de folga. Atributo `moldura` no arquivo.
- **Descrição da região**: comentário curto preso à região (o `description` do SMath), mostrado acima dela em Inter 11 px `--text-muted` quando ativo. Atributo `descricao="..."`.
- **Índice de elemento** (v[2]): subscrito com colchetes finos, para não confundir com índice de nome.
- **Unidade imaginária i**: negrito reto.

---

## E6. Áreas (agrupamento recolhível)

Os arquivos do usuário usam 76 áreas para organizar a folha ("Valores RMS tensão e Corrente", exemplos desativados).

- Ribbon da folha, guia Inserir, grupo novo **Organizar**: botão **Área**. Envolve as regiões selecionadas.
- A área aparece como uma linha horizontal de 1 px `--border` em cima e outra embaixo, com o título à esquerda da linha de cima e um botão de recolher (ícone `chevron`: `'M9 6l6 6-6 6'`, girado 90° quando aberta).
- Recolhida: só a linha de cima com o título aparece, e as regiões abaixo **sobem** para ocupar o espaço. As regiões de dentro continuam sendo avaliadas normalmente.
- Opção **Travar área** (menu de contexto): as regiões de dentro não podem ser editadas até destravar.
- No arquivo:

````
```area {#rms titulo="Valores RMS tensão e Corrente" y=711 recolhida}
```

(blocos de dentro, com x/y normais)

```fim-area {#rms}
```
````

---

## E7. Importar arquivos do SMath (`.sm`)

Como o usuário tem muitos arquivos SMath, o Prisma abre `.sm` diretamente:

- **Abrir…** aceita `*.sm` (filtro "SMath Studio (*.sm)"). O arquivo é **convertido** para uma folha livre nova, `<nome>.prsf`, na mesma pasta, e o original **nunca é alterado**. Se já existir um `.prsf` com o mesmo nome, perguntar antes de sobrescrever.

### E7.1 Conversão

| No `.sm` | Na `.prsf` |
|---|---|
| `<region left top>` | `x`, `y` em px convertidos pelo `ppi` do arquivo: `px = valor × 96 / ppi` (há arquivos com ppi 96 e 120) |
| `<math><input>` (tokens em notação polonesa reversa: operandos, `operator args=N`, `function args=N`, `bracket`) | reconstruir a árvore pela pilha e gravar na sintaxe linear |
| operador `:` | `:=` |
| região só com `<input>` + `<result>` | avaliação `= ?` (o valor guardado no `<result>` é descartado e recalculado) |
| `:` + `<result>` | definição com resultado exibido (`:= ... = ?`) |
| `<contract>` | conversão: `= ? <expressão>` |
| `style="unit"` | unidade (`'` implícito) |
| `style="string"` | texto entre aspas |
| nome com ponto `S.trafo` | `S_trafo` |
| `el(v; i)` | `v[i]` |
| `evaluate="false"` | `desativado` |
| `border="true"` | `moldura` |
| `decimalPlaces="2"` | `casas=2` |
| `<description active="true">` | `descricao="..."` |
| `<text>` (parágrafos, negrito, itálico, tamanho) | região de texto com a formatação equivalente; fontes que o Prisma não tem viram Inter |
| `<area>` / terminator | blocos `area` / `fim-area` |
| `<calculation>` (precision, significantDigitsMode, trailingZeros, exponentialThreshold) | `exibicao:` no cabeçalho |
| X-Y Plot (JXCharts) | bloco `grafico` com as séries, eixos (min, max, rótulos) e cores equivalentes |
| Table Region | bloco `tabela` com as entradas (`inputs`) e os dados |
| Image/Picture Region | imagem extraída para `<nome>_arquivos/` e referenciada |
| Funções de plugins sem equivalente (`excel_IN`, `excel_OUT`, `excel_PNG`, `excel_VISIBLE`, `excel_QUIT`…) e regiões desconhecidas (Writer Region) | região mantida no lugar, desativada, com moldura `--warn-text` e o texto "Não suportado: excel_OUT (plugin do SMath)". O XML original vai num bloco `smath-original` para não perder nada |

- Ao final, um relatório na barra de status e no painel direito: "Importado: 141 regiões, 4 não suportadas (excel_OUT)". Clicar leva à primeira região não suportada.
- Funções do SMath em português presentes nos arquivos (`Juntar`, `Angulo`, `Magnitude`, `Polar`, `Enviar.v`, `Enviar.I`, `DTT`, `DTI`) vêm do plugin "Custom Functions" ou são definidas pelo próprio usuário em outro lugar: tratar como **funções do usuário**. Se a definição não estiver no arquivo, aparecem como "não definida" (E3.3), sem travar a importação.

### E7.2 Exportar para `.sm`

Fica para depois (era "parcial, fase 7" no SPEC). Não implementar agora.

---

## E8. Testes

### E8.1 Teclado e semântica (somar a `tests/golden/teclado.yaml` e `calculos.yaml`)

| ID | Teclas ou cenário | Esperado |
|---|---|---|
| E8-01 | `x=2{Enter}` numa folha vazia | x ≔ 2; arquivo `x := 2` |
| E8-02 | depois, `s,tensao=10*x{Enter}` | s<sub>tensao</sub> ≔ 10·x; arquivo `s_tensao := 10*x` |
| E8-03 | depois, `s,tensao={Enter}` | s<sub>tensao</sub> = 20; arquivo `s_tensao = ?` |
| E8-04 | editar x para 3 | s<sub>tensao</sub> = 30 sem nenhum clique |
| E8-05 | `s≔10·x` acima, `x≔2` abaixo, `s=` mais abaixo | 20 (simbólico resolvido na avaliação) |
| E8-06 | `x≔2`, `s≔10·x`, `x≔3`, `s=` | 20 (valor guardado na definição) |
| E8-07 | `s=` sem x definido em lugar nenhum | s = 10·x, sem erro, x sublinhado |
| E8-08 | `x=` com x já definido, digitar `5` | o 5 vai para o marcador de conversão, não para a expressão |
| E8-09 | `x:3` com x já definido | redefine x ≔ 3 |
| E8-10 | `S.trafo:5kV*A` | S<sub>trafo</sub> ≔ 5 kV·A; arquivo `S_trafo := 5 kV*A` |
| E8-11 | `Z,0=sqrt(L/C)=` com L e C definidos | Z<sub>0</sub> ≔ √(L/C) = 387,3 (com L = 1,5·10⁻³ e C = 0,01·10⁻⁶) |
| E8-12 | `f(a;b)=a+b{Enter}` e `f(2;3)=` | f(a; b) ≔ a + b e f(2; 3) = 5 |
| E8-13 | `P,custo:P,custo*p` com P_custo e p definidos | usa o valor anterior de P_custo |
| E8-14 | complexo: `z:(0,11+i*0,5655)*100` e `z=` | 11 + 56,55·**i** |
| E8-15 | `arg(z)=` + marcador `deg` | 78,99 deg (conferir com o motor; valor de referência pelo arquivo do usuário) |
| E8-16 | região desativada que define x | regiões depois dela não enxergam esse x |
| E8-17 | área recolhida | regiões de dentro continuam sendo avaliadas; as de baixo sobem |

### E8.2 Corpus SMath do usuário (o teste mais importante deste adendo)

Para cada arquivo em `tests/fixtures/smath/`:

1. Importar com E7.
2. Para cada região que no `.sm` tinha `<result action="numeric">` **e** não depende de função de plugin não suportada: calcular no Prisma e comparar com o valor guardado pelo SMath, aplicando as mesmas configurações de exibição do arquivo (casas, modo, conversão). **Os dois têm que bater no número exibido.**
3. Gerar `test-results/smath-corpus.md` com, por arquivo: regiões importadas, resultados comparados, iguais, diferentes (com os dois valores lado a lado) e não suportados.

Critérios:

| ID | Critério |
|---|---|
| E8-20 | Todos os 17 arquivos importam sem travar e sem perder região (contagem de regiões igual, contando as não suportadas) |
| E8-21 | Os 8 arquivos que só usam recursos nativos do SMath (`08do10`, `Aula_dia_1_do_10`, `Dia_2.09`, `Exemplo_de_Fatura_A4_-_Verde`, `P_gina1`, `P_gina12`, `Motor`, `Motor_CC`) batem 100 % com os resultados do SMath |
| E8-22 | Nos arquivos com plugin, 100 % dos resultados que **não** dependem de plugin batem |
| E8-23 | Abrir um `.sm` nunca altera o arquivo original (hash igual antes e depois) |
| E8-24 | `08do10.sm`: Z₀ = 387,3; Z = 11 + 56,55·**i**; \|γ\| = 1,475·10⁻³; arg(γ) = 82,98 deg; \|Zc\| = 390,6; \|i₁\| = 113,3; arg(i₁) = −24,32 deg |
| E8-25 | `Exemplo_de_Fatura_A4_-_Verde.sm`: Faturado = 7 358,65 |
| E8-26 | `P_gina1.sm`: Relação<sub>invest.Lucro</sub> = 4,295 %; QTD<sub>meses</sub> = 23,2828 |
| E8-27 | `Dia_2.09.sm`: Zpu_A(0,03; 15 kV; 13,8 kV; 15; 10) = 2,3629 % e Zt_1(5 kV·A; 13,8 kV; 2,6 %) = 990,288 Ω |

Se algum valor não bater, **não** ajustar o teste: investigar o motor (ordem de avaliação, unidade, arredondamento) e, se a diferença for de comportamento do SMath que este adendo não cobre, me avisar com o caso.

---

## E9. Ordem sugerida de implementação

1. E2 (digitação: `=` inteligente, índice com `.` `,` `_`) + E3 (avaliação simbólica e ordem) → testes E8-01 a E8-13.
2. E4.1 complexos e unidades extras, E4.2 formato, E4.3 conversão por expressão → E8-14, E8-15.
3. E3.6 desativar, E5 moldura e descrição, E6 áreas → E8-16, E8-17.
4. E7 importação → E8-20 a E8-27.
5. Vetores, matrizes, `for` e FFT por último, guiados pelos arquivos `AED_*` e `Teste_Pot_ncia_Com_Harm_nica`.

Rodar `npm run verify` ao fim de cada item e `npm run verify:full` no fim do adendo.
