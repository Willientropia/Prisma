// Fase 4: "Salvar na biblioteca" (salvar=<id>), bibliotecas de fábrica somente leitura e busca de função.
import { register } from './registry';
import { useWorkspace, activeDoc, FACTORY_MSG } from '../store/workspace';
import { lines, normalizeForSave, parse, type BlockSegment } from '../format/doc';
import { joinPath, samePath, stem } from '../format/display';
import {
  addFunction, bumpVersion, extensionText, findDef, fnName, newLibraryText, replaceFunction, resolveLibraries, sameDef, type LibFile, type ResolvedLib,
} from '../format/library';
import { readLibraryFiles, recalc } from '../engine/run';
import { platform } from '../platform';

const st = useWorkspace.getState;
const say = (status: string) => st().set({ status });

/** Grava a biblioteca (UTF-8 sem BOM, LF) e atualiza a aba dela, se estiver aberta. */
async function writeLib(path: string, text: string) {
  if (st().isFactory(path)) throw new Error(FACTORY_MSG); // nunca grava nos recursos do programa
  const out = normalizeForSave(text);
  await platform.write(path, out);
  const open = st().openDocs.find((d) => d.path && samePath(d.path, path));
  if (open) st().set({ openDocs: st().openDocs.map((d) => (d === open ? { ...d, text: out, dirty: false } : d)) });
  st().set({ libsVersion: st().libsVersion + 1 });
}

type Dest = { path: string; text: string; isNew: boolean; base?: ResolvedLib };

/**
 * Para onde vai salvar=<id>: 1) biblioteca gravável do projeto aberto; 2) Documentos\Prisma\Bibliotecas;
 * 3) extensão <id>.usuario.prsl da de fábrica; 4) senão pergunta onde criar.
 */
async function destination(id: string, files: LibFile[]): Promise<Dest | null> {
  const s = st();
  const meta = (f: LibFile) => parse(f.text).meta;
  const own = (o: LibFile['origem']) => files.find((f) => f.origem === o && String(meta(f).id ?? '') === id && !meta(f).estende);
  const hit = own('projeto') ?? own('usuário');
  if (hit) return { path: hit.path, text: hit.text, isNew: false };
  const base = resolveLibraries(files).get(id);
  if (base?.readOnly) {
    if (base.extension) return { path: base.extension.path, text: base.extension.text, isNew: false, base };
    return { path: joinPath(s.paths?.libraries ?? '', `${id}.usuario.prsl`), text: extensionText(base), isNew: true, base };
  }
  const buttons = [...(s.project ? [{ id: 'projeto', label: 'Projeto atual', primary: true }] : []), { id: 'docs', label: 'Documentos', primary: !s.project }, { id: 'cancel', label: 'Cancelar' }];
  const r = await s.ask({ title: 'Salvar na biblioteca', message: `A biblioteca ${id} não existe. Criar em:`, buttons });
  if (r.id === 'projeto' && s.project) return { path: joinPath(s.project.dir, `bibliotecas/${id}.prsl`), text: newLibraryText(id), isNew: true };
  if (r.id === 'docs') return { path: joinPath(s.paths?.libraries ?? '', `${id}.prsl`), text: newLibraryText(id), isNew: true };
  return null;
}

/** Funções com salvar=<id> do caderno ativo vão para a biblioteca (regras da Fase 4). */
export async function saveToLibrary(): Promise<void> {
  const doc = activeDoc(st());
  if (!doc || doc.type !== 'caderno') return say('Abra um caderno com um bloco de função que tenha salvar=');
  const blocks = parse(doc.text).segments.filter((x): x is BlockSegment => x.kind === 'block' && x.type === 'funcao' && !!x.attrs.salvar);
  if (!blocks.length) return say('Nenhum bloco de função com salvar= neste caderno');
  const files = await readLibraryFiles(!!st().project);
  const done = { novas: 0, substituidas: 0, iguais: 0 };
  for (const b of blocks) {
    const id = b.attrs.salvar;
    const dest = await destination(id, files);
    if (!dest) return say('Salvar na biblioteca: cancelado');
    let text = dest.text;
    let changed = false;
    for (const def of lines(b.body).map((l) => l.replace(/\r?\n$/, '').trim()).filter(Boolean)) {
      const name = fnName(def);
      const origem = `[[${stem(doc.path ?? doc.name)}#${b.id ?? name}]]`;
      const inFile = findDef(text, name);
      const current = inFile ?? dest.base?.defs.find((d) => fnName(d) === name); // na extensão, a de fábrica também conta
      if (current && sameDef(current, def)) { done.iguais++; continue; }
      if (current) {
        const r = await st().ask({
          title: 'Função já existe na biblioteca', message: `${name} já está em ${id} com outra definição.`,
          compare: { before: current, after: def },
          buttons: [{ id: 'replace', label: 'Substituir', primary: true }, { id: 'keep', label: 'Manter a antiga' }, { id: 'cancel', label: 'Cancelar' }],
        });
        if (r.id === 'cancel') return say('Salvar na biblioteca: cancelado');
        if (r.id === 'keep') continue;
        text = bumpVersion(inFile ? replaceFunction(text, name, def, origem) : addFunction(text, def, b.id ?? name, origem));
        done.substituidas++;
      } else {
        text = addFunction(text, def, b.id ?? name, origem);
        done.novas++;
      }
      changed = true;
    }
    if (!changed) continue;
    try { await writeLib(dest.path, text); } catch (e) { return say(`Não foi possível gravar ${dest.path}: ${e instanceof Error ? e.message : String(e)}`); }
    if (dest.isNew && st().project && dest.path.startsWith(st().project!.dir)) await st().projectAdd([dest.path]);
    files.splice(0, files.length, ...(await readLibraryFiles(!!st().project)));
  }
  await recalc(doc.id);
  say(`Salvar na biblioteca: ${done.novas} nova(s), ${done.substituidas} substituída(s), ${done.iguais} sem mudança`);
}

register('caderno.salvarNaBiblioteca', { run: () => void saveToLibrary() });

// Biblioteca de fábrica: só leitura (Fase 4, F4-07)
const LIB_HINT = 'Biblioteca de fábrica. Suas funções vão para a extensão em Documentos';
const editable = () => !activeDoc(st())?.factory;
for (const id of ['lib.novaFuncao', 'lib.importar', 'lib.publicar']) register(id, { enabled: editable, hint: LIB_HINT });

// Busca de função (F4-06): Ctrl+K e "Inserir função"
register('funcao.inserir', { shortcut: 'Ctrl+K', run: () => st().set({ fnSearchOpen: true }) });

/** Todas as funções em vigor, de todas as bibliotecas (com a extensão mesclada). */
export async function allFunctions(): Promise<{ sig: string; def: string; lib: string; description: string; why: string }[]> {
  const libs = resolveLibraries(await readLibraryFiles(!!st().project));
  return [...libs.values()].flatMap((l) => l.functions.filter((f) => !f.shadowed && f.formula).map((f) => ({ sig: f.sig, def: f.formula, lib: l.nome, description: f.description, why: f.fields['Por que e quando usar'] ?? '' })));
}
