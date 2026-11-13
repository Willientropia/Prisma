// Ribbon (SPEC 6; ADENDO 06, Parte 4): guias por tipo de documento, guias matemáticas, letras com Alt. Saiu do Shell.tsx (300 linhas).
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { all, run } from '../commands/registry';
import { useWorkspace, activeDoc } from '../store/workspace';
import { RIBBONS, RIBBON_TABS, isMathTab, type RibbonTab } from './ribbons';
import { MATH_RIBBON } from './ribbonMath';
import { RibbonMath } from '../components/RibbonMath';
import { focusedField, insertInFocused } from '../math/insert';
import s from './shell.module.css';
/** Há um campo de matemática em edição? Acompanha o foco (os botões matemáticos inserem nele, ADENDO 06 4.8). */
function useEditingMath() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const check = () => setOn(!!focusedField());
    const later = () => setTimeout(check, 0); // no focusout o activeElement ainda é o campo que sai
    document.addEventListener('focusin', check);
    document.addEventListener('focusout', later);
    return () => { document.removeEventListener('focusin', check); document.removeEventListener('focusout', later); };
  }, []);
  return on;
}

/** Letras das guias depois de apertar e soltar Alt (ADENDO 06, 4.8). */
const KEYTIPS: Partial<Record<RibbonTab, string>> = { inicio: 'I', matematica: 'M', matrizes: 'X', logica: 'L', simbolos: 'S', inserir: 'N', exibir: 'E', saida: 'A' };

/** Alt sozinho (apertar e soltar) mostra as letras; a letra escolhe a guia; Esc ou 8 s escondem. */
function useKeyTips(choose: (letter: string) => boolean) {
  const [on, setOn] = useState(false);
  const pick = useRef(choose);
  pick.current = choose;
  const shown = useRef(false); // atualizado junto com o estado: a letra apertada logo depois do Alt não espera o React desenhar
  useEffect(() => {
    let alone = false;
    let timer: number | undefined;
    const show = (v: boolean) => { shown.current = v; setOn(v); };
    const hide = () => { clearTimeout(timer); show(false); };
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Alt') { alone = !e.repeat; return; }
      alone = false;
      if (!shown.current) return;
      if (e.key === 'Escape' || pick.current(e.key)) { e.preventDefault(); e.stopPropagation(); } // a letra da guia não vai para o campo
      hide(); // qualquer outra tecla fecha as letras e segue normalmente (Alt apertado por engano não engole a digitação)
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== 'Alt' || !alone) return;
      alone = false;
      e.preventDefault();
      clearTimeout(timer);
      if (shown.current) return hide();
      show(true);
      timer = window.setTimeout(hide, 8000); // prazo
    };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    return () => { clearTimeout(timer); window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up, true); };
  }, []);
  return on;
}

export function Ribbon() {
  const doc = useWorkspace(activeDoc);
  const wanted = useWorkspace((x) => x.ribbonTab);
  const lastTabs = useWorkspace((x) => x.lastTabs);
  const cruz = useWorkspace((x) => x.folhaCruz);
  const set = useWorkspace((x) => x.set);
  const editing = useEditingMath();
  const tabs = doc ? RIBBON_TABS[doc.type] : [];
  const go = (id: RibbonTab) => doc && set({ ribbonTab: id, lastTabs: { ...lastTabs, [doc.type]: id } });
  const tips = useKeyTips((letter) => {
    // lê o store na hora da tecla: logo depois de abrir um documento, o último desenho ainda não o conhece
    const st = useWorkspace.getState();
    const d = activeDoc(st);
    const hit = d && RIBBON_TABS[d.type].find(([id]) => KEYTIPS[id] === letter.toUpperCase());
    if (d && hit) st.set({ ribbonTab: hit[0], lastTabs: { ...st.lastTabs, [d.type]: hit[0] } });
    return !!hit;
  });
  useWorkspace((x) => x.project); // botões que dependem do projeto mudam de estado
  if (!doc) return null;
  const cmds = all();
  const tab = tabs.some(([id]) => id === wanted) ? wanted : 'inicio';
  // folha sem edição: a folha cria a região no cursor em cruz (Folha.tsx ouve prisma:inserir)
  const insert = (latex: string) => { if (!insertInFocused(latex)) window.dispatchEvent(new CustomEvent('prisma:inserir', { detail: latex })); };
  return (
    <div className={s.ribbon}>
      <div role="tablist" aria-label="Guias da faixa de opções" className={s.rtabs}>
        {tabs.map(([id, text]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? s.rtOn : s.rt}
            onMouseDown={(e) => e.preventDefault() /* trocar de guia não tira o foco da expressão */}
            onClick={() => go(id)}>{text}{tips && KEYTIPS[id] && <span className={s.keytip} aria-hidden="true">{KEYTIPS[id]}</span>}</button>
        ))}
      </div>
      <div className={s.rbody}>
        {isMathTab(tab) ? <RibbonMath key={tab} groups={MATH_RIBBON[tab]} canInsert={editing || (doc.type === 'folha' && cruz)} onInsert={insert} onCommand={run} /> : RIBBONS[doc.type][tab].map((g) => (
          <div key={g.title} className={s.group}>
            <div className={s.groupBtns}>
              {g.buttons.map((b) => {
                const c = cmds.find((x) => x.id === b.cmd);
                const off = !!c?.enabled && !c.enabled();
                return (
                  <button key={b.cmd + b.label} type="button" className={s.rb} disabled={off} title={off ? c?.hint : undefined} onClick={() => run(b.cmd)}>
                    <Icon name={b.icon} size={24} stroke={1.6} className={s.rbIcon} /><span>{b.label}</span>
                  </button>
                );
              })}
            </div>
            <div className={s.groupTitle}>{g.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
