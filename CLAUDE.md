# Prisma: instruções permanentes do agente

Lido em toda sessão, por qualquer modelo. Siga sempre.

## Como trabalhar (protocolo enxuto, decisão do usuário em 12/11: agilidade primeiro)

- Uma sessão, uma pasta, vários tickets em sequência. Sem worktree nova por ticket e sem sessão orquestradora: cada worktree custa 3 a 4 GB de disco e disputa a porta 1420.
- Tickets em `docs/TICKETS-FOLHA.md`. Leia só o ticket e os arquivos que ele cita; dos documentos, só a seção indicada (índice abaixo).
- Não varra o repositório. Para achar algo, use Grep ou o subagente `explorador`.
- Sonnet por padrão. Opus com plano só para desenho grande (ribbon, gráfico 2D, importação do `.sm`).
- Resposta final curta: o que mudou, arquivos, testes rodados. Sem recapitular passos.

## Índice dos documentos (na raiz)

SPEC · ADENDO-01 formatos · 02 edição visual · 03 testes · 04 abas · 05 semântica SMath ·
06 teclado/assistente/ribbon/gráficos · MANUTENCAO-01 engenharia · MANUTENCAO-02 robustez ·
`referencia-*.dc.html` (visual exato).
Conflito entre adendos: vale o de número maior. MANUTENCAO-* valem sempre e não mudam comportamento.

## Fluxo de cada ticket

1. Bug: primeiro o teste `BUG-<nº>` que falha, depois a correção na causa raiz. Funcionalidade: teste junto com o código (o essencial, não um por linha de tabela).
2. Durante o trabalho, rode direto na sessão só os testes ligados à mudança: `npx vitest related --run <arquivos>` e o spec do Playwright da área (`npx playwright test <arquivo>`). Sem subagente `testador` por ticket.
3. Anote em `CHANGELOG.md` (seção "Em andamento") uma linha do que mudou e do que ficou pendente. `tests/MATRIZ.md` e `docs/adendo-*.md` só quando muda comportamento combinado nos documentos; o `check-matriz` é aviso, não bloqueia.
4. Commit local `<ticket>: <resumo>`. O hook de pre-commit roda tipos e testes de unidade (segundos).
5. **Por versão, não por ticket:** quando o usuário pedir release ou push, rode `npm run verify:full`, o `revisor` no diff da versão e, se ele quiser, o Fable. Os achados viram uma lista para resolver de uma vez.
6. **Push só com autorização do usuário.**

## Proibido sem autorização explícita do usuário

- Apagar, pular (`.skip`, `.only`, `fixme`) ou enfraquecer teste: tolerância, valor esperado, imagem aprovada. Se achar que o teste está errado, explique e pergunte.
- Mudar cor, medida ou texto de interface fora dos documentos.
- Mudar o formato dos arquivos do usuário ou tocar nos `.sm` originais.
- Emoji ou caractere como ícone (exceção: símbolos matemáticos nos botões que os inserem, ADENDO 06, 4.7).
- Ajustar o motor para imitar o SMath sem entender a causa. Divergência: investigue e explique antes (ex.: `fft` e a variável `i` do laço, ADENDO 05). Em dúvida, escreva o experimento e peça ao usuário para rodar no SMath. Não chute.

## Regras de código

- `<button>`, `<input>`, `<select>` só em `src/components/`; componentes recebem props, não acessam o store.
- Respeitar `scripts/check-camadas.ts` quando existir (MANUTENCAO-01, M5). Prettier e knip limpos. Arquivo com mais de 300 linhas só com justificativa no topo.
- Laço de parser com avanço garantido ou guarda de progresso; recursão com limite de profundidade.
- Nada chamado a cada tecla demora mais que alguns milissegundos, para qualquer entrada.
- `window.addEventListener` sempre com remoção garantida e prazo.
- Cores só de `src/styles/tokens.css`. Interface em pt-BR; código em inglês (exceto termos do formato).
- Na tela nunca aparecem `:=`, `^`, `_` ou `?` dentro de expressões.
- Arquivos do usuário: UTF-8 sem BOM, LF, ida e volta byte a byte idêntica.