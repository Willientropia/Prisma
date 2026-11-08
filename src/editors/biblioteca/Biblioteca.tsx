import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, PanelHeader, PropGrid, Row } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { parse } from '../../format/doc';
import { libFunctions } from '../../format/views';
import { fmtUnit, samePath } from '../../format/display';
import { fnName, resolveLibraries, type LibFn, type ResolvedLib } from '../../format/library';
import { useWorkspace, type OpenDoc } from '../../store/workspace';
import { LeftPanel } from '../../shell/ProjectPanel';
import { MathMarkup } from '../../math/MathField';
import { toLatex } from '../../format/mathlinear';
import { evaluateAsync } from '../../engine/client';
import { readLibraryFiles } from '../../engine/run';
import { register } from '../../commands/registry';
import s from '../editors.module.css';

/** Linear do arquivo -> matemática na tela; se não der para ler, mostra o texto. */
const tex = (linear: string) => { try { return toLatex(linear); } catch { return `\\text{${linear.replace(/[{}\\]/g, '')}}`; } };

/** Teste "expr ≈ 1.79 V": tolerância padrão de 0,5 % (SPEC 3.7). */
type TestResult = { ok: boolean; text: string };
const TOL = 0.005;
const splitTest = (t: string) => { const [expr, expected = ''] = t.split('≈').map((x) => x.trim()); const m = /^(-?[\d.]+(?:e-?\d+)?)\s*(.*)$/.exec(expected); return { expr, expected, num: m ? Number(m[1]) : NaN, unit: m?.[2] ?? '' }; };

/** Roda os testes no worker, com as definições em vigor da biblioteca (base + extensão). */
async function runTests(lib: { id: string; constants: [string, string][]; defs: string[] }, tests: string[]): Promise<Record<string, TestResult> | null> {
  if (!tests.length) return {};
  const parts = tests.map(splitTest);
  const out = await evaluateAsync({ libs: [{ id: lib.id, constants: lib.constants, functions: lib.defs }], blocks: [{ key: 't', type: 'calc', lines: parts.map((p) => `${p.expr} = ?${p.unit ? ` ${p.unit}` : ''}`) }] });
  if (out.kind === 'stopped') return null; // outro cálculo tomou o worker: não é resultado
  if (out.kind !== 'done') return Object.fromEntries(tests.map((t) => [t, { ok: false, text: out.kind === 'timeout' ? 'tempo esgotado' : 'não executado' }]));
  return Object.fromEntries(tests.map((t, i) => {
    const r = out.result.blocks.t?.[i];
    if (!r || r.error) return [t, { ok: false, text: r?.error ?? 'erro' }];
    const ok = r.value !== undefined && Number.isFinite(parts[i].num) && Math.abs(r.value - parts[i].num) <= TOL * Math.max(Math.abs(parts[i].num), 1e-12);
    return [t, { ok, text: ok ? 'aprovado' : `reprovado: ${r.text ?? ''}` }];
  }));
}

const tag = (f: LibFn) => (f.overrides ? 'substitui a de fábrica' : f.shadowed ? 'de fábrica, substituída' : f.from === 'extensao' ? 'minhas funções' : '');

