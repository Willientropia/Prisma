# Continuar de onde paramos

Leia no início de uma sessão nova, principalmente no VPS. As regras permanentes estão no `CLAUDE.md`, inclusive o limite de 60 GB de disco.

## Onde paramos (19/11/2026)

- Última versão publicada: **v0.9.0** (F09 a F12b), com tag e GitHub Release. O `CHANGELOG.md` diz o que cada versão traz.
- Próximo trabalho: **Lote F3** em `docs/TICKETS-FOLHA.md`, a começar pelo **F13**: levantar o que falta para a folha igualar o SMath no uso do usuário e gravar em `docs/FOLHA-CHECKLIST.md`. Depois, um ticket por item do checklist (F14+).
- `docs/planos/` guarda os planos aprovados de tickets já feitos (F04, F-CONFIG, A6-4). Servem de modelo de plano e de registro das decisões.

## Pendências soltas (sem ticket ainda)

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
- Fechar versão:
  1. Subir a versão em `package.json`, `package-lock.json` (2 lugares), `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` e `src-tauri/Cargo.lock` (pacote `prisma`).
  2. Escrever no `CHANGELOG.md` a seção `## vX.Y.Z — data`, em pt-BR e curta, um item por ticket, com o resultado do `verify:full`.
  3. Fazer o commit e criar a tag anotada `vX.Y.Z` com o mesmo texto da seção.
  4. Fazer push da `main` e da tag.

  A tag dispara `.github/workflows/release.yml`, que compila no Windows e publica a GitHub Release com o instalador. O usuário instala pelo launcher dele (Williehub). Não gere instalador local.
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

### O que não roda no Linux

- `npm run test:app` usa Edge WebView2, `msedgedriver` e PowerShell: só roda no Windows. No VPS, o `verify:full` falha nessa etapa. Ao fechar versão no VPS, rode `npm run verify`, avise o usuário que o app real não foi testado e pergunte se ele quer rodar o `test:app` no Windows antes do push.
- As imagens aprovadas dos testes visuais do Playwright foram geradas no Windows. Se elas falharem no Linux só por fonte ou antialiasing, não atualize as imagens: explique e pergunte (CLAUDE.md, "Proibido").
