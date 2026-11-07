// App real (ADENDO 03, C1): binário compilado, WebdriverIO + tauri-driver. Roda por `npm run test:app`.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { remote } from 'webdriverio';

const APP = process.env.PRISMA_APP!;
const HOME = process.env.PRISMA_HOME!;
const CALC = join(HOME, 'Usina Boa Vista/calculos');

const open = () => remote({
  hostname: '127.0.0.1', port: 4444, logLevel: 'error',
  capabilities: { 'tauri:options': { application: APP } } as WebdriverIO.Capabilities,
});
const tabTexts = async (b: WebdriverIO.Browser) => (await b.$$('[aria-label="Documentos abertos"] [role="tab"]').map((t) => t.getText())).join(' | ');

test('[F0-12] [A9-10] [C7-03] o app abre até a tela inicial em até 3 s; a primeira execução cria as pastas', async (t) => {
  const t0 = Date.now();
  const b = await open();
  try {
    await b.$('//h2[normalize-space()="Recentes"]').waitForDisplayed({ timeout: 15000 });
    const ms = Date.now() - t0;
    t.diagnostic(`C7-03: ${ms} ms`);
    assert.ok(ms <= 3000, `abriu em ${ms} ms (limite 3000)`);
    for (const sub of ['Bibliotecas', 'Modelos', 'Skills']) assert.ok(existsSync(join(HOME, 'Documentos/Prisma', sub)), `faltou Documentos\\Prisma\\${sub}`);
    assert.ok(existsSync(join(HOME, 'AppData/Roaming/Prisma/config.yaml')), 'faltou o config.yaml');
  } finally { await b.deleteSession(); }
});

// O msedgedriver passa `args` ao WebView2, não ao programa: aqui o app abre pelo driver e os arquivos
// chegam por novas instâncias (duplo clique com o Prisma aberto). A abertura a frio com arquivo fica no
// teste Rust `arquivos_na_linha_de_comando` e no item manual A9-03.
test('[A9-02] com o Prisma aberto, cada arquivo passado ao programa abre em outra aba da mesma janela', async () => {
  const b = await open();
  const again = (file: string) => spawn(APP, [join(CALC, file)], { env: process.env, detached: true, stdio: 'ignore' }).unref();
  try {
    await b.$('//h2[normalize-space()="Recentes"]').waitForDisplayed({ timeout: 15000 });
    again('cabos-cc.prsm');
    await b.waitUntil(async () => (await tabTexts(b)).includes('cabos-cc.prsm'), { timeout: 15000, timeoutMsg: 'cabos-cc.prsm não abriu' });
    again('string-3.prsf');
    await b.waitUntil(async () => (await tabTexts(b)).includes('string-3.prsf'), { timeout: 15000, timeoutMsg: 'a segunda instância não abriu string-3.prsf na mesma janela' });
    assert.equal((await b.getWindowHandles()).length, 1);
  } finally { await b.deleteSession(); }
});