// Fase 4: mostra a biblioteca com a extensão do usuário mesclada; a de fábrica é somente leitura.
export function Biblioteca({ doc }: { doc: OpenDoc }) {
  const parsed = useMemo(() => parse(doc.text), [doc.text]);
  const own = useMemo<LibFn[]>(() => libFunctions(parsed).map((f) => ({ ...f, name: fnName(f.formula), from: 'base', path: doc.path ?? '' })), [parsed, doc.path]);
  const project = useWorkspace((x) => x.project);
  const set = useWorkspace((x) => x.set);
  const [lib, setLib] = useState<ResolvedLib | null>(null);
  useEffect(() => {
    let alive = true;
    void readLibraryFiles(!!project).then((files) => {
      const found = [...resolveLibraries(files).values()].find((l) => doc.path && samePath(l.path, doc.path));
      if (alive) setLib(found ?? null);
    });
    return () => { alive = false; };
  }, [doc.path, doc.text, project]);

  const fns = lib?.functions ?? own;
  const [i, setI] = useState(0);
  const sel = fns[Math.min(i, fns.length - 1)];
  const nome = String(parsed.meta.nome ?? doc.name);
  // memorizado: testAll depende disto, e um array novo a cada render rodaria os testes sem parar
  const consts = useMemo(() => lib?.constants ?? (parsed.meta.constantes && typeof parsed.meta.constantes === 'object' ? Object.entries(parsed.meta.constantes).map(([k, v]) => [k, String(v)] as [string, string]) : []), [lib, parsed]);
  const factory = !!doc.factory;

  // testes (F4-04): rodam ao abrir e pelo botão Testar; cada função usa as definições em vigor
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const testAll = useCallback(async () => {
    const defs = lib?.defs ?? own.map((f) => f.formula).filter(Boolean);
    const all = fns.flatMap((f) => f.tests);
    const r = await runTests({ id: String(parsed.meta.id ?? doc.name), constants: consts, defs }, all);
    if (!r || !mounted.current) return; // interrompido, ou a tela já foi fechada: não mexe na barra de status
    setResults(r);
    const okN = Object.values(r).filter((x) => x.ok).length;
    if (all.length) set({ status: `Testes: ${okN} de ${all.length} aprovados` });
  }, [lib, own, fns, parsed, consts, doc.name, set]);
  useEffect(() => { void testAll(); }, [testAll]);
  useEffect(() => { register('lib.testar', { run: () => void testAll() }); }, [testAll]);

  return (
    <>
      <LeftPanel doc={doc} className={s.left}>
        <PanelHeader title="Funções" aside={nome} />
        <div className={s.list}>
          {fns.map((f, k) => (
            <Row key={f.path + f.sig + k} active={f === sel} onClick={() => setI(k)} className={[s.fnRow, f.shadowed && s.fnShadowed].filter(Boolean).join(' ')}>
              <span>{f.sig}{tag(f) && <span className={s.fnTag}>{tag(f)}</span>}</span>
            </Row>
          ))}
          {fns.length === 0 && <div className={s.note}>Nenhuma função. Cada seção ## do arquivo é uma função.</div>}
        </div>
        {consts.length > 0 && <>
          <PanelHeader title="Constantes" aside={consts.length} />
          {consts.map(([k, v]) => <div key={k} className={s.varsRow2}><span>{k}</span><span>{fmtUnit(v)}</span></div>)}
        </>}
      </LeftPanel>

      <main className={s.center}>
        {sel ? (
          <div className={s.libView}>
            <div className={s.crumb}>
              {nome}
              {factory && <span className={s.readOnly}><Icon name="lock" size={12} stroke={2} />fábrica · somente leitura</span>}
              {tag(sel) && <span className={s.fnTag}>{tag(sel)}</span>}
            </div>
            <h2 className={s.sig}>{sel.sig}</h2>
            {sel.description && <div className={s.colBody2}>{sel.description}</div>}
            <div className={s.formula}>{sel.formula ? <MathMarkup latex={tex(sel.formula)} theme="paper" size={22} /> : 'sem bloco funcao nesta seção'}</div>
            <div className={s.twoCol}>
              <div><div className={s.colTitle}>Parâmetros</div><div className={s.colBody}>{(sel.fields['Parâmetros'] ?? '').split(/;\s*/).join('\n')}</div></div>
              <div><div className={s.colTitle}>Por que e quando usar</div><div className={s.colBody2}>{sel.fields['Por que e quando usar']}</div></div>
            </div>
            <div className={s.tests}>
              <div className={s.testsHead}>Testes da função</div>
              {sel.tests.length === 0 && <div className={s.testsRow}><span>Nenhum teste</span><span /><span /></div>}
              {sel.tests.map((t) => {
                const { expr, expected } = splitTest(t);
                const r = results[t];
                return (
                  <div key={t} className={s.testsRow}>
                    <span><MathMarkup latex={tex(expr)} theme="dark" /></span>
                    <span><MathMarkup latex={tex(expected)} theme="dark" /></span>
                    <span>{r ? <Badge kind={r.ok ? 'ok' : 'fail'}>{r.text}</Badge> : <span className={s.mutedCell}>rodando</span>}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : <div className={s.libView}><div className={s.note}>Esta biblioteca ainda não tem funções.</div></div>}
      </main>

      <aside className={s.right}>
        <PanelHeader title="Metadados" />
        <PropGrid rows={[
          ['Biblioteca', nome], ['Versão', String(parsed.meta.versao ?? '')],
          ...(lib?.extension ? [['Extensão', `v${lib.extension.versao} · Documentos`] as [string, string]] : []),
          ['Retorna', sel?.fields['Retorna'] ?? ''], ['Fonte', sel?.fields['Fonte'] ?? ''], ['Origem', sel?.fields['Origem'] ?? ''],
        ]} />
      </aside>
    </>
  );
}
