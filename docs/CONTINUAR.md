# Continuar de onde paramos

Leia no início de uma sessão nova, principalmente no VPS. As regras permanentes estão no `CLAUDE.md`, inclusive o limite de 60 GB de disco.

## Onde paramos (19/11/2026)

- Última versão publicada: **v0.9.0** (F09 a F12b), com tag e GitHub Release. O `CHANGELOG.md` diz o que cada versão traz.
- Lote F3 em andamento (`docs/TICKETS-FOLHA.md`): F13 (checklist em `docs/FOLHA-CHECKLIST.md`), F14 a F17 feitos em 19/11. Próximo: o próximo item "falta" do checklist; os marcados "conferir" esperam o usuário anotar como o SMath faz.
- Aguardando aprovação do usuário: as imagens visuais do Linux (`tests/visual/__snapshots__/linux/`, ainda fora do git) e a da folha no Windows com as guias novas (run do `imagens-windows.yml`). Só faça commit delas depois do ok.
- BUG-034 (CHANGELOG, Em andamento): o E8-09 falha 1 em 30 no VPS; causa ainda não achada.
- `docs/planos/` guarda os planos aprovados de tickets já feitos (F04, F-CONFIG, A6-4). Servem de modelo de plano e de registro das decisões.

## Pendências soltas (sem ticket ainda)

- A6-2-01 (Vitest de navegador) falhou 1 vez em cerca de 11 verify completos no VPS, em 20/11: a linha sqrt(x) não foi gravada em 2,7 s. Não reproduziu em 20 rodadas, com ou sem o MutationObserver do BUG-035. Suspeita: carga do servidor com prazo de 2 s, não confirmada. Se falhar de novo em qualquer push, investigar (é padrão), sem mudar o prazo do teste antes de falar com o usuário.
- `a^(b)` volta como `a^b`, e `1 Ω*mm^2/m*A/mm^2` volta com os termos reordenados quando a linha é editada. O valor não muda (F12).
- O botão "Derivada" do ribbon ainda insere `diff(;)`, e não o operador d/du que a tela já desenha.
- A unidade `var` não existe: o math.js define `VAR` como unidade complexa (`Q = ? VAR` dá −1125·i). Hoje a potência reativa sai em VA.
- `re`, `im` e `arg` não aceitam valor com unidade: `arg(150 V*(cos(45 deg) + i*sin(45 deg)))` dá erro. A volta é `arg(V/(1 V))`.
- Caderno: definições largas num bloco de cálculo se sobrepõem, porque a grade de entradas tem 4 colunas com `minmax(0, 1fr)` (`src/editors/editors.module.css`, `.calcInputs`). Mudar isso mexe em medida de interface: pergunte antes.
- `MANUTENCAO-01` e `MANUTENCAO-02`, citados no índice do `CLAUDE.md`, não estão no repositório.
- 14 avisos do `check-matriz`: testes citam BUG-017, BUG-021 a BUG-028, BUG-030 a BUG-032 e A6-5 sem linha em `tests/MATRIZ.md`. É aviso, não bloqueia.
- O PDF do caderno "Natureza da ICC" do usuário está desatualizado em relação ao `.prsm`. É arquivo do usuário, fora do repositório.

## Preferências do usuário

