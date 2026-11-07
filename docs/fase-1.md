# Fase 1: cofre e formato

## Plano

- **Rust** (`src-tauri/src/vault.rs`, `recent.rs`): abrir pasta como cofre, criar `.prisma/config.yaml`, `.prisma/cache/` e `.gitignore` quando faltarem, listar arquivos, ler e gravar (gravação atômica: arquivo temporário e renomear), observar mudanças com `notify` e emitir `vault-changed`. Caminhos sempre relativos ao cofre, sem `..`. Recentes em `recent.json` no diretório de dados do app.
- **Seletor de pasta:** `tauri-plugin-dialog`.
- **Formato** (`src/format/`): um parser comum aos três `.md`: frontmatter YAML + sequência de segmentos (texto ou bloco cercado). Cada segmento guarda o texto original, então serializar sem editar devolve os mesmos bytes (CRLF, espaços e cercas de 4 crases incluídos).
- **Frontend** (`src/vault/`): a mesma API com duas implementações: Tauri (`invoke`) e memória (navegador, com os exemplos de `resources/exemplos/`), para desenvolver e testar a interface fora do app.
- **Interface:** tela inicial com árvore do cofre e recentes reais; Novo cria arquivo no cofre; os quatro editores passam a ler os arquivos (estrutura, variáveis, funções da biblioteca, seções do `.tex`). Renderização matemática e cálculo ficam para a fase 2.
- **Mudança externa:** se o arquivo aberto muda fora do app e não há edição pendente, recarrega; se há, pergunta.

## Aceite

Os exemplos da seção 3 abrem e salvam sem alterar nenhum byte; editar o arquivo num editor externo atualiza o app.

## Feito

- `src/format/doc.ts`: parse/serialize por segmentos. Testes (`doc.test.ts`) fazem ida e volta dos três exemplos em LF, CRLF e sem quebra final, mais casos de borda (cerca sem fechamento, cerca de 4 crases contendo de 3, `~~~`, YAML inválido).
- `src/format/views.ts`: estrutura do caderno, variáveis, ordem (y, x) da folha, funções da biblioteca, seções do `.tex`.
- Rust: `vault.rs` (abrir, listar, ler, gravar atômico, observar com `notify`, criar `.prisma/` e `.gitignore`) e `recent.rs`. Testes com `cargo test`: caminhos fora do cofre recusados, layout idempotente, gravação preserva bytes.
- `src/vault/`: API única; no navegador usa `resources/exemplos/` em memória, e `prismaDev.write(caminho, texto)` no console simula uma edição externa.
- Tela inicial: abrir cofre, árvore (arquivos antes das subpastas), recentes reais, Novo cria `sem-titulo.<tipo>` no cofre.
- Editores mostram o conteúdo real: caderno (página com texto e blocos, estrutura, propriedades), folha (regiões nas posições, variáveis), biblioteca (funções, parâmetros, constantes, testes listados), LaTeX (código com números de linha e realce mínimo, seções numeradas, arquivos do projeto).
- Ctrl+S grava `serialize(parse(texto))`. Mudança externa: recarrega se não há edição pendente; com edição, pergunta (`confirm`).
- Verificado no navegador: abrir os quatro exemplos, edição externa atualizando o caderno aberto, salvar sem alterar bytes.

## Pendente

- Testar no app desktop (`npm run tauri dev`) com uma pasta real: seletor de pasta, observação de arquivos pelo `notify` e recentes persistidos. O Rust compila e os testes dele passam, mas a janela não foi aberta.
- Edição de conteúdo e autossalvar (2 s) chegam com o editor da fase 2; até lá não há edição pendente, então o caminho "perguntar" não é exercitado.
- Markdown renderizado (remark) e `[[links]]` clicáveis: fase 2.
- Gerar `#id` quando o bloco não tem: só faz sentido quando o app editar blocos (fase 2), para não mudar bytes ao salvar.
- Versão das bibliotecas em uso no caderno: fase 4.
