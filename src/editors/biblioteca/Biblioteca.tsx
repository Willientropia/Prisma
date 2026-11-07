import { useState } from 'react';
import { PanelHeader, PropGrid, Row } from '../../components/ui';
import { FNS } from '../../mock';
import s from '../editors.module.css';

// Fase 0: funções do protótipo. Fase 4 lê o .lib.md e roda os testes.
export function Biblioteca() {
  const [fn, setFn] = useState('dv');
  const sel = FNS.find((f) => f.id === fn) ?? FNS[0];
  return (
    <>
      <aside className={s.left}>
        <PanelHeader title="Funções" aside="Elétrica" />
        <div className={s.list}>
          <Row className={s.groupLabel}>Queda de tensão</Row>
          {FNS.map((f) => <Row key={f.id} active={f.id === fn} onClick={() => setFn(f.id)} className={s.fnRow}>{f.sig}</Row>)}
        </div>
      </aside>

      <main className={s.center}>
        <div className={s.libView}>
          <div className={s.crumb}>Elétrica · Queda de tensão</div>
          <h2 className={s.sig}>{sel.sig}</h2>
          <div className={s.formula}><div className="m v">{sel.formula}</div></div>
          <div className={s.twoCol}>
            <div><div className={s.colTitle}>Parâmetros</div><div className={s.colBody}>{sel.params}</div></div>
            <div><div className={s.colTitle}>Por que e quando usar</div><div className={s.colBody2}>{sel.note}</div></div>
          </div>
          <div className={s.tests}>
            <div className={s.testsHead}>Testes da função</div>
            <div className={s.testsRow}><span>{sel.test}</span><span>{sel.res}</span><span className={s.ok}>aprovado</span></div>
          </div>
        </div>
      </main>

      <aside className={s.right}>
        <PanelHeader title="Metadados" />
        <PropGrid rows={[['Biblioteca', 'Elétrica'], ['Versão', '1.4'], ['Retorna', sel.ret], ['Fonte', sel.src], ['Uso', sel.uses]]} />
      </aside>
    </>
  );
}
