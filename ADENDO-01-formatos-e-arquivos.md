# ADENDO 01: formatos próprios e modelo de arquivos estilo CAD

Este adendo **substitui** a seção 3.1 do SPEC.md (estrutura do cofre) e as extensões da tabela da seção 3. Também altera as seções 5.2, 7, 9, 10 e 12 nos pontos listados aqui. O que não for citado neste adendo continua valendo como está no SPEC.md.

Resumo da mudança: **o conceito de "cofre" sai**. O Prisma passa a funcionar como um programa CAD. Ele é instalado em Arquivos de Programas, tem extensões próprias registradas no sistema e abre arquivos soltos de qualquer pasta. Quando arquivos precisam se referenciar, eles fazem parte de um **projeto**. O conteúdo dos arquivos continua em **texto puro** (cabeçalho YAML + Markdown + blocos de cálculo), exatamente como na seção 3.2 a 3.8 do SPEC, para que IAs e o Git consigam ler.

---

## A1. Extensões

| Tipo | Extensão | Nome no sistema | MIME |
|---|---|---|---|
| Caderno | `.prsm` | Caderno Prisma | `application/x-prisma-caderno` |
| Folha livre | `.prsf` | Folha livre Prisma | `application/x-prisma-folha` |
| Biblioteca | `.prsl` | Biblioteca Prisma | `application/x-prisma-biblioteca` |
| Modelo | `.prst` | Modelo Prisma | `application/x-prisma-modelo` |
| Projeto | `.prsp` | Projeto Prisma | `application/x-prisma-projeto` |
| Documento LaTeX | `.tex` | (não registrar: continua do editor padrão do usuário) | |

Não usar a extensão `.prisma`: ela pertence ao Prisma ORM e causaria conflito no Windows e no VS Code.

### Regras de conteúdo (todas as extensões Prisma)

- UTF-8 **sem BOM**, quebra de linha **LF**. Ao abrir, aceitar CRLF e BOM, mas sempre salvar em UTF-8 sem BOM com LF.
- Primeira linha do arquivo é `---` (início do cabeçalho YAML).
- O campo `tipo` do cabeçalho **precisa bater com a extensão**: `.prsm` → `caderno`, `.prsf` → `folha`, `.prsl` → `biblioteca`, `.prst` → `modelo`, `.prsp` → `projeto`. Se não bater, abrir mesmo assim pelo tipo do cabeçalho e mostrar aviso na barra de status: `O tipo do arquivo (folha) não corresponde à extensão .prsm.`
- `versao_formato: 1` obrigatório. Arquivo com versão maior que a suportada abre em **somente leitura**, com aviso.
- Corpo de `.prsm`, `.prsf` e `.prsl`: idêntico às seções 3.3 a 3.7 do SPEC. Só muda a extensão.

### Modelo `.prst`

Um modelo de caderno, folha ou biblioteca é **um único arquivo** `.prst` com o corpo do tipo-base e campos extras no cabeçalho:

```yaml
---
tipo: modelo
modelo_de: caderno          # caderno | folha | biblioteca
nome: Dimensionamento FV
descricao: Da fatura do cliente ao número de módulos e strings.
cor: "#6d28d9"              # cor da miniatura na tela inicial
campos:
  - {id: cliente, rotulo: Cliente}
  - {id: potencia, rotulo: Potência instalada, unidade: kWp}
versao_formato: 1
---
(corpo igual ao de um caderno, com {{cliente}} e {{potencia}} onde forem usados)
```

Modelos de **documento LaTeX** continuam sendo uma pasta (`modelo.yaml` + `.tex` + `.cls` + `.bib`), como na seção 3.9 do SPEC, porque envolvem vários arquivos.

---

## A2. Projeto `.prsp`

Um projeto é um arquivo `.prsp` dentro de uma pasta. Ele lista o que faz parte do projeto. É o equivalente ao Sheet Set do AutoCAD.

```yaml
---
tipo: projeto
nome: Usina Boa Vista
cliente: (opcional)
arquivos:                       # caminhos relativos à pasta do .prsp, com barra /
  - calculos/cabos-cc.prsm
  - calculos/geracao-mensal.prsm
  - calculos/string-3.prsf
documentos:
  - memorial/memorial.tex
bibliotecas:                    # bibliotecas locais do projeto (opcional)
  - bibliotecas/eletrica-boa-vista.prsl
versao_formato: 1
---

Notas livres do projeto em Markdown (opcional).
```

Estrutura típica de pasta (o usuário escolhe os nomes; o app só sugere esta ao criar um projeto novo):

