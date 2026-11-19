# Folha livre: o que falta para igualar o SMath no uso do usuário (F13)

Levantamento de 19/11/2026, feito no `src/editors/folha/Folha.tsx` (v0.9.0) contra o ADENDO 05.
Cada item vira um ticket F14+ em `docs/TICKETS-FOLHA.md`.

Legenda da coluna "Situação":
- **existe**: já funciona no Prisma.
- **falta**: o Prisma não tem.
- **conferir**: não sei com certeza como o SMath faz. Não implementar antes de o usuário conferir no SMath e anotar aqui o comportamento (CLAUDE.md: "Não chute").

## 1. Seleção

| # | Item | Situação | Observação |
|---|------|----------|------------|
| S1 | Clique numa região seleciona só ela | existe | |
| S2 | Arrastar na área vazia seleciona por retângulo | existe | Hoje basta encostar no retângulo. **Conferir:** no SMath a região precisa estar inteira dentro ou basta encostar? |
| S3 | `Ctrl+clique` acrescenta ou tira uma região da seleção | falta | Hoje todo clique troca a seleção |
| S4 | Retângulo com `Ctrl` soma à seleção atual | falta, conferir | Hoje o retângulo sempre substitui |
| S5 | `Ctrl+A` seleciona todas as regiões | falta | Só com o foco na folha, sem região em edição |
| S6 | `Esc` limpa a seleção e a cruz | existe | |
| S7 | `Shift+clique` | conferir | Não sei se o SMath faz algo diferente do `Ctrl+clique` |

## 2. Arrasto e posição

| # | Item | Situação | Observação |
|---|------|----------|------------|
| A1 | Arrastar uma ou várias regiões, com encaixe na grade e parada no grupo junto à borda | existe | F01, F02, F-LAYOUT 1 |
| A2 | Por onde se pega a região para arrastar | conferir | Hoje só pela moldura (`e.target === e.currentTarget`). No SMath, pegar a região selecionada em qualquer ponto também arrasta? |
| A3 | Rolagem automática ao arrastar perto da borda da janela | falta | Hoje não dá para levar uma região para fora da parte visível de uma vez |
| A4 | `Ctrl+arrastar` duplica as regiões | conferir | |
| A5 | Mover as selecionadas pelo teclado | conferir | No SMath as setas movem a cruz; não sei se movem regiões selecionadas |
| A6 | Inserir e remover linha (empurra para baixo, ou puxa para cima, tudo o que está abaixo da cruz) | falta, conferir | Atalho e menu a conferir no SMath. Muito usado para abrir espaço numa folha pronta |
| A7 | Separar regiões sobrepostas | falta | Pendente do F-LAYOUT 4 (precisa de plano aprovado) |
| A8 | Folha cresce sozinha quando há região perto do fim da página | conferir | Hoje a altura vem de `pagina.altura` (padrão 1600 px) e não muda |

## 3. Copiar, recortar e colar

| # | Item | Situação | Observação |
|---|------|----------|------------|
| C1 | `Ctrl+C` / `Ctrl+X` nas regiões selecionadas | falta | Não há área de transferência de regiões na folha |
| C2 | `Ctrl+V` cola na cruz, mantendo as distâncias entre as regiões | falta | Sem cruz, colar abaixo da última região (a conferir no SMath) |
| C3 | Ids novos ao colar (`calc-7` não pode repetir) e atributos mantidos (moldura, desativado, casas, descrição) | falta | `nextId` já existe |
| C4 | Colar entre duas folhas abertas, e de uma folha para o caderno | falta | Formato na área de transferência: os blocos do próprio arquivo, que já são texto |
| C5 | Colar texto puro de fora (ex.: `x := 2` de um e-mail) cria uma região | conferir | |
| C6 | Recortar, Copiar, Colar e Apagar no menu do botão direito | falta | O menu hoje só tem desativar, moldura, formato, descrição e alinhar |
| C7 | Copiar um resultado como texto (ex.: `20 V`) | conferir | |

## 4. Desfazer

