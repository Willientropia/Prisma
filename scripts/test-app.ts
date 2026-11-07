// npm run test:app (ADENDO 03, C1/C5): binário real compilado + WebdriverIO + tauri-driver.
// Roda numa pasta temporária (PRISMA_HOME), nunca nos Documentos e na configuração de quem testa.
// Gera test-results/app.json, que o verify --full junta ao relatório.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from 'node:test';

const ROOT = join(import.meta.dirname, '..');
const sh = (cmd: string) => { const r = spawnSync(cmd, { cwd: ROOT, shell: true, stdio: 'inherit' }); if (r.status !== 0) throw new Error(`falhou: ${cmd}`); };

// 1. msedgedriver da mesma versão do Edge/WebView2 instalado
const edge = spawnSync('powershell', ['-NoProfile', '-Command', '(Get-Item "${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe").VersionInfo.ProductVersion'], { encoding: 'utf8' }).stdout.trim();
if (!/^\d+\.\d+\.\d+\.\d+$/.test(edge)) throw new Error(`Versão do Edge não encontrada (${edge})`);
const driverDir = join(ROOT, 'node_modules/.cache/msedgedriver', edge);
const driver = join(driverDir, 'msedgedriver.exe');
if (!existsSync(driver)) {
  mkdirSync(driverDir, { recursive: true });
  const zip = join(driverDir, 'edgedriver_win64.zip');
  console.log(`Baixando msedgedriver ${edge} de msedgedriver.microsoft.com`);
  const res = await fetch(`https://msedgedriver.microsoft.com/${edge}/edgedriver_win64.zip`);
  if (!res.ok) throw new Error(`Download do msedgedriver falhou: HTTP ${res.status}`);
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  sh(`powershell -NoProfile -Command "Expand-Archive -Force -LiteralPath '${zip}' -DestinationPath '${driverDir}'"`);
}
const tauriDriver = join(process.env.USERPROFILE ?? '', '.cargo/bin/tauri-driver.exe');
if (!existsSync(tauriDriver)) sh('cargo install tauri-driver --locked');

// 2. binário de depuração (PRISMA_HOME só vale nele)
if (!process.argv.includes('--sem-build')) sh('npx tauri build --debug --no-bundle');
const app = join(ROOT, 'src-tauri/target/debug/prisma.exe');

// 3. pasta de teste com os arquivos de exemplo
const home = mkdtempSync(join(tmpdir(), 'prisma-app-'));
cpSync(join(ROOT, 'tests/fixtures/usina-boa-vista'), join(home, 'Usina Boa Vista'), { recursive: true });
const env = { ...process.env, PRISMA_HOME: home, PRISMA_APP: app };

// 4. tauri-driver + testes
const td = spawn(tauriDriver, ['--native-driver', driver], { env, stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 1500)); // ponytail: espera fixa o driver abrir a porta 4444; trocar por sondagem se ficar instável
const results: { title: string; ok: boolean }[] = [];
let startupMs: number | null = null;
Object.assign(process.env, env);
try {
  const stream = run({ files: [join(ROOT, 'tests/app/app.e2e.ts')], concurrency: 1, execArgv: ['--import', 'tsx'] });
  stream.on('test:pass', (e) => { if (e.details.type !== 'suite') results.push({ title: e.name, ok: true }); console.log(`  ok   ${e.name}`); });
  stream.on('test:fail', (e) => { if (e.details.type !== 'suite') results.push({ title: e.name, ok: false }); console.log(`  FALHOU ${e.name}\n${(e.details.error as Error)?.message ?? ''}`); });
  stream.on('test:diagnostic', (e) => { const m = /C7-03: (\d+) ms/.exec(e.message); if (m) startupMs = +m[1]; else console.log(`  # ${e.message}`); });
  await stream.toArray(); // consome o fluxo até o fim
} finally {
  td.kill();
  spawnSync('taskkill', ['/F', '/IM', 'prisma.exe'], { stdio: 'ignore' }); // segunda instância, se sobrou
  rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}
mkdirSync(join(ROOT, 'test-results'), { recursive: true });
writeFileSync(join(ROOT, 'test-results/app.json'), JSON.stringify({ tests: results, startupMs }, null, 1));
const failed = results.filter((r) => !r.ok).length;
console.log(`\napp: ${results.length - failed} ok, ${failed} falhas${startupMs != null ? `, abertura ${startupMs} ms` : ''}`);
process.exit(failed || !results.length ? 1 : 0);
