# Fase 1: cofre e formato

> **Substituída pelo [ADENDO 01](../ADENDO-01-formatos-e-arquivos.md).** O cofre saiu; o Prisma passou a funcionar como programa CAD (extensões `.prsm/.prsf/.prsl/.prst/.prsp`, projetos, pastas do sistema, instalador). O que foi feito para o adendo está na seção "Refeito pelo ADENDO 01" no fim deste arquivo. O texto abaixo dela é o histórico da primeira versão.

## Plano (versão original, com cofre)

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

---

## Refeito pelo ADENDO 01

### O que mudou no código

- **Rust:** `vault.rs` saiu. Entraram:
  - `files.rs`: ler, gravar (atômico), `stat`, listar pasta, renomear, observar os arquivos abertos (observa a pasta de cada um, sem recursão). Só aceita caminho absoluto com extensão conhecida (`.prs*`, `.tex`, `.bib`, `.cls`, `.sty`, `.md`, `.txt`, `.gitignore`).
  - `project.rs`: criar projeto (pasta, `.prsp`, `calculos/`, `memorial/`, `bibliotecas/`, `.gitignore` com `.prisma-cache/`).
  - `appdata.rs`: `%APPDATA%\Prisma\config.yaml`, `%LOCALAPPDATA%\Prisma\recuperacao\`, `Documentos\Prisma\{Bibliotecas,Modelos,Skills}` na primeira execução, bibliotecas do usuário e de fábrica, arquivos passados na linha de comando.
  - `recent.rs`: `%APPDATA%\Prisma\recentes.json`, caminho absoluto, tipo e data, até 30.
  - `lib.rs`: `tauri-plugin-single-instance` (segundo duplo clique vira aba na janela aberta), `tauri-plugin-opener` (Mostrar no Explorador).
- **`tauri.conf.json`:** alvo `nsis`, `installMode: perMachine`, as 5 associações de arquivo, recursos `bibliotecas/` e `modelos/` de fábrica.
- **Formato:** `normalizeForSave` (UTF-8 sem BOM, LF), BOM aceito na leitura, `classifyFile` (tipo pelo cabeçalho; aviso se não bate com a extensão; `versao_formato` maior que 1 abre em somente leitura; modelo abre no editor do `modelo_de`).
- **Exemplos:** `resources/exemplos/Usina Boa Vista/` (projeto `.prsp`, `calculos/*.prsm|.prsf`, `memorial/memorial.tex`), `resources/bibliotecas/eletrica.prsl` (fábrica), `resources/modelos/dimensionamento-fv.prst`.
- **Store:** `store/app.ts` virou `store/workspace.ts` (`useWorkspace`): abas, documento ativo, projeto ativo opcional. `src/vault/` virou `src/platform.ts`.
- **Interface:** tela inicial sem cofre (5 cards com Projeto, Abrir... e Abrir projeto..., arquivos recuperados, projeto aberto, recentes com projetos e "não encontrado"); guias Estrutura/Projeto no painel esquerdo; árvore do projeto com menu de contexto; título com o projeto; caminho do arquivo na barra de status; diálogo Salvar / Não salvar / Cancelar; Inserir/Atualizar resultados desabilitados fora de projeto; `[[links]]` resolvidos pela regra do A6.

### Critérios A9

| # | Critério | Situação |
|---|---|---|
| 1 | Instalador NSIS em `C:\Program Files\Prisma\`, menu Iniciar | `npm run tauri build` gera `src-tauri/target/release/bundle/nsis/Prisma_0.1.0_x64-setup.exe` (3 MB, `perMachine`). Não instalado nesta máquina. |
| 2 | Duplo clique abre em aba; segundo duplo clique na mesma janela | Implementado (argumentos + single-instance). Só dá para testar instalado. |
| 3 | 5 tipos no Explorador com descrição e ícone | Configurado em `fileAssociations`. Só dá para testar instalado. |
| 4 | Novo → `Caderno1` sem gravar; Ctrl+S abre Salvar como com `.prsm` | Verificado no navegador. |
| 5 | Abrir e salvar os 5 exemplos sem mudar bytes | Teste automático (`doc.test.ts`) e no navegador. |
| 6 | CRLF + BOM abre e salva em UTF-8 sem BOM com LF | Teste automático e no navegador. |
| 7 | Criar projeto gera `.prsp`, pastas e `.gitignore`; mover a pasta continua funcionando | Criação: teste Rust e navegador. Portabilidade: o `.prsp` só guarda caminhos relativos; não testado movendo a pasta no Explorador. |
| 8 | Arquivo apagado aparece "não encontrado" no painel Projeto | Verificado no navegador. |
| 9 | Tela inicial sem "cofre"; recentes com projetos e arquivos sumidos | Verificado no navegador. |
| 10 | Primeira execução cria `Documentos\Prisma\...` | Implementado em `appdata::first_run`. Não executado nesta máquina. |
| 11 | `.prsm` legível no Bloco de Notas | Os arquivos são texto UTF-8 (YAML + Markdown); ver `resources/exemplos`. |