| # | Item | Situação | Observação |
|---|------|----------|------------|
| D1 | `Ctrl+Z` / `Ctrl+Y` no documento (digitação, mover, moldura, apagar) | existe | `src/store/historico.ts`, 200 passos |
| D2 | Desfazer colar e recortar em um passo | falta | Depende do C1 e C2 |
| D3 | Depois de desfazer, a seleção e a cruz voltam para a região afetada | falta | Hoje só o texto volta; a seleção fica onde estava |
| D4 | `Ctrl+Z` dentro de uma região em edição desfaz a digitação daquela linha, não o documento | conferir | Escrever o teste de navegador primeiro para ver o que acontece hoje |

## 5. Áreas

| # | Item | Situação | Observação |
|---|------|----------|------------|
| R1 | Criar área com as selecionadas, recolher, travar e renomear | existe | E6 |
| R2 | Quem pertence à área | falta | **Diferença importante.** No Prisma a área vale pela ordem no arquivo (blocos entre `area` e `fim-area`); na tela ela é uma faixa por posição. Região nova criada dentro da faixa vai para o fim do arquivo e fica fora da área (não some ao recolher). Região arrastada para fora da faixa continua dentro. A conferir no SMath: lá a área é tudo o que está entre as duas linhas? |
| R3 | Arrastar a área (pela linha de título) leva junto as regiões de dentro | falta | A linha de título não tem arrasto |
| R4 | Mudar a altura da área (arrastar a linha de baixo) | falta, conferir | |
| R5 | Desfazer a área (tirar as linhas e deixar as regiões) | falta | Hoje só editando o fonte |
| R6 | Apagar a área com o conteúdo | conferir | |

## 6. Teclado na folha (cruz, sem região em edição)

| # | Item | Situação | Observação |
|---|------|----------|------------|
| K1 | Digitar na cruz cria região; `"` cria texto; `@` cria gráfico | existe | |
| K2 | `Enter` confirma e põe a cruz abaixo; `Shift+Enter` cria a região abaixo | existe | |
| K3 | `Enter` com a cruz desce uma linha da grade | existe | F-LAYOUT 2 |
| K4 | Setas movem a cruz pela grade | falta | Hoje as setas não fazem nada na folha |
| K5 | Setas saindo de uma região em edição (no começo ou no fim da linha) vão para a região vizinha | conferir | |
| K6 | `Tab` / `Shift+Tab` percorrem as regiões na ordem de leitura | conferir | |
| K7 | `Delete` / `Backspace` apagam as selecionadas | existe | |
| K8 | `PageUp` / `PageDown`, `Ctrl+Home` / `Ctrl+End` | conferir | |
| K9 | Zoom da folha (`Ctrl` + roda do mouse) | falta, conferir | Não há zoom na folha; só a escala por documento (F-LAYOUT 4) |

## 7. Formatação

| # | Item | Situação | Observação |
|---|------|----------|------------|
| F1 | Formato do resultado por documento e por região | existe | F-CONFIG |
| F2 | Moldura, descrição e desativar | existe | A moldura vale para a seleção toda; desativar e descrição, só para a região clicada |
| F3 | Desativar e descrição aplicados a todas as selecionadas | falta | Mesmo padrão da moldura (`menuIds`) |
| F4 | Texto: negrito, itálico, tamanho e listas | existe, conferir | TipTap. Conferir no SMath o que mais o usuário usa (cor do texto, alinhamento) |
| F5 | Cor de fundo e cor da fonte de uma região | conferir | Se o SMath tiver e o usuário usar; cores só de `tokens.css` |
| F6 | Largura da região de texto ajustável (quebra de linha) | conferir | |
| F7 | Tabela importada do SMath mostra os dados | falta | Hoje aparece "Tabela importada do SMath (os dados ainda não são mostrados)" |

## Ordem sugerida para os tickets

1. **Copiar, recortar e colar** (C1, C2, C3, C6, D2): é o que mais falta no uso diário.
2. **Seleção** (S3, S5) e **setas movendo a cruz** (K4): pequenos e sem dúvida de comportamento.
3. **Desativar e descrição na seleção toda** (F3): pequeno.
4. **Áreas por posição** (R2, R3, R5): precisa de decisão do usuário, porque muda como a área é guardada no arquivo.
5. **Inserir e remover linha** (A6) e **rolagem no arrasto** (A3).
6. Os itens **conferir**, depois de o usuário anotar o comportamento do SMath.
