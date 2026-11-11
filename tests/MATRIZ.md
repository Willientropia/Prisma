# Matriz de rastreio (ADENDO 03, C2)

Todo critério de aceite dos documentos tem um ID e pelo menos um teste que cita o ID entre colchetes no nome (`[B10-07] ...`), ou um item em [`MANUAL.md`](MANUAL.md). O `scripts/check-matriz.ts` confere isso no `npm run verify`:
- **falha** se um ID sem status `pendente` não tem teste;
- **falha** se um teste cita ID que não está aqui;
- **falha** se um critério de etapa `concluída` está `pendente`.

## Etapas

| Etapa | IDs | Status |
|---|---|---|
| Fase 0: shell | F0 | concluída |
| Fase 1 (substituída pelo Adendo 01, critérios A9) | A9 | concluída |
| Fase 2: motor e caderno | F2 | concluída |
| Adendo 02: edição visual | B10, B7, B4 | concluída |
| Checklist visual (SPEC 4.7) | V | concluída |
| Adendo 04: posição das abas | D6 | concluída |
| Adendo 03: testes | C9, C7 | concluída |
| Bugs corrigidos | BUG | concluída |
| Auditoria Fable, lote A: travamentos do editor | T01, T02, T03 | concluída |
| Auditoria Fable, lote F1: teclado preso na folha | F03 | concluída |
| Auditoria Fable, lote F1: nome é variável, unidade explícita | F04 | concluída |
| Fase 3: folha livre | F3 | concluída |
| Fase 4: bibliotecas | F4 | concluída |
| Adendo 05: folha estilo SMath | E8 | concluída |
| Folha livre: verificação rápida (TICKETS-FOLHA) | F00 | concluída |
| Adendo 06: teclado, assistente, ribbon e gráficos (lote F-A6) | A6 | em andamento |
| Fase 5: LaTeX | F5 | futura |
| Fase 6: exportação e skills | F6 | futura |
| Fase 7: modelos e extras | F7 | futura |

Tipos: `unit` (Vitest), `browser` (Vitest no navegador), `e2e` (Playwright, Tauri simulado), `visual` (Playwright, imagem aprovada), `app` (WebdriverIO + tauri-driver, binário real), `rust` (cargo test), `manual` (`tests/MANUAL.md`), `meta` (testes do próprio sistema de testes).

## Critérios

