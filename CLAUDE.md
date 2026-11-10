# Prisma: instruções permanentes do agente

Lido em toda sessão, por qualquer modelo. Siga sempre.

## Como trabalhar (economia de contexto)

- Uma sessão = um ticket de `docs/TICKETS.md`. Leia só esse ticket e os arquivos que ele cita.
- Não leia documentos inteiros. Abra só a seção que o ticket indica (use o índice abaixo).
- Não varra o repositório. Para achar algo, use o subagente `explorador`.
- Testes sempre pelo subagente `testador`. Não rode a suíte na sessão principal.
- Tickets marcados [R]: passe o diff pelo `revisor` antes do commit.
- Resposta final curta: o que mudou, arquivos, resultado do `testador`. Sem recapitular passos.

## Índice dos documentos (na raiz)

SPEC · ADENDO-01 formatos · 02 edição visual · 03 testes · 04 abas · 05 semântica SMath ·
06 teclado/assistente/ribbon/gráficos · MANUTENCAO-01 engenharia · MANUTENCAO-02 robustez ·
`referencia-*.dc.html` (visual exato).
Conflito entre adendos: vale o de número maior. MANUTENCAO-* valem sempre e não mudam comportamento.

## Fluxo de cada ticket

1. Registrar o critério de aceite em `tests/MATRIZ.md` (com ID).
2. Escrever primeiro o teste que falha. Bug ganha teste `BUG-<nº>`; travamento vai para `tests/regressao/` e, se for de parser, vira caso fixo no fuzz.
3. Corrigir a causa raiz.
4. `testador` com `npm run verify`. `verify:full` só ao fechar um lote.
5. Só dizer que terminou com tudo verde, testes antigos incluídos.
6. Anotar em `docs/` o que foi feito e o que ficou pendente (uma ou duas linhas).
7. Commit local `T<nº>: <resumo>`. **Push só com autorização do usuário.**

## Proibido sem autorização explícita do usuário

- Apagar, pular (`.skip`, `.only`, `fixme`) ou enfraquecer teste: tolerância, valor esperado, imagem aprovada. Se achar que o teste está errado, explique e pergunte.
- Mudar cor, medida ou texto de interface fora dos documentos.
- Mudar o formato dos arquivos do usuário ou tocar nos `.sm` originais.
- Emoji ou caractere como ícone (exceção: símbolos matemáticos nos botões que os inserem, ADENDO 06, 4.7).
- Ajustar o motor para imitar o SMath sem entender a causa. Divergência: investigue e explique antes (ex.: `fft` e a variável `i` do laço, ADENDO 05). Em dúvida, escreva o experimento e peça ao usuário para rodar no SMath. Não chute.

## Regras de código

- `<button>`, `<input>`, `<select>` só em `src/components/`; componentes recebem props, não acessam o store.
- Respeitar `scripts/check-camadas.ts`. Prettier e knip limpos. Arquivo com mais de 300 linhas só com justificativa no topo.
- Laço de parser com avanço garantido ou guarda de progresso; recursão com limite de profundidade.
- Nada chamado a cada tecla demora mais que alguns milissegundos, para qualquer entrada.
- `window.addEventListener` sempre com remoção garantida e prazo.
- Cores só de `src/styles/tokens.css`. Interface em pt-BR; código em inglês (exceto termos do formato).
- Na tela nunca aparecem `:=`, `^`, `_` ou `?` dentro de expressões.
- Arquivos do usuário: UTF-8 sem BOM, LF, ida e volta byte a byte idêntica.