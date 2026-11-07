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
| Fase 3: folha livre | F3 | em andamento |
| Fase 4: bibliotecas | F4 | futura |
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
| F3-02 | A folha string-3 mostra ATENÇÃO | | e2e | pendente |
| F3-03 | O gráfico da string-3 tem a linha de limite | tests/e2e/folha.spec.ts | e2e | ok |
| F3-04 | Regiões são arrastadas pela moldura com encaixe na grade de 20 px | tests/e2e/folha.spec.ts | e2e | ok |
| F3-05 | A folha é avaliada por posição (y, depois x) | src/format/doc.test.ts, tests/e2e/folha.spec.ts | unit, e2e | ok |
| F3-06 | Tabela de variáveis com nome, valor e unidade | tests/e2e/folha.spec.ts | e2e | ok |
| F3-07 | Linha de comando aceita "ir <arquivo>" | tests/e2e/folha.spec.ts | e2e | ok |
| F4-01 | Bibliotecas .prsl são carregadas e usadas no cálculo | tests/e2e/caderno.spec.ts | e2e | ok |
| F4-02 | `salvar=` grava a função na biblioteca indicada | | e2e | pendente |
| F4-03 | Função salva no caderno aparece na biblioteca e na folha | | e2e | pendente |
| F4-04 | Os testes de eletrica.prsl passam na guia Testes | | e2e | pendente |
| F4-05 | Tela de biblioteca com assinatura, fórmula, parâmetros e testes | tests/e2e/biblioteca.spec.ts | e2e | ok |
| F4-06 | Busca de função (Ctrl+K e "Inserir função") | | e2e | pendente |
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
