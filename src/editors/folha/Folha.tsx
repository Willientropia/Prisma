import { useMemo, useState } from 'react';
import { parse as parseYaml } from 'yaml';
import { PanelHeader, PropGrid, Row } from '../../components/ui';
import { blocks, parse, type BlockSegment } from '../../format/doc';
import { assignments, byPosition } from '../../format/views';
import { fmtNumber, fmtUnit } from '../../format/display';
import { LeftPanel } from '../../shell/ProjectPanel';
import { useWorkspace, type OpenDoc } from '../../store/workspace';
import { run } from '../../commands/registry';
import { blockLabel, blockProps } from '../caderno/Caderno';
import s from '../editors.module.css';

const num = (b: BlockSegment, k: string, d = 0) => Number(b.attrs[k] ?? d) || d;

// Fase 1: regiões nas posições do arquivo, com o texto cru. Fase 3 traz cálculo, arrastar e uPlot.
export function Folha({ doc }: { doc: OpenDoc }) {
  const parsed = useMemo(() => parse(doc.text), [doc.text]);
  const regions = useMemo(() => byPosition(blocks(parsed)), [parsed]);
  const vars = useMemo(() => assignments(regions), [regions]);
  const fns = regions.filter((b) => b.type === 'funcao');
  const [selId, setSel] = useState<string | null>(null);
  const sel = regions.find((b) => (b.id ?? b.raw) === selId);
  const [msg, setMsg] = useState(`${regions.length} regiões lidas de ${doc.name}.`);
  const { openFile, set, resolveLink } = useWorkspace();

  const command = (v: string) => {
    const ir = /^ir\s+(.+)$/.exec(v);
    if (v === 'calcular') run('calc.tudo');
    else if (ir) {
      const f = resolveLink(ir[1].trim(), doc.path); // mesma regra dos [[links]]: projeto, mesma pasta, caminho relativo
      if (f) void openFile(f); else setMsg(`Arquivo "${ir[1]}" não encontrado.`);
    } else set({ status: `Comando "${v}": ainda não disponível nesta versão` });
  };

  return (
    <>
      <LeftPanel doc={doc} className={s.left}>
        <PanelHeader title="Variáveis" aside={vars.length} />
        <div className={s.varsHead}><span>Nome</span><span>Valor</span><span>Unid.</span></div>
        {vars.map((v, i) => <div key={v.name + i} className={s.varsRow}><span>{v.name}</span><span>{fmtNumber(v.value)}</span><span>{fmtUnit(v.unit)}</span></div>)}
        <div className={s.gap} />
        <PanelHeader title="Funções nesta folha" />
        <div className={s.list}>
          {fns.length === 0 && <div className={s.note}>Nenhuma função definida aqui.</div>}
          {fns.map((f) => <Row key={f.raw} className={s.mono}>{f.body.split(':=')[0].trim()}</Row>)}
        </div>
      </LeftPanel>

      <main className={s.center}>
        <div className={s.sheet} onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          {regions.map((b) => {
            const id = b.id ?? b.raw;
            const style = { left: num(b, 'x'), top: num(b, 'y') };
            const cls = [s.region, b === sel ? s.regionOn : s.regionOff].join(' ');
            const pick = () => setSel(id);
            if (b.type === 'texto') return <div key={id} className={`${cls} ${s.regionTitle}`} style={style} onClick={pick}>{b.body.trim().replace(/\*\*/g, '')}</div>;
            if (b.type === 'grafico') return <Plot key={id} b={b} className={cls} style={style} onClick={pick} />;
            return <pre key={id} className={`${cls} ${s.regionCode}`} style={style} onClick={pick}>{b.body.replace(/\r?\n$/, '')}</pre>;
          })}
        </div>
        <div className={s.cmdline}>
          <span>{msg}</span>
          <label>Comando:
            <input type="text" placeholder="digite um comando, ex.: ir string-3" aria-label="Comando"
              onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { command(e.currentTarget.value.trim()); e.currentTarget.value = ''; } }} />
          </label>
        </div>
      </main>

      <aside className={s.right}>
        <PanelHeader title="Propriedades da região" />
        {sel ? <PropGrid rows={[['Região', sel.id ?? ''], ...blockProps(sel).filter(([k]) => k !== 'Id' && k !== 'x' && k !== 'y'), ['Posição X', `${num(sel, 'x')} px`], ['Posição Y', `${num(sel, 'y')} px`]]} />
          : <div className={s.note}>Clique numa região para ver as propriedades.</div>}
      </aside>
    </>
  );
}

function Plot({ b, className, style, onClick }: { b: BlockSegment; className: string; style: { left: number; top: number }; onClick: () => void }) {
  let title = blockLabel(b.type);
  try { const y = parseYaml(b.body) as { titulo?: unknown } | null; if (y?.titulo) title = String(y.titulo); } catch { /* corpo inválido: mostra o rótulo */ }
  return (
    <figure className={`${className} ${s.plot}`} style={{ ...style, width: num(b, 'largura', 400) }} onClick={onClick}>
      <figcaption>{title}</figcaption>
      <div className={s.plotEmpty} style={{ height: num(b, 'altura', 200) - 40 }}>Sem valores calculados</div>
    </figure>
  );
}
