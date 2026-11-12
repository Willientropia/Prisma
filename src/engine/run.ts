// Liga o documento aberto + bibliotecas ao worker, e guarda o resultado na store.
import { parse } from '../format/doc';
import { joinPath } from '../format/display';
import { resolveLibraries, type LibFile, type LibOrigin } from '../format/library';
import { useWorkspace } from '../store/workspace';
import { platform } from '../platform';
import { evaluateAsync, LINE_LIMIT_MS, stop } from './client';
import type { EvalResult, LibInfo, LibInput } from './evaluate';
import { parseMargin, shadowNotice } from './format';
import { blockInputs, exibicao } from './prepare';

export { blockKey } from './prepare';

/**
 * Arquivos de biblioteca na ordem de busca (ADENDO 01, A3): 1) do projeto, se o arquivo está num projeto
 * aberto; 2) Documentos/Prisma/Bibliotecas (inclui as extensões <id>.usuario.prsl); 3) de fábrica.
 */
export async function readLibraryFiles(inProject: boolean, errors: string[] = []): Promise<LibFile[]> {
  const { project } = useWorkspace.getState();
  const { user, factory } = await platform.libraryFiles().catch(() => ({ user: [] as string[], factory: [] as string[] }));
  const candidates: { path: string; origem: LibOrigin }[] = [
    ...(inProject && project ? project.lists.bibliotecas.map((r) => ({ path: joinPath(project.dir, r), origem: 'projeto' as const })) : []),
    ...user.map((path) => ({ path, origem: 'usuário' as const })),
    ...factory.map((path) => ({ path, origem: 'fábrica' as const })),
  ];
  const out: LibFile[] = [];
  for (const c of candidates) {
    try { out.push({ ...c, text: await platform.read(c.path) }); } catch (e) { errors.push(`Erro ao ler ${c.path}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  return out;
}

/** Bibliotecas importadas pelo documento, já com a extensão de cada uma mesclada (Fase 4). */
async function loadLibs(ids: string[], inProject: boolean, errors: string[]): Promise<{ libs: LibInput[]; info: LibInfo[] }> {
  if (!ids.length) return { libs: [], info: [] };
  const all = resolveLibraries(await readLibraryFiles(inProject, errors));
  const libs: LibInput[] = [];
  const info: LibInfo[] = [];
  for (const id of ids) {
    const lib = all.get(id);
    if (!lib) { errors.push(`Biblioteca não encontrada: ${id}`); continue; }
    libs.push({ id, constants: lib.constants, functions: lib.defs });
    info.push({ id, nome: lib.nome, versao: lib.versao, origem: lib.origem, path: lib.path, duplicate: lib.duplicate, readOnly: lib.readOnly, extension: lib.extension && { path: lib.extension.path, versao: lib.extension.versao } });
  }
  return { libs, info };
}

export async function recalc(docId: string): Promise<void> {
  const st = useWorkspace.getState();
  const doc = st.openDocs.find((d) => d.id === docId);
  if (!doc || (doc.type !== 'caderno' && doc.type !== 'folha')) return;
  const parsed = parse(doc.text);
  const blocks = blockInputs(parsed, doc.type === 'folha'); // ordem, desativadas e casas= (prepare.ts)
  const libErrors: string[] = [];
  const ids = Array.isArray(parsed.meta.bibliotecas) ? parsed.meta.bibliotecas.map(String) : [];
  const { libs, info } = await loadLibs(ids, !!st.projectPathOf(doc.path), libErrors);
  const cfg = st.config;
  // F-CONFIG: o formato vem só do documento (sem exibicao: padrão do SMath); o padrão do app é gravado no documento novo
  const format = exibicao(parsed.meta.exibicao);

  useWorkspace.setState({ calculating: true });
  const margem = parseMargin((cfg.verificacao as { margem_atencao?: unknown } | undefined)?.margem_atencao);
  const out = await evaluateAsync({ libs, blocks, format, margem, symbolic: doc.type === 'folha' }); // folha: semântica do SMath (ADENDO 05)
  useWorkspace.setState({ calculating: false });

  let result: EvalResult;
  if (out.kind === 'done') result = { ...out.result, libErrors: [...libErrors, ...out.result.libErrors], libs: info };
  else if (out.kind === 'timeout') {
    const n = blocks.find((b) => b.key === out.key)?.lines.length ?? 0;
    const ls = Array.from({ length: n }, (_, i) => (i === out.line ? { kind: 'eval' as const, error: `Tempo esgotado: a linha passou de ${LINE_LIMIT_MS / 1000} s` } : { kind: 'empty' as const }));
    result = { blocks: { [out.key]: ls }, libErrors, defined: [], ms: LINE_LIMIT_MS, libs: info };
  } else if (out.kind === 'stopped') {
    return; // outra avaliação começou ou o usuário interrompeu
  } else result = { blocks: {}, libErrors: [...libErrors, `Erro no motor: ${out.message}`], defined: [], ms: 0, libs: info };

  useWorkspace.setState((s) => ({ results: { ...s.results, [docId]: result } }));
  // i ou e virou variável do usuário: avisa uma vez por documento (E8-29)
  const msg = shadowNotice(warned, docId, result.shadow);
  if (msg) useWorkspace.setState({ status: msg });
}

const warned = new Set<string>();

export function interrupt(): void {
  stop();
  useWorkspace.setState({ calculating: false, status: 'Cálculo interrompido' });
}