| ID | Critério | Teste(s) | Tipo | Status |
|---|---|---|---|---|
| F0-01 | Caderno mostra as guias e os grupos de ribbon da SPEC 6 | tests/e2e/shell.spec.ts | e2e | ok |
| F0-02 | Folha livre mostra as guias e os grupos de ribbon da SPEC 6 | tests/e2e/shell.spec.ts | e2e | ok |
| F0-03 | Documento LaTeX mostra as guias e os grupos de ribbon da SPEC 6 | tests/e2e/shell.spec.ts | e2e | ok |
| F0-04 | Biblioteca mostra as guias e os grupos de ribbon da SPEC 6 | tests/e2e/shell.spec.ts | e2e | ok |
| F0-05 | Cada tipo mostra os painéis esquerdo e direito da SPEC 7 | tests/e2e/shell.spec.ts | e2e | ok |
| F0-06 | Barra de título de 38 px com acesso rápido, título "Prisma 2026 \| arquivo", busca e avatar | tests/e2e/shell.spec.ts | e2e | ok |
| F0-07 | Abas de documento com selo de tipo; aba ativa com borda inferior --accent-light (ADENDO 04 substituiu a borda superior) | tests/e2e/shell.spec.ts | e2e | ok |
| F0-08 | Barra de status com a mensagem e "Unidades: SI", "Cálculo: automático", "Zoom 100 %" | tests/e2e/shell.spec.ts | e2e | ok |
| F0-09 | Menu do app com os 8 itens e atalhos da SPEC 5.1; fecha com Esc | tests/e2e/shell.spec.ts | e2e | ok |
| F0-10 | Tela inicial com Novo, Recentes e Modelos (SPEC 5.2) | tests/e2e/shell.spec.ts | e2e | ok |
| F0-11 | A janela fica igual à imagem aprovada em cada tela (cores e medidas da seção 4) | tests/visual/telas.spec.ts | visual | ok |
| F0-12 | O app desktop abre até a tela inicial | tests/app/app.e2e.ts | app | ok |
| F0-13 | Ribbon, menu, atalhos e busca chamam o mesmo registro de comandos (SPEC 10) | src/conformance.test.ts, tests/e2e/shell.spec.ts | unit, e2e | ok |
| A9-01 | `npm run tauri build` gera instalador NSIS; instalado fica em C:\Program Files\Prisma e no menu Iniciar | tests/MANUAL.md | manual | ok |
| A9-02 | Arquivo passado ao programa abre em aba; com o Prisma aberto, o segundo abre outra aba na mesma janela | tests/app/app.e2e.ts (app aberto), cargo test arquivos_na_linha_de_comando e tests/MANUAL.md#a9-03 (a frio) | app, rust, manual | ok |
| A9-03 | Os 5 tipos aparecem no Explorador com a descrição certa e o ícone do app | tests/MANUAL.md | manual | ok |
| A9-04 | Novo > Caderno cria Caderno1 sem gravar em disco; Ctrl+S abre Salvar como com .prsm | tests/e2e/arquivos.spec.ts | e2e | ok |
| A9-05 | Abrir e salvar sem editar cada exemplo (.prsm, .prsf, .prsl, .prst, .prsp) devolve bytes idênticos | src/format/doc.test.ts, tests/e2e/arquivos.spec.ts | unit, e2e | ok |
| A9-06 | Arquivo com CRLF e BOM abre normalmente e é salvo em UTF-8 sem BOM com LF | src/format/doc.test.ts, tests/e2e/arquivos.spec.ts | unit, e2e | ok |
| A9-07 | Criar projeto gera .prsp, pastas e .gitignore; mover a pasta do projeto e abrir o .prsp funciona | src-tauri/src/project.rs, tests/e2e/projeto.spec.ts | rust, e2e | ok |
| A9-08 | Arquivo listado no .prsp e apagado do disco aparece como "não encontrado" no painel Projeto | tests/e2e/projeto.spec.ts | e2e | ok |
| A9-09 | Tela inicial sem "cofre"; recentes incluem projetos e marcam arquivos que sumiram | tests/e2e/projeto.spec.ts | e2e | ok |
| A9-10 | Primeira execução cria Documentos\Prisma\Bibliotecas, Modelos e Skills | tests/app/app.e2e.ts | app | ok |
| A9-11 | Um .prsm é texto legível: cabeçalho YAML, texto e blocos de cálculo | src/format/doc.test.ts | unit | ok |
| F2-01 | ΔV(25 m, 12 A, 6 mm^2) com ρ_cu = 0,0179 Ω·mm²/m dá 1,79 V (±0,5 %) | tests/golden/calculos.yaml | unit | ok |
| F2-02 | ΔV(32 m, 11.5 A, 4 mm^2) dá 3,29 V | tests/golden/calculos.yaml | unit | ok |
| F2-03 | 3,29 V / 400 V dá 0,82 % | tests/golden/calculos.yaml | unit | ok |
| F2-04 | E_mes(5.5 kWp, 5.4 h/dia, 0.8) dá 712,8 kWh | tests/golden/calculos.yaml | unit | ok |
| F2-05 | ρ_T(70 °C) dá 0,0214 Ω·mm²/m | tests/golden/calculos.yaml | unit | ok |
| F2-06 | 1 m + 1 A dá erro de unidade | tests/golden/calculos.yaml | unit | ok |
| F2-07 | O caderno cabos-cc mostra 1,79 V, 0,45 % e APROVADO | src/engine/engine.test.ts, tests/e2e/caderno.spec.ts | unit, e2e | ok |
| F2-08 | Usar uma variável antes de defini-la é erro (SPEC 8.2) | tests/golden/calculos.yaml | unit | ok |
| F2-09 | A unidade do resultado é simplificada (SPEC 8.5) | tests/golden/calculos.yaml | unit | ok |
| F2-10 | As funções nativas da SPEC 8.6 calculam certo | tests/golden/calculos.yaml, src/engine/engine.test.ts | unit | ok |
| F2-11 | Avaliação que passa de 2 s é interrompida e o erro aparece na linha (SPEC 8.7) | tests/e2e/caderno.spec.ts | e2e | ok |
| F2-12 | Painel Estrutura lista os blocos com selo; clicar seleciona o bloco | tests/e2e/caderno.spec.ts | e2e | ok |
| F2-13 | Painel Propriedades mostra o bloco selecionado | tests/e2e/caderno.spec.ts | e2e | ok |
| F2-14 | Verificação mostra APROVADO, ATENÇÃO (passa perto do limite) ou REPROVADO | tests/golden/calculos.yaml | unit | ok |
| F2-15 | A sintaxe da SPEC 3.4 é traduzida para o motor (:=, = ?, = ? unidade, comentário, °C, Ω, letra grega por nome) | src/engine/engine.test.ts | unit | ok |
| F2-16 | Exibição com casas decimais da configuração, vírgula e arredondamento decimal (SPEC 8.5) | tests/golden/calculos.yaml, src/engine/engine.test.ts | unit | ok |
| F3-01 | A folha string-3 mostra 3,29 V e 0,82 % | tests/e2e/folha.spec.ts | e2e | ok |
| F3-02 | A folha string-3 mostra ATENÇÃO (região #criterio acrescentada ao exemplo, pedido do usuário) | tests/e2e/folha.spec.ts | e2e | ok |
| F3-03 | O gráfico da string-3 tem a linha de limite | tests/e2e/folha.spec.ts | e2e | ok |
| F3-04 | Regiões são arrastadas pela moldura com encaixe na grade de 20 px | tests/e2e/folha.spec.ts | e2e | ok |
| F3-05 | A folha é avaliada por posição (y, depois x) | src/format/doc.test.ts, tests/e2e/folha.spec.ts | unit, e2e | ok |
| F3-06 | Tabela de variáveis com nome, valor e unidade | tests/e2e/folha.spec.ts | e2e | ok |
| F3-07 | Linha de comando aceita "ir <arquivo>" | tests/e2e/folha.spec.ts | e2e | ok |
| F3-08 | Selo por razão de uso: `<`/`<=` r = valor/limite, `>`/`>=` r = limite/valor; falsa: REPROVADO; verdadeira e r ≥ 1 − m: ATENÇÃO; senão APROVADO | tests/golden/calculos.yaml | unit | ok |
| F3-09 | Margem de atenção padrão 20 %, configurável em config.yaml (verificacao.margem_atencao) | tests/golden/calculos.yaml, src/engine/engine.test.ts | unit | ok |
| F3-10 | Atributo atencao=10% no bloco verificar vence o padrão | tests/golden/calculos.yaml, tests/e2e/caderno.spec.ts | unit, e2e | ok |
| F3-11 | Limite zero, negativo ou sem limite numérico (=, ≠, duas expressões variáveis): nunca ATENÇÃO | tests/golden/calculos.yaml | unit | ok |
| F3-12 | Texto do selo "<ESTADO> · limite <limite>" no caderno e na folha | tests/e2e/caderno.spec.ts, tests/e2e/folha.spec.ts | e2e | ok |
| F4-01 | Bibliotecas .prsl são carregadas e usadas no cálculo | tests/e2e/caderno.spec.ts | e2e | ok |
| F4-02 | `salvar=<id>` grava na biblioteca certa: projeto, depois Documentos, depois extensão da de fábrica, senão pergunta onde criar | tests/e2e/biblioteca.spec.ts, src/format/library.test.ts | e2e, unit | ok |
| F4-03 | Função salva no caderno aparece na biblioteca e na folha | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-04 | Os testes de eletrica.prsl rodam e passam na tela da biblioteca (Testes) | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-05 | Tela de biblioteca com assinatura, fórmula, parâmetros e testes | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-06 | Busca de função (Ctrl+K e "Inserir função") lista as funções das bibliotecas e insere a escolhida | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-02a | salvar=eletrica sem extensão cria eletrica.usuario.prsl em Documentos e não toca no arquivo de fábrica (hash igual) | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-02b | A função salva aparece na tela da biblioteca eletrica e funciona numa folha sem import extra | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-02c | Função com o nome de uma de fábrica: vale a da extensão; sem a extensão, volta a de fábrica | tests/e2e/biblioteca.spec.ts, src/format/library.test.ts | e2e, unit | ok |
| F4-02d | Base atualizada com função nova: ela aparece mesmo com a extensão existindo | src/format/library.test.ts | unit | ok |
| F4-02e | salvar=<id inexistente> abre o diálogo de criação (Projeto atual só com projeto aberto) | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-02f | Redefinir com fórmula diferente abre a comparação; Substituir sobe a versão no último número e atualiza Origem | tests/e2e/biblioteca.spec.ts, src/format/library.test.ts | e2e, unit | ok |
| F4-07 | Na biblioteca de fábrica, Nova função, Importar e Publicar versão ficam desabilitados com a dica certa | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-07a | Biblioteca de fábrica mostra "fábrica · somente leitura" com cadeado na tela e em Bibliotecas em uso | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-07b | Ctrl+S no arquivo de fábrica original não grava nada (hash igual) e avisa "somente leitura" | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-07c | Ctrl+S no arquivo de fábrica abre "Salvar como" em Documentos/Prisma/Bibliotecas (ou /Modelos) com "Arquivo de fábrica é somente leitura. Salve uma cópia." | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-08 | Função do caderno diferente da biblioteca: rótulo "FUNÇÃO · <ID> · ALTERADA, NÃO SALVA NA BIBLIOTECA"; clicar salva; iguais, o aviso some | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-09 | Base + extensão não dispara o aviso de id repetido; dois arquivos independentes com o mesmo id disparam | src/format/library.test.ts | unit | ok |
| E8-01 | `x=2` Enter numa folha vazia: x ≔ 2; arquivo `x := 2` | tests/e2e/smath.spec.ts | e2e | ok |
| E8-02 | Depois, `s,tensao=10*x` Enter: s com índice tensao ≔ 10·x; arquivo `s_tensao := 10*x` | tests/e2e/smath.spec.ts, tests/golden/conversao.yaml | e2e, unit | ok |
| E8-03 | Depois, `s,tensao=` Enter: s_tensao = 20; arquivo `s_tensao = ?` | tests/e2e/smath.spec.ts, tests/golden/calculos.yaml | e2e, unit | ok |
| E8-04 | Editar x para 3: s_tensao = 30 sem nenhum clique | tests/e2e/smath.spec.ts | e2e | ok |
| E8-05 | `s≔10·x` acima, `x≔2` abaixo, `s=` mais abaixo: 20 (simbólico resolvido na avaliação) | tests/golden/calculos.yaml | unit | ok |
| E8-06 | `x≔2`, `s≔10·x`, `x≔3`, `s=`: 20 (valor guardado na definição) | tests/golden/calculos.yaml | unit | ok |
| E8-07 | `s=` sem x definido: s = 10·x, sem erro, x sublinhado | tests/e2e/smath.spec.ts, tests/golden/calculos.yaml | e2e, unit | ok |
| E8-08 | `x=` com x já definido, digitar 5: o 5 vai para o marcador de conversão | tests/e2e/smath.spec.ts | e2e | ok |
| E8-09 | `x:3` com x já definido redefine x ≔ 3 | tests/e2e/smath.spec.ts, tests/golden/calculos.yaml | e2e, unit | ok |
| E8-10 | `S.trafo:5kV*A`: S com índice trafo ≔ 5 kV·A; arquivo `S_trafo := 5 kV*A` | tests/e2e/smath.spec.ts, tests/golden/conversao.yaml | e2e, unit | ok |
| E8-11 | `Z,0=sqrt(L/C)=` com L e C definidos: Z0 ≔ √(L/C) = 387,3 | tests/e2e/smath.spec.ts, tests/golden/calculos.yaml, tests/golden/conversao.yaml | e2e, unit | ok |
| E8-12 | `f(a;b)=a+b` Enter e `f(2;3)=`: f(a; b) ≔ a + b e f(2; 3) = 5 | tests/e2e/smath.spec.ts, tests/golden/calculos.yaml | e2e, unit | ok |
| E8-13 | `P,custo:P,custo*p` usa o valor anterior de P_custo | tests/golden/calculos.yaml | unit | ok |
| E8-14 | Complexo: `z:(0,11+i*0,5655)*100` e `z=`: 11 + 56,55·i | tests/e2e/smath.spec.ts, tests/golden/calculos.yaml | e2e, unit | ok |
| E8-15 | `arg(z)=` com marcador `deg`: valor em graus | tests/e2e/smath.spec.ts, tests/golden/calculos.yaml | e2e, unit | ok |
| E8-16 | Região desativada que define x: as de depois não enxergam esse x | tests/e2e/smath.spec.ts, src/format/doc.test.ts | e2e, unit | ok |
| E8-17 | Área recolhida: regiões de dentro continuam avaliadas; as de baixo sobem | tests/e2e/smath.spec.ts | e2e | ok |
| E8-18 | Formato do resultado como no SMath (exibicao: casas, modo, zeros_a_direita, limite_exponencial; casas= na região); notação científica na tela 1,475·10⁻³, nunca "e-3" | tests/e2e/smath.spec.ts, tests/golden/calculos.yaml | e2e, unit | ok |
| E8-19 | O marcador de conversão aceita expressão além de unidade (= ? 10^-6, = ? deg, = ? %) | tests/e2e/smath.spec.ts, tests/golden/calculos.yaml, tests/golden/conversao.yaml | e2e, unit | ok |
| E8-30 | Moldura (1 px --text-muted) e descrição (Inter 11 px --text-muted acima da região), pelo menu de contexto e pelos atributos moldura e descricao= | tests/e2e/smath.spec.ts, src/format/doc.test.ts | e2e, unit | ok |
| E8-31 | Vetores, matrizes e programação do SMath: v[i] e M[i, j] (1-based; atribuição cria o vetor), mat, sys, range, stack, augment, length, row, xy2pol, sys2mat, vectorize, for, fft; matriz mostrada como matriz | tests/golden/calculos.yaml, tests/golden/conversao.yaml, tests/e2e/smath.spec.ts | unit, e2e | ok |
| E8-20 | Os 17 .sm importam sem travar e sem perder região | src/format/smath.test.ts, tests/e2e/smath.spec.ts | unit, e2e | ok |
| E8-21 | Os 8 .sm só com recursos nativos batem 100 % com os resultados do SMath | src/format/smath.test.ts | unit | ok |
| E8-22 | Nos .sm com plugin, 100 % dos resultados que não dependem de plugin batem; os 3 resultados do fft de Teste_Pot_ncia_Com_Harm_nica.sm (o SMath trocou o i da saída pela variável i = 8 do laço) ficam como não comparáveis, com o motivo, e batem com o esperado corrigido [8; 3+i; −6; 3−i] | src/format/smath.test.ts | unit | ok |
| E8-23 | Abrir um .sm nunca altera o original (hash igual) | src/format/smath.test.ts, tests/e2e/smath.spec.ts | unit, e2e | ok |
| E8-24 | 08do10.sm: Z0 = 387,3; Z = 11 + 56,55·i; abs(γ) = 1,475·10⁻³; arg(γ) = 82,98 deg; abs(Zc) = 390,6; abs(i1) = 113,3; arg(i1) = −24,32 deg | src/format/smath.test.ts | unit | ok |
| E8-25 | Exemplo_de_Fatura_A4_-_Verde.sm: Faturado = 7 358,65 | src/format/smath.test.ts | unit | ok |
| E8-26 | P_gina1.sm: Relação_invest.Lucro = 4,295 %; QTD_meses = 23,2828 | src/format/smath.test.ts | unit | ok |
| E8-27 | Dia_2.09.sm: Zpu_A(0,03; 15 kV; 13,8 kV; 15; 10) = 2,3629 % e Zt_1(5 kV·A; 13,8 kV; 2,6 %) = 990,288 Ω | src/format/smath.test.ts | unit | ok |
| E8-28 | Depois de for(i; range(1;8); ...), i continua definido com o último valor (8), como no SMath; i e o vetor de destino contam como definidos para a tela e para o "=" inteligente | tests/golden/calculos.yaml, src/format/smath.test.ts, tests/e2e/smath.spec.ts | unit, e2e | ok |
| E8-29 | Unidade imaginária 𝐢 e constante de Euler 𝐞 são símbolos próprios (negrito reto), nunca a variável i ou e do usuário; definir i ou e (inclusive como variável de laço) mostra uma vez por documento, na barra de status: "i agora é uma variável (vale 8). A unidade imaginária continua disponível como 𝐢 no ribbon Matemática." | tests/golden/calculos.yaml, tests/golden/conversao.yaml, src/format/smath.test.ts, tests/e2e/smath.spec.ts | unit, e2e | ok |
| F5-01 | O memorial de exemplo compila | | app | pendente |
| F5-02 | Mudar S no caderno não altera o PDF até clicar em Atualizar resultados | | e2e | pendente |
| F5-03 | Inserir resultado põe \resultado{...} no cursor com o valor em comentário | | e2e | pendente |
| F5-04 | Atualizar resultados mostra a lista do que muda (valor antigo e novo) | | e2e | pendente |
| F5-05 | Clicar no PDF leva à linha do código (SyncTeX) | | app | pendente |
| F5-06 | Referência quebrada aparece como [??] no PDF e como aviso | | app | pendente |
| F6-01 | Cada formato de exportação abre no programa de destino | | manual | pendente |
| F6-02 | O SKILL.md gerado lista as funções instaladas | | unit | pendente |
| F6-03 | Diálogo Exportar com lista de formatos e opções | tests/e2e/shell.spec.ts | e2e | ok |
| F7-01 | Modelos de fábrica com {{campos}} substituídos na criação | | e2e | pendente |
| F7-02 | Criar arquivo a partir de modelo | | e2e | pendente |
| F7-03 | Exportação SMath parcial | | unit | pendente |
| F7-04 | Exportação Jupyter | | unit | pendente |
| V-01 | Toda cor vem de tokens.css (fora os SVGs do logo) | src/conformance.test.ts | unit | ok |
| V-02 | Nenhum emoji nem caractere de símbolo como ícone | src/conformance.test.ts | unit | ok |
| V-03 | Fontes carregadas de resources/fonts, nada da internet | src/conformance.test.ts, tests/e2e/shell.spec.ts | unit, e2e | ok |
| V-04 | Medidas: título 38, guias 32, ribbon mínimo 92, abas 32, status 26, linhas de painel 28 px | tests/e2e/shell.spec.ts | e2e | ok |
| V-05 | Guia ativa do ribbon e aba ativa usam --accent-light na borda de 2 px | tests/e2e/shell.spec.ts | e2e | ok |
| V-06 | Botão do app mostra o logo principal em 22 px, sem letra | tests/e2e/shell.spec.ts | e2e | ok |
| V-07 | Página do caderno continua branca, bloco de função com --paper-accent | tests/e2e/caderno.spec.ts | e2e | ok |
| V-08 | Textos da interface em pt-BR como no protótipo | tests/e2e/shell.spec.ts | e2e | ok |
| V-09 | Contraste de texto de pelo menos 4,5:1 nos pares de tokens usados para texto | src/conformance.test.ts | unit | ok |
| B10-01 | S:4mm^2 Enter mostra S ≔ 4 mm² (mm² em --math-unit) e grava "S := 4 mm^2" | tests/golden/teclado.yaml, tests/e2e/edicao-visual.spec.ts | browser, e2e | ok |
| B10-02 | V_mp:400V mostra V com índice reto mp e grava "V_mp := 400 V" | tests/golden/teclado.yaml, tests/e2e/edicao-visual.spec.ts | browser, e2e | ok |
| B10-03 | (a+b)/2 vira fração com a+b em cima, sem parênteses | tests/golden/teclado.yaml, tests/e2e/edicao-visual.spec.ts | browser, e2e | ok |
| B10-04 | r Ctrl+G vira ρ | tests/golden/teclado.yaml, tests/e2e/edicao-visual.spec.ts | browser, e2e | ok |
| B10-05 | I:11,5A mostra 11,5 e grava "I := 11.5 A" | tests/golden/teclado.yaml, tests/e2e/edicao-visual.spec.ts | browser, e2e | ok |
| B10-06 | string-3 sem clique: 3,29 V, 0,82 % e o gráfico com 4 seções e linha de limite | tests/e2e/edicao-visual.spec.ts | e2e | ok |
| B10-07 | Mudar S de 4 para 6 mostra 2,20 V e 0,55 % em até 150 ms depois da última tecla | tests/e2e/edicao-visual.spec.ts | e2e | ok |
| B10-08 | Marcador de unidade + mV converte para mV e grava "= ? mV" | tests/e2e/edicao-visual.spec.ts | e2e | ok |
| B10-09 | Nenhum ":=", "^", "?" ou "_" na tela em cadernos e folhas | tests/e2e/edicao-visual.spec.ts | e2e | ok |
| B10-10 | toLinear(toLatex(x)) === x para todas as linhas da tabela B9 | tests/golden/conversao.yaml | unit | ok |
| B10-11 | Clicar numa expressão e sair sem editar não muda nenhum pixel | tests/e2e/edicao-visual.spec.ts | e2e | ok |
| B4-01 | Tecla ":" insere ≔ | tests/golden/teclado.yaml | browser | ok |
| B4-02 | Tecla "*" vira · | tests/golden/teclado.yaml | browser | ok |
| B4-03 | Barra invertida abre raiz | tests/golden/teclado.yaml | browser | ok |
| B4-04 | Ponto depois de letra abre índice; espaço sai do índice | tests/golden/teclado.yaml | browser | ok |
| B4-05 | ";" separa argumentos; "," depois de dígito é vírgula decimal | tests/golden/teclado.yaml | browser | ok |
| B4-06 | "=" pede o resultado | tests/golden/teclado.yaml | browser | ok |
| B4-07 | Número seguido de unidade conhecida mostra a unidade em azul | tests/golden/teclado.yaml | browser | ok |
| B7-01 | Caderno: Enter cria a próxima linha; Backspace numa linha vazia apaga e volta | tests/e2e/edicao-visual.spec.ts | e2e | ok |
| B7-02 | Caderno: texto editado formatado vira Markdown no arquivo, sem marcação na tela | tests/e2e/edicao-visual.spec.ts | e2e | ok |
| C7-01 | Orçamento: recálculo da string-3 em até 150 ms | tests/e2e/desempenho.spec.ts | e2e | ok |
| C7-02 | Orçamento: abrir um .prsm de 1 MB em até 500 ms | tests/e2e/desempenho.spec.ts | e2e | ok |
| C7-03 | Orçamento: abrir o app até a tela inicial em até 3 s | tests/app/app.e2e.ts | app | ok |
| C9-01 | `npm run verify` roda tudo de C5 (menos test:app) e termina com código 0 | tests/MANUAL.md | manual | ok |
| C9-02 | check-matriz falha se um ID da matriz ficar sem teste | tests/meta/meta.test.ts | meta | ok |
| C9-03 | Um .skip em qualquer teste faz o lint falhar | tests/meta/meta.test.ts | meta | ok |
| C9-04 | Arquivo novo em tests/fixtures entra no teste de ida e volta sem mudar código | tests/meta/meta.test.ts | meta | ok |
| C9-05 | Caso novo em tests/golden/calculos.yaml vira teste sem mudar código | tests/meta/meta.test.ts | meta | ok |
| C9-06 | Mudar uma cor em tokens.css faz o teste visual falhar | tests/visual/telas.spec.ts | visual | ok |
| C9-07 | O relatório test-results/RELATORIO.md é gerado com as seções de C6 | tests/meta/meta.test.ts | meta | ok |
| C9-08 | O pre-commit roda `npm run test` e bloqueia commit com teste falhando | tests/meta/meta.test.ts | meta | ok |
| D6-01 | Fileira de abas de documento com top = 38 px e altura 32 px na tela inicial, caderno, folha, LaTeX e biblioteca | tests/e2e/abas.spec.ts | e2e | ok |
| D6-02 | Clicar em Início e depois na aba de um documento sem mover o mouse: a aba clicada não muda de lugar | tests/e2e/abas.spec.ts | e2e | ok |
| D6-03 | Ribbon com 124 px em todas as guias e em todos os tipos de documento | tests/e2e/abas.spec.ts | e2e | ok |
| D6-04 | Título de grupo do ribbon aparece inteiro, sem corte | tests/e2e/abas.spec.ts, tests/visual/telas.spec.ts | e2e, visual | ok |
| D6-05 | Aba Início só com o ícone de casa, 40 px de largura, sem botão de fechar | tests/e2e/abas.spec.ts | e2e | ok |
| D6-06 | Imagens aprovadas atualizadas com autorização do usuário, citando o ADENDO 04 no commit | tests/MANUAL.md | manual | ok |
| BUG-001 | Backspace numa linha vazia do caderno apagava também a linha de baixo | tests/regressao/bugs.spec.ts | e2e | ok |
| BUG-002 | Teclas digitadas logo depois de criar uma região na folha se perdiam | tests/regressao/bugs.spec.ts | e2e | ok |
| BUG-003 | O marcador de unidade juntava a unidade antiga ao que se digitava ("VmV") | tests/regressao/bugs.spec.ts | e2e | ok |
| BUG-004 | Pedir resultado com "=" perdia o "= ?" ao sair do campo | tests/regressao/bugs.spec.ts, tests/golden/teclado.yaml | e2e, browser | ok |
| BUG-005 | Na folha, "ir <nome>" não achava arquivo da mesma pasta sem projeto aberto (a pasta nunca era listada) | tests/regressao/bugs.spec.ts | e2e | ok |
| BUG-006 | Abrir um .prsm de 1 MB levava 728 ms: o editor de texto serializava o Markdown inteiro ao montar | tests/e2e/desempenho.spec.ts | e2e | ok |
| BUG-007 | O i imaginário da tela (mathbf{i}) voltava para o arquivo como "mathbf*i" | tests/golden/conversao.yaml | unit | ok |
| T01-01 | `.` solto no campo (`2.`, `x.`, `.`, `Relação.`, `batata.`) não trava o conversor: termina em menos de 100 ms, com resultado ou erro de sintaxe | src/format/mathlinear.test.ts | unit | ok |
| BUG-008 | Digitar `.` sem dígito depois (`2.`) travava o editor em laço infinito (átomo numérico sem progresso) | src/format/mathlinear.test.ts | unit | ok |
| T02-01 | Nome com dígito (`R1`, `I1`, `xy2pol`, `sys2mat`, `log10`) volta do campo sem virar produto: ida e volta idêntica | tests/golden/conversao.yaml | unit | ok |
| BUG-009 | Nome com dígito no campo matemático virava produto ao confirmar (`R1` gravava `R*1`) | tests/golden/conversao.yaml | unit | ok |
| T03-01 | Texto entre aspas mantém os espaços (inclusive repetidos) na ida e volta do campo | src/format/mathlinear.test.ts, tests/golden/conversao.yaml | unit | ok |
| BUG-010 | Texto entre aspas perdia os espaços ao confirmar a linha (`"3º Harmônica"` gravava `"3ºHarmônica"`) | tests/golden/conversao.yaml | unit | ok |
| F00-01 | Existe `npm run verify:rapido` (tipos, matriz, Vitest dos arquivos mudados, Playwright da folha e da regressão) | tests/meta/meta.test.ts | meta | ok |
| F00-02 | Os testes de desempenho C7-01 e C7-02 só rodam no `verify:full` e não foram apagados | tests/meta/meta.test.ts | meta | ok |
| F00-03 | O passo 4 do CLAUDE.md manda usar verify:rapido por ticket, verify no fim do lote e verify:full antes de push | tests/meta/meta.test.ts | meta | ok |
| BUG-011 | Região da folha só andava para a direita/baixo: `snap()` limitava o deslocamento do arrasto a >= 0; agora deslocamento negativo vale e só a posição final é limitada a >= 0 | tests/regressao/bugs.spec.ts | e2e | ok |
| BUG-012 | Arrastar 3 regiões selecionadas (x de 2 para 3 dígitos) move as 3 e o arquivo continua íntegro; antes corrompia: posições do texto calculadas antes da 1ª edição (ticket F02) | tests/regressao/bugs.spec.ts | e2e | ok |
| F03-01 | Folha: se a região nova não monta (folha somente leitura), o teclado da folha volta ao normal em até 2 s (`creating` com prazo) | tests/regressao/bugs.spec.ts | e2e | ok |
| F03-02 | Caderno: se a linha nova não monta (caderno somente leitura), `holdKeys` solta o teclado do app em até 1 s | tests/regressao/bugs.spec.ts | e2e | ok |
| BUG-013 | Teclado preso: `creating` da folha e `holdKeys` sem prazo engoliam as teclas para sempre quando o campo novo não montava | tests/regressao/bugs.spec.ts | e2e | ok |
| BUG-014 | Nome solto que coincide com unidade do math.js (`L`, `m`, `b`, `S`) é variável: `s := 10*L` com L indefinido fica em aberto (`10*L`) na folha e dá "Variável não definida: L" no caderno; não vira litro, metro nem bit | src/engine/engine.test.ts, tests/regressao/bugs.spec.ts | unit, e2e | ok |
| F04-01 | Digitar `9j` ou `2x` (número e letras sem `'`) grava multiplicação: `9*j`, `2*x`; `S:4mm^2` grava `S := 4*mm^2` | src/format/mathlinear.test.ts, tests/golden/teclado.yaml | unit, browser | ok |
| F04-02 | Unidade explícita: `número espaço unidade` continua unidade; unidade sem número ganha `'` (`x*'m`, `'A/100`) e faz ida e volta; `4'mm^2` grava `4 mm^2` | src/format/mathlinear.test.ts, tests/golden/teclado.yaml | unit, browser | ok |
| F04-03 | Unidade solta vinda do `.sm` (`style="unit"` sem número antes) grava `'unidade` na folha convertida | src/format/smath.test.ts | unit | ok |
| F04-04 | Arquivos antigos abrem iguais: o mesmo texto e o mesmo resultado (`L := 25 m`, `0.0179 Ω*mm^2/m`, `= ? mV`); `2 x` legado com x variável continua 2·x | src/engine/engine.test.ts, src/format/mathlinear.test.ts | unit | ok |
| A6-01 | ADENDO 06 06-01: `2+2=`, apagar o `2+2`, `s=` dá `s ≔ □`, sem `= 1 s` e sem segundo `=` (a avaliação apagada não deixa resto na linha) | tests/golden/teclado.yaml | browser | ok |
| A6-02 | ADENDO 06 06-02: `=` numa região que já é avaliação não cria outro `=` | tests/golden/teclado.yaml | browser | ok |
| A6-03 | ADENDO 06 06-03: `s=` com a unidade s e a variável s indefinida dá definição, com s variável (itálico) | tests/golden/teclado.yaml | browser | ok |
| A6-04 | ADENDO 06 06-04: apagar tudo numa avaliação deixa a região vazia, sem resultado e sem resto na linha | tests/golden/teclado.yaml | browser | ok |
| A6-05 | ADENDO 06 1.3: formato padrão do resultado igual ao SMath: 4 casas, sem zeros à direita (2·7 = 14, 1/3 = 0,3333, 3,2936 V) | tests/golden/calculos.yaml, src/engine/engine.test.ts | unit | ok |