```
Usina Boa Vista/
├── usina-boa-vista.prsp
├── calculos/
│   ├── cabos-cc.prsm
│   ├── geracao-mensal.prsm
│   └── string-3.prsf
├── memorial/
│   ├── memorial.tex
│   ├── referencias.bib
│   └── figuras/
├── bibliotecas/
│   └── eletrica-boa-vista.prsl
└── .prisma-cache/               # gerado pelo app, descartável
    ├── resultados/              # resultados calculados por arquivo (JSON)
    └── tex/resultados.tex       # instantâneo para o LaTeX (seção 3.8 do SPEC)
```

Regras:

- Ao criar um projeto, o app gera também um `.gitignore` na pasta com a linha `.prisma-cache/`. Se já existir `.gitignore`, só acrescenta a linha se ela não estiver lá.
- Adicionar arquivo ao projeto: menu de contexto no painel Projeto → "Adicionar arquivo existente" ou "Novo arquivo no projeto". O app só grava caminhos **relativos**. Arquivo fora da pasta do projeto é permitido (`../outra-pasta/x.prsm`), mas o app avisa que o projeto deixa de ser portátil.
- Se um arquivo listado não existir mais, ele aparece no painel Projeto em `--error-text` com o rótulo `não encontrado`, e as opções "Localizar..." e "Remover do projeto".
- Um arquivo pode estar em mais de um projeto.

---

## A3. Pastas do sistema (Windows; equivalentes em macOS e Linux via APIs do Tauri)