- Responder sempre em português do Brasil, inclusive em mensagens curtas de status.
- Protocolo enxuto (`CLAUDE.md`, "Como trabalhar"): uma pasta, vários tickets em sequência, testes só da mudança. Verificação pesada só ao fechar versão.
- Push só com autorização dele. O hook `pre-push` (instalado pelo `simple-git-hooks` no `npm install`) roda `npm run verify`. Durante esse verify, não edite arquivos e não use a porta 1420: a recarga do Vite derruba os testes do gancho.
- O VPS faz tudo: desenvolve, verifica e lança versão; o PC do usuário fica fora (19/11). Fechar versão no VPS = `npm run verify:full` do Linux verde + o run do `release.yml` verde (`CLAUDE.md`, seção "VPS"):
  1. Subir a versão em `package.json`, `package-lock.json` (2 lugares), `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` e `src-tauri/Cargo.lock` (pacote `prisma`).
  2. Escrever no `CHANGELOG.md` a seção `## vX.Y.Z — data`, em pt-BR e curta, um item por ticket, com o resultado do `verify:full`.
  3. Fazer o commit e criar a tag anotada `vX.Y.Z` com o mesmo texto da seção.
  4. Fazer push da `main` e da tag.

  5. Acompanhar o run: `gh run list --workflow release.yml --limit 1` e `gh run watch <id>`. Se falhar: `gh run view <id> --log-failed` e `gh run download <id> -n test-results`; corrija, apague a tag local e remota (pergunte antes: é destrutivo), suba de novo.

  A tag dispara `.github/workflows/release.yml`, que roda no Windows o `cargo test`, os testes `@tempo`, os visuais do Windows e o `test:app`, compila e publica a GitHub Release com o instalador. Se um teste falhar, a release não sai. O usuário instala pelo launcher dele (Williehub). Não gere instalador local.
- Sessões em paralelo no mesmo computador disputam a porta 1420: o Playwright de uma testa o Vite da outra sem acusar erro. Uma sessão por vez.

## VPS

### Limite físico de 60 GB (preparar uma vez, com root)

A medição dos scripts para em 55 GB, mas só protege o que passa por eles. Para que o projeto não passe de 60 GB de jeito nenhum, ele mora numa imagem de disco de 60 GB: quando ela enche, a escrita falha, e o resto do VPS continua livre.

```sh
sudo fallocate -l 60G /srv/prisma.img
sudo mkfs.ext4 -m 0 /srv/prisma.img
sudo mkdir -p /srv/prisma
sudo mount -o loop /srv/prisma.img /srv/prisma
echo '/srv/prisma.img /srv/prisma ext4 loop 0 0' | sudo tee -a /etc/fstab
sudo chown "$USER" /srv/prisma
git clone https://github.com/Willientropia/Prisma.git /srv/prisma/Prisma
```

Os caches que o projeto cria fora da pasta também ficam dentro da imagem. Ponha no `~/.bashrc` antes do primeiro `npm install`:

```sh
export CARGO_HOME=/srv/prisma/.cargo
export RUSTUP_HOME=/srv/prisma/.rustup
export npm_config_cache=/srv/prisma/.npm
export PLAYWRIGHT_BROWSERS_PATH=/srv/prisma/.playwright
```

`df -h /srv/prisma` mostra o uso da imagem inteira; `npm run espaco` mostra só a pasta do repositório.

### O que roda só no Windows (no release.yml)

- Os testes de tempo (`@tempo`: C7-01, C7-02, B10-07, 06-40, BUG-029, A6-3-09 e dois de A6-ROBUSTEZ), o `cargo test` e o `test:app`. O `verify` do Linux deixa os três de fora e diz isso no relatório. Não instale Rust nem WebKitGTK no VPS (decisão do usuário).
- Imagens visuais: cada sistema tem as suas (`tests/visual/__snapshots__/` no Windows, `linux/` no Linux). Falhou só por fonte ou serrilhado: não atualize; explique e pergunte. Para gerar as do Windows, rode o `imagens-windows.yml` (Actions → Run workflow, ou push num ramo `imagens/*`) e baixe com `gh run download`.

### Chromium sem root

O VPS não tem as bibliotecas de sistema do Chromium e não há sudo sem senha. Elas foram baixadas com `apt-get download` e extraídas em `~/.local/pw-libs` (libatk, libatk-bridge, libXdamage, libasound, libatspi). O `LD_LIBRARY_PATH` aponta para lá no `~/.bashrc` e no `.claude/settings.local.json`. O Node 22 vem do nvm, com atalhos em `~/.local/bin`.
