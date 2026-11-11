# Prisma: instruções permanentes para o Claude Code

Este arquivo é lido automaticamente em toda sessão. Siga sempre.

## Documentos do projeto (fonte da verdade)

1. `SPEC.md`: especificação base.
2. `ADENDO-01-formatos-e-arquivos.md`: substitui partes do SPEC (formatos `.prsm/.prsf/.prsl/.prst/.prsp`, modelo CAD, sem cofre).
3. `ADENDO-02-edicao-matematica-visual.md`: edição 100 % visual, estilo SMath.
4. `ADENDO-03-testes-automatizados.md`: testes e regressão.
5. `referencia-design.dc.html`: referência visual exata.

Quando dois documentos conflitarem, vale o de número maior. Adendos novos seguem a mesma regra.

## Fluxo obrigatório de toda tarefa

1. Ler os trechos dos documentos que tratam da tarefa.
2. Antes de codar, registrar em `tests/MATRIZ.md` os critérios de aceite da tarefa (com ID).
3. Implementar **junto com os testes**. Bug corrigido sempre ganha um teste `BUG-<nº>` que falhava antes da correção.
4. Rodar `npm run verify:rapido` por ticket; `npm run verify` no fim do lote; `npm run verify:full` antes de push (inclui o app real e os testes de desempenho C7-01 e C7-02). Resumo: verify:rapido por ticket; verify no fim do lote; verify:full antes de push.
5. Só dizer que terminou se o comando passou **inteiro**, com todos os testes antigos. Mostrar o resumo de `test-results/RELATORIO.md` no fim da resposta.
6. Atualizar `docs/fase-N.md` (ou `docs/adendo-N.md`) com o que foi feito e o que ficou pendente.

## Proibido sem autorização explícita do usuário

- Apagar ou pular teste (`.skip`, `.only`, `fixme`), aumentar tolerância, trocar valor esperado ou atualizar imagem aprovada para fazer um teste passar.
- Mudar cor, medida ou texto de interface fora do que os documentos dizem.
- Mudar o formato dos arquivos do usuário.
- Usar emoji ou caractere como ícone na interface.

Se um teste antigo quebrar, corrigir o código. Se você acha que o teste está errado, explique o motivo e pergunte antes de mexer.

## Lembretes rápidos

- Cores só de `src/styles/tokens.css`.
- Interface em português do Brasil; código em inglês, exceto termos do formato de arquivo.
- Na tela nunca aparece `:=`, `^`, `_` ou `?` dentro de expressões (Adendo 02).
- Arquivos do usuário: UTF-8 sem BOM, LF, ida e volta byte a byte idêntica.