| O quê | Onde | API do Tauri |
|---|---|---|
| Programa | `C:\Program Files\Prisma\` | instalador NSIS em modo `perMachine` |
| Configurações | `%APPDATA%\Prisma\config.yaml` | `appConfigDir()` |
| Recentes | `%APPDATA%\Prisma\recentes.json` (máx. 30 itens: caminho absoluto, tipo, data) | `appConfigDir()` |
| Recuperação de arquivos não salvos | `%LOCALAPPDATA%\Prisma\recuperacao\` | `appLocalDataDir()` |
| Cache de arquivo solto (fora de projeto) | `%LOCALAPPDATA%\Prisma\cache\<hash-do-caminho>\` | `appLocalDataDir()` |
| Bibliotecas do usuário | `Documentos\Prisma\Bibliotecas\` | `documentDir()` |
| Modelos do usuário | `Documentos\Prisma\Modelos\` | `documentDir()` |
| Skills geradas | `Documentos\Prisma\Skills\prisma-arquivos\` | `documentDir()` |
| Bibliotecas e modelos de fábrica | `resources/` dentro do programa (somente leitura) | `resourceDir()` |

Na primeira execução, o app cria `Documentos\Prisma\` com as três subpastas, se não existirem. Ele nunca apaga nada lá.

### Ordem de busca de bibliotecas

1. Bibliotecas locais do projeto (`bibliotecas:` do `.prsp`), se o arquivo estiver aberto dentro de um projeto.
2. `Documentos\Prisma\Bibliotecas\`.
3. Bibliotecas de fábrica (`resources/bibliotecas/`).

Se duas bibliotecas tiverem o mesmo `id`, vence a primeira na ordem acima, e o painel "Bibliotecas em uso" mostra um aviso com as duas origens.

---

## A4. Ciclo de vida de um arquivo (comportamento de CAD)

- **Novo**: cria o documento só em memória com nome provisório `Caderno1`, `Folha1`, `Biblioteca1`, `Documento1` (numeração crescente por sessão). A aba mostra o nome com um asterisco quando há alterações: `Caderno1*`.
- **Primeiro salvar** (Ctrl+S num documento novo): abre "Salvar como" com a extensão certa já selecionada. Pasta padrão: a do projeto ativo; sem projeto, `Documentos\Prisma\`.
- **Autossalvar**: só para arquivos que já existem em disco (2 s depois da última edição, como no SPEC). Documento novo nunca salvo vai para `recuperacao\` a cada 30 s.
- **Fechar com alterações**: diálogo "Salvar alterações em Caderno1?" com Salvar, Não salvar e Cancelar.
- **Reabrir após travamento**: se houver arquivos em `recuperacao\`, a tela inicial mostra o bloco "Arquivos recuperados", com Abrir e Descartar.
- **Mudança externa** (Git, Claude, outro editor): igual ao SPEC (recarrega se não houver edição pendente; senão pergunta).

---

## A5. Registro no sistema e abertura por duplo clique

No `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "targets": ["nsis"],
    "windows": { "nsis": { "installMode": "perMachine" } },
    "fileAssociations": [
      { "ext": ["prsm"], "name": "Caderno Prisma",      "description": "Caderno Prisma",      "mimeType": "application/x-prisma-caderno",    "role": "Editor" },
      { "ext": ["prsf"], "name": "Folha livre Prisma",  "description": "Folha livre Prisma",  "mimeType": "application/x-prisma-folha",      "role": "Editor" },
      { "ext": ["prsl"], "name": "Biblioteca Prisma",   "description": "Biblioteca Prisma",   "mimeType": "application/x-prisma-biblioteca", "role": "Editor" },
      { "ext": ["prst"], "name": "Modelo Prisma",       "description": "Modelo Prisma",       "mimeType": "application/x-prisma-modelo",     "role": "Editor" },
      { "ext": ["prsp"], "name": "Projeto Prisma",      "description": "Projeto Prisma",      "mimeType": "application/x-prisma-projeto",    "role": "Editor" }
    ]
  }
}
```

Confira os nomes exatos das chaves na documentação da versão do Tauri 2 instalada no projeto; se alguma tiver mudado, ajuste mantendo os mesmos valores.

- **Ícone dos arquivos (v1)**: todos usam o ícone do aplicativo. Ícones diferentes por tipo ficam para uma versão futura.
- **Instância única**: usar `tauri-plugin-single-instance`. Se o Prisma já estiver aberto e o usuário der duplo clique em outro arquivo, o arquivo abre como **nova aba na janela existente**, e a janela vem para frente.
- **Argumentos de linha de comando**: `prisma.exe caminho\arquivo.prsm` abre o arquivo. Vários caminhos abrem várias abas. Um `.prsp` abre o projeto (painel Projeto ativo) e não abre os arquivos dele automaticamente.
- **Filtros do diálogo Abrir**: "Arquivos Prisma (*.prsm, *.prsf, *.prsl, *.prst, *.prsp)", depois um filtro por tipo, depois "Documentos LaTeX (*.tex)" e "Todos os arquivos (*.*)".

---

## A6. Mudanças na interface

### Tela inicial (substitui a seção "Cofre" que existe hoje)

- **Remover** o bloco "Cofre" e o botão "Abrir pasta como cofre".
- Seção **Novo**: os 4 cards atuais (Caderno, Folha livre, Documento LaTeX, Biblioteca) + um 5º card **Projeto** (cor `--type-inicio`, ícone `tree`, descrição: "Agrupa arquivos que se referenciam, como um memorial e seus cálculos.").
- Logo abaixo dos cards, dois botões secundários lado a lado: **Abrir...** (Ctrl+O) e **Abrir projeto...**.
- **Recentes**: inclui projetos. Colunas continuam Nome, Tipo, Pasta, Modificado; a coluna Pasta mostra o caminho da pasta encurtado (`...\Sol Tech\Boa Vista\calculos`), com o caminho completo no `title`. Arquivo que não existe mais aparece com o texto em `--text-dim` e "não encontrado" na coluna Modificado; clicar oferece "Remover da lista".
- Selo de tipo para projeto: `PRJ` com fundo `--type-inicio`.

### Painel esquerdo com projeto aberto

Quando o documento ativo pertence a um projeto aberto, o painel esquerdo ganha **duas guias no topo** (32 px, mesmo estilo das guias do ribbon):

- **Estrutura**: o painel específico do tipo (seção 7 do SPEC), sem mudança.
- **Projeto**: árvore do `.prsp` com três grupos: Arquivos, Documentos, Bibliotecas. Duplo clique abre o arquivo em aba. Botão direito: Abrir, Renomear, Remover do projeto, Mostrar no Explorador.

Sem projeto, o painel mostra só o conteúdo de Estrutura, sem as guias.

### Barra de título e barra de status

- O título central passa a ser `Prisma 2026 | Usina Boa Vista | cabos-cc.prsm` quando há projeto, e `Prisma 2026 | cabos-cc.prsm` quando não há.
- Barra de status: acrescentar à direita, antes de `Unidades: SI`, o caminho do arquivo encurtado.

### LaTeX sem projeto

`\resultado` e `\figura` só funcionam se o `.tex` estiver listado em `documentos:` de um projeto aberto. Fora de um projeto, os botões **Inserir resultado** e **Atualizar resultados** ficam desabilitados, com a dica: `Adicione este documento a um projeto para inserir resultados.` A lista "Resultados disponíveis" mostra os resultados de todos os arquivos do projeto.

### Links entre arquivos

`[[nome]]` e `[[nome#id]]` resolvem assim, nesta ordem:

1. Arquivo com esse nome (sem extensão) no mesmo projeto.
2. Arquivo com esse nome na mesma pasta do arquivo atual.
3. Caminho relativo explícito: `[[../calculos/cabos-cc.prsm#trecho]]`.

Link que não resolve aparece sublinhado em `--error-text`, com a dica "Arquivo não encontrado".

---

## A7. Skill para IA (ajuste da seção 9 do SPEC)

- Saída: `Documentos\Prisma\Skills\prisma-arquivos\` (não mais dentro do cofre).
- O `SKILL.md` gerado precisa dizer, logo no começo, que os arquivos `.prsm`, `.prsf`, `.prsl`, `.prst` e `.prsp` são **texto UTF-8** (YAML + Markdown) e devem ser lidos e escritos como texto.
- Incluir a tabela da seção A1 e o exemplo de `.prsp` da seção A2.
- O `description` do frontmatter da skill passa a ser: `Cria, edita e resume arquivos do Prisma (.prsm, .prsf, .prsl, .prst, .prsp) e documentos LaTeX que usam o pacote prisma.`

---

## A8. O que mudar no código que já existe

1. **Renomear o conceito**: tudo que se chama `vault`/`cofre` vira `project`/`projeto` (projeto opcional) ou `workspace` (estado de abas e arquivos abertos). Em especial:
   - `src-tauri/src/vault.rs` → dividir em `files.rs` (abrir, salvar, observar um arquivo) e `project.rs` (ler e gravar `.prsp`, resolver caminhos relativos).
   - Store Zustand `vault` → `workspace` (abas, documento ativo, projeto ativo opcional).
   - Remover a criação automática de `.prisma/` e `config.yaml` dentro de pastas do usuário. A configuração vai para `appConfigDir()`.
2. **Extensões**: trocar toda referência a `.caderno.md`, `.folha.md` e `.lib.md` por `.prsm`, `.prsf` e `.prsl`, incluindo exemplos, testes, fixtures e filtros de diálogo. Hoje o recente aparece como `sem-titulo.caderno.md`; depois da mudança, um caderno novo aparece como `Caderno1` até ser salvo, e depois com o nome escolhido e a extensão `.prsm`.
3. **Parser**: escolher o tipo pelo campo `tipo` do cabeçalho (com o aviso da seção A1 se divergir da extensão). O parse/serialize simétrico do SPEC continua obrigatório.
4. **Tela inicial**: aplicar a seção A6.
5. **Recentes**: mover para `%APPDATA%\Prisma\recentes.json`, guardando caminho absoluto.
6. **Instalador e associações**: aplicar a seção A5.

---

## A9. Novos critérios de aceite (substituem os da Fase 1)

A Fase 1 só está pronta quando **todos** passarem:

1. `npm run tauri build` gera um instalador NSIS. Instalado, o Prisma fica em `C:\Program Files\Prisma\` e aparece no menu Iniciar.
2. Duplo clique num `.prsm` no Explorador abre o Prisma com o arquivo em aba. Com o Prisma já aberto, o segundo duplo clique abre outra aba na mesma janela.
3. Os 5 tipos aparecem no Explorador com a descrição certa ("Caderno Prisma" etc.) e o ícone do app.
4. Novo → Caderno cria `Caderno1` sem gravar nada em disco. Ctrl+S abre "Salvar como" com `.prsm` selecionado.
5. Abrir e salvar sem editar cada arquivo de exemplo (`.prsm`, `.prsf`, `.prsl`, `.prst`, `.prsp`) devolve bytes idênticos.
6. Um arquivo salvo com CRLF e BOM por outro editor abre normalmente e, ao ser salvo pelo Prisma, fica em UTF-8 sem BOM com LF.
7. Criar projeto gera o `.prsp`, as pastas sugeridas e o `.gitignore` com `.prisma-cache/`. Mover a pasta inteira do projeto para outro lugar e abrir o `.prsp` funciona sem ajustes.
8. Arquivo listado no `.prsp` e apagado do disco aparece como "não encontrado" no painel Projeto.
9. A tela inicial não mostra mais nada sobre "cofre". Os recentes incluem projetos e marcam arquivos que sumiram.
10. Primeira execução cria `Documentos\Prisma\Bibliotecas`, `Modelos` e `Skills`.
11. Abrir um `.prsm` no Bloco de Notas mostra texto legível: cabeçalho YAML, texto e blocos de cálculo.
