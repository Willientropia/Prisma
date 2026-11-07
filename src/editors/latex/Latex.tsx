import { PanelHeader, Row } from '../../components/ui';
import { useApp } from '../../store/app';
import { run } from '../../commands/registry';
import s from '../editors.module.css';

// Fase 0: código e PDF simulados. Fase 5 traz CodeMirror, Tectonic e pdf.js.
export function Latex() {
  const inserted = useApp((x) => x.texInserted);
  const compiled = useApp((x) => x.texCompiled);
  const lines = Array.from({ length: inserted ? 12 : 10 }, (_, i) => i + 1).join('\n');

  return (
    <>
      <aside className={s.left}>
        <PanelHeader title="Documento" />
        <div className={s.list}>
          <Row>1  Introdução</Row><Row>2  Dados da instalação</Row><Row active>3  Condutores CC</Row>
          <Row className={s.indent}>3.1  Critério de queda</Row><Row>4  Proteção</Row><Row>Referências</Row>
        </div>
        <PanelHeader title="Arquivos do projeto" />
        <div className={s.list}>
          {['memorial.tex', 'referencias.bib', 'memorial-soltech.cls', 'figuras/'].map((f) => <Row key={f} className={s.mono}>{f}</Row>)}
        </div>
      </aside>

      <main className={s.center}>
        <div className={s.split}>
          <div className={s.code}>
            <div className={s.lineNums} aria-hidden="true">{lines}</div>
            <pre>
              <span className={s.cm}>% Modelo: Memorial de cálculo FV (ABNT)</span>{'\n'}
              <span className={s.kw}>\section</span>{'{Condutores CC}\n'}
              <span className={s.kw}>\subsection</span>{'{Critério de queda}\n'}
              {'O critério adotado limita a queda de tensão no\ntrecho CC a 1\\,\\% da tensão de máxima potência.\n\n'}
              <span className={s.kw}>\begin</span>{'{equation}\n  \\Delta V = \\frac{2\\,\\rho\\,L\\,I}{S}\n'}
              <span className={s.kw}>\end</span>{'{equation}\n'}
              {inserted && <span className={s.inserted}>{'\\resultado{cabos-cc/trecho:1}  % 1,79 V (0,45 %)\n\\figura{string-3/dv-por-secao}   % da folha livre'}</span>}
            </pre>
          </div>
          <div className={s.pdfPane}>
            <div className={s.pdf}>
              <div className={s.pdfHead}><span>Memorial de cálculo · Usina Boa Vista</span><span>7</span></div>
              <h2>3 CONDUTORES CC</h2>
              <h3>3.1 Critério de queda</h3>
              <p>O critério adotado limita a queda de tensão no trecho CC a 1 % da tensão de máxima potência.</p>
              <div className={s.pdfEq}>
                <span><span className="v">ΔV</span> =<span className="fr"><span>2 <span className="v">ρ L I</span></span><span><span className="v">S</span></span></span></span>
                <span className={s.pdfEqNum}>(3)</span>
              </div>
              {inserted && <>
                <p>Para <span className="v">L</span> = 25 m, <span className="v">I</span> = 12 A e <span className="v">S</span> = 6 mm², obtém-se <span className="v">ΔV</span> = 1,79 V (0,45 %).</p>
                <div className={s.pdfFig}>Figura 4: ΔV % por seção do cabo</div>
              </>}
            </div>
          </div>
        </div>
      </main>

      <aside className={s.right}>
        <PanelHeader title="Resultados disponíveis" />
        <div className={s.note}>Escolha o que inserir no documento. Nada é sincronizado sem você pedir.</div>
        <Row height={40} onClick={() => run('tex.inserirResultado')}>ΔV · Cabos CC <span className={s.muted}>1,79 V</span></Row>
        <Row height={40} onClick={() => run('tex.inserirResultado')}>Gráfico ΔV % · String 3</Row>
        <Row height={40} onClick={() => run('tex.inserirResultado')}>E_mês · Geração <span className={s.muted}>712,8 kWh</span></Row>
        <div className={s.gap} />
        <PanelHeader title="Saída da compilação" />
        <div className={s.compileOut}>
          LuaLaTeX 1.18<br />memorial.tex: 12 páginas<br />
          <span className={s.ok}>0 erros</span> · <span className={s.warn}>2 avisos</span><br />
          {compiled ? 'Compilado em 1,4 s' : 'Última compilação: há 3 min'}
        </div>
      </aside>
    </>
  );
}
