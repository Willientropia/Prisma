# Versões do Prisma

Cada versão tem uma tag `vX.Y.Z` no git com esta mesma descrição.

## v0.2.0 — 2026-11-11

Lote F1 da folha livre (docs/TICKETS-FOLHA.md). verify:full aprovado: 385 testes, nenhuma falha.

- **F01** Arrastar uma região para a esquerda ou para cima funciona. A posição final nunca passa da borda.
- **F02** Arrastar várias regiões selecionadas move todas juntas sem corromper o arquivo.
- **F03** O teclado não fica mais preso na folha quando o campo novo não monta. Há prazo de 2 s para criar a região e de 1 s para segurar teclas.
- **F04** Dentro da expressão, nome é sempre variável: `9j` é 9·j, e `L` ou `x` indefinidos dão "ainda não foi definido" em vez de virar unidade. Unidade só entra explícita: número espaço unidade (`5 m`), apóstrofo (`x*'m`), `= ? unidade` ou `to`/`in`. Arquivos antigos abrem igual. Unidade solta importada do SMath ganha o apóstrofo.

Pendente: unidade definida pelo usuário (F-U1) e assistente de unidades (A6-4).

## v0.1.0

Estado anterior ao versionamento (até o commit dc8a33c).
