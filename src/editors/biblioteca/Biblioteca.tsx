import { useMemo, useState } from 'react';
import { PanelHeader, PropGrid, Row } from '../../components/ui';
import { parse } from '../../format/doc';
import { libFunctions } from '../../format/views';
import { fmtUnit } from '../../format/display';
import type { OpenDoc } from '../../store/workspace';
import { LeftPanel } from '../../shell/ProjectPanel';
import { MathMarkup } from '../../math/MathField';
import { toLatex } from '../../format/mathlinear';

/** Linear do arquivo -> matemática na tela; se não der para ler, mostra o texto. */
const tex = (linear: string) => { try { return toLatex(linear); } catch { return `\text{${linear.replace(/[\{}]/g, '')}}`; } };
import s from '../editors.module.css';

// Fase 1: lê as seções ## do .prsl. Fase 4 roda os testes e grava funções vindas do caderno.
export function Biblioteca({ doc }: { doc: OpenDoc }) {
  const parsed = useMemo(() => parse(doc.text), [doc.text]);
  const fns = useMemo(() => libFunctions(parsed), [parsed]);
  const [i, setI] = useState(0);
  const sel = fns[Math.min(i, fns.length - 1)];
  const nome = String(parsed.meta.nome ?? doc.name);
  const consts = parsed.meta.constantes && typeof parsed.meta.constantes === 'object' ? Object.entries(parsed.meta.constantes) : [];

  return (
    <>
      <LeftPanel doc={doc} className={s.left}>
        <PanelHeader title="Funções" aside={nome} />
        <div className={s.list}>
          {fns.map((f, k) => <Row key={f.sig + k} active={f === sel} onClick={() => setI(k)} className={s.fnRow}>{f.sig}</Row>)}
          {fns.length === 0 && <div className={s.note}>Nenhuma função. Cada seção ## do arquivo é uma função.</div>}
        </div>
        {consts.length > 0 && <>
          <PanelHeader title="Constantes" aside={consts.length} />
          {consts.map(([k, v]) => <div key={k} className={s.varsRow2}><span>{k}</span><span>{fmtUnit(String(v))}</span></div>)}
        </>}
      </LeftPanel>

      <main className={s.center}>
        {sel ? (
          <div className={s.libView}>
            <div className={s.crumb}>{nome}</div>
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
                const [expr, expected = ''] = t.split('≈').map((x) => x.trim());
                return <div key={t} className={s.testsRow}><span><MathMarkup latex={tex(expr)} theme="dark" /></span><span><MathMarkup latex={tex(expected.replace(/^(S+)s+(.+)$/, '$1 $2'))} theme="dark" /></span><span className={s.mutedCell}>não executado</span></div>;
              })}
            </div>
          </div>
        ) : <div className={s.libView}><div className={s.note}>Esta biblioteca ainda não tem funções.</div></div>}
      </main>

      <aside className={s.right}>
        <PanelHeader title="Metadados" />
        <PropGrid rows={[['Biblioteca', nome], ['Versão', String(parsed.meta.versao ?? '')], ['Retorna', sel?.fields['Retorna'] ?? ''], ['Fonte', sel?.fields['Fonte'] ?? ''], ['Origem', sel?.fields['Origem'] ?? '']]} />
      </aside>
    </>
  );
}
