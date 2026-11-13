import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { Logo, Tag } from '../components/ui';
import { APP_NAME, APP_YEAR, TYPE_INFO } from '../constants';
import { all, run } from '../commands/registry';
import { useWorkspace, activeDoc } from '../store/workspace';
import { FORMATS } from '../mock';
import { displayPath, shortenPath } from '../format/display';
import { RIBBONS, RIBBON_TABS, isMathTab, type RibbonTab } from './ribbons';
import { MATH_RIBBON } from './ribbonMath';
import { RibbonMath } from '../components/RibbonMath';
import { focusedField, insertInFocused } from '../math/insert';
import { Catalog } from '../components/Catalog';
import { FUNCTION_CATEGORIES, UNIT_CATEGORIES, libItem, nativeItems, takeCatalogTarget, type CatalogItem } from './catalogo';
import { unitItems } from '../math/assistente';
import { MathMarkup, lastMathField } from '../math/MathField';
import { toLatex } from '../format/mathlinear';
import { allFunctions } from '../commands/library';
import s from './shell.module.css';

const QUICK: [string, IconName][] = [['app.novo', 'file'], ['app.abrir', 'open'], ['app.salvar', 'save'], ['app.desfazer', 'undo'], ['app.refazer', 'redo']];

const label = (id: string) => all().find((c) => c.id === id)?.label ?? id;

export function TitleBar() {
  const doc = useWorkspace(activeDoc);
  const project = useWorkspace((x) => x.project);
  const menuOpen = useWorkspace((x) => x.menuOpen);
  const set = useWorkspace((x) => x.set);
  const [query, setQuery] = useState('');

  const submit = () => {
    const cmd = all().find((c) => c.label.toLowerCase() === query.trim().toLowerCase());
    if (cmd) { run(cmd.id); setQuery(''); } else set({ status: `Nenhum comando "${query}"` });
  };

  return (
    <header className={s.titlebar}>
      <button type="button" className={s.appBtn} aria-label={`Menu do ${APP_NAME}`} aria-expanded={menuOpen}
        onClick={() => set({ menuOpen: !menuOpen })}>
        <Logo size={22} />
      </button>
      <div className={s.quick}>
        {QUICK.map(([id, icon]) => (
          <button key={id} type="button" className={s.qa} aria-label={label(id)} title={label(id)} onClick={() => run(id)}>
            <Icon name={icon} size={16} stroke={1.7} />
          </button>
        ))}
      </div>
      <div className={s.title}>
        {APP_NAME} {APP_YEAR}
        {project && <> <span className={s.sep}>|</span> {project.nome}</>}
        {' '}<span className={s.sep}>|</span> {doc ? doc.name : 'Início'}
      </div>
      <label className={s.search}>
        <Icon name="zoom" size={14} stroke={2} />
        <span className="sr-only">Buscar</span>
        <input type="text" list="cmd-list" placeholder="Buscar comando ou função" value={query}
          onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <datalist id="cmd-list">{all().map((c) => <option key={c.id} value={c.label} />)}</datalist>
      </label>
      <div className={s.avatar} aria-label="Usuário">PW</div>
    </header>
  );
}

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
      if (e.key === 'Escape' || pick.current(e.key)) { e.preventDefault(); e.stopPropagation(); hide(); } // a letra não vai para o campo
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

export function DocTabs() {
  const { openDocs, active, activate } = useWorkspace();
  return (
    <div className={s.dtabs} role="tablist" aria-label="Documentos abertos">
      <button type="button" role="tab" aria-label="Início" title="Início" aria-selected={active === 'home'} className={active === 'home' ? s.dtHomeOn : s.dtHome} onClick={() => activate('home')}>
        <Icon name="home" size={16} stroke={1.7} />
      </button>
      {openDocs.map((d) => (
        <button key={d.id} type="button" role="tab" title={d.path ? displayPath(d.path) : 'Ainda não salvo'} aria-selected={active === d.id} className={active === d.id ? s.dtOn : s.dt} onClick={() => activate(d.id)}>
          <Tag color={active === d.id ? TYPE_INFO[d.type].color : undefined}>{TYPE_INFO[d.type].tag}</Tag><TabName text={`${d.name}${d.dirty ? '*' : ''}${d.readOnly ? ' (somente leitura)' : ''}`} />
        </button>
      ))}
    </div>
  );
}

/** Nome da aba com a largura do texto em peso 500 já reservada: ativar a aba não muda o tamanho dela (ADENDO 04, D5). */
const TabName = ({ text }: { text: string }) => <span className={s.dtName} data-text={text}>{text}</span>;

export function StatusBar() {
  const status = useWorkspace((x) => x.status);
  const units = useWorkspace((x) => x.config.unidades);
  const result = useWorkspace((x) => x.results[x.active]);
  const calculating = useWorkspace((x) => x.calculating);
  const doc = useWorkspace(activeDoc);
  let summary = 'Pronto';
  if (calculating) summary = 'Calculando';
  else if (result) {
    const all = Object.values(result.blocks).flat();
    const evals = all.filter((l) => l.kind === 'eval' && !l.error).length;
    const checks = all.filter((l) => l.kind === 'check');
    const passed = checks.filter((l) => l.status === 'ok' || l.status === 'warn').length;
    const errors = all.filter((l) => l.error).length + result.libErrors.length;
    summary = [`Pronto · ${evals} resultados`, checks.length && `${passed} de ${checks.length} verificações aprovadas`, errors && `${errors} erros`].filter(Boolean).join(' · ');
  }
  return (
    <footer className={s.statusbar}>
      <span className={s.statusMsg}>{status ?? summary}</span>
      <span className={s.spacer} />
      {doc && <span title={doc.path ? displayPath(doc.path) : undefined}>{doc.path ? shortenPath(doc.path) : 'Não salvo'}</span>}
      <span>Unidades: {typeof units === 'string' ? units : 'SI'}</span><span>Cálculo: automático</span><span>Zoom 100 %</span>
    </footer>
  );
}

const MENU: [string, IconName][] = [
  ['app.novo', 'file'], ['app.abrir', 'open'], ['app.salvar', 'save'], ['app.salvarComo', 'save'],
  ['app.exportar', 'export'], ['app.imprimir', 'print'], ['app.gerarSkill', 'code'], ['app.fechar', 'close'],
];

export function AppMenu() {
  const { menuOpen, set } = useWorkspace();
  if (!menuOpen) return null;
  const cmds = all();
  return (
    <>
      <div className={s.backdrop} onMouseDown={() => set({ menuOpen: false })} />
      <div className={s.menu} role="menu" aria-label={`Menu do ${APP_NAME}`}>
        {MENU.map(([id, icon]) => {
          const c = cmds.find((x) => x.id === id);
          return (
            <button key={id} type="button" role="menuitem" className={s.mi} onClick={() => run(id)}>
              <Icon name={icon} size={16} stroke={1.7} className={s.miIcon} />{c?.label}
              <span className={s.miKey}>{c?.shortcut}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function ExportDialog() {
  const { exportOpen, set } = useWorkspace();
  const [fmt, setFmt] = useState('pdf');
  if (!exportOpen) return null;
  const close = () => set({ exportOpen: false });
  const cur = FORMATS.find((f) => f[0] === fmt) ?? FORMATS[0];
  return (
    <div className={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label="Exportar" className={s.dialog}>
        <div className={s.dlgHead}>
          <span>Exportar</span>
          <button type="button" className={s.dlgClose} aria-label="Fechar" onClick={close}><Icon name="close" size={14} stroke={2} /></button>
        </div>
        <div className={s.dlgBody}>
          <div className={s.dlgList}>
            {FORMATS.map(([id, name]) => (
              <button key={id} type="button" className={fmt === id ? s.rowOn : s.row} onClick={() => setFmt(id)}>{name}</button>
            ))}
          </div>
          <div className={s.dlgOpts}>
            <div className={s.dlgName}>{cur[1]}</div>
            <div className={s.dlgDesc}>{cur[2]}</div>
            <label><input type="checkbox" defaultChecked /> Incluir justificativas</label>
            <label><input type="checkbox" defaultChecked /> Mostrar unidades</label>
            <label><input type="checkbox" /> Só resultados finais</label>
            <label><input type="checkbox" /> Incluir funções das bibliotecas</label>
          </div>
        </div>
        <div className={s.dlgFoot}>
          <button type="button" className={s.btn} onClick={close}>Cancelar</button>
          <button type="button" className={s.btnPrimary} onClick={close}>Exportar</button>
        </div>
      </div>
    </div>
  );
}

/** Diálogo de escolha (Salvar / Não salvar / Cancelar, renomear...). Esc escolhe o último botão. */
/** Linear -> LaTeX para mostrar definições (nunca ":=" na tela, ADENDO 02). */
const texOf = (linear: string) => { try { return toLatex(linear); } catch { return `\\text{${linear.replace(/[{}\\]/g, '')}}`; } };

const recentCatalog: string[] = []; // "Recentes" do catálogo, na sessão

/** Catálogo de funções (Ctrl+E) e de unidades (Ctrl+W), ADENDO 06, 4.9. A escolha vai para o campo que estava em edição, ou para a cruz da folha. */
export function CatalogHost() {
  const kind = useWorkspace((x) => x.catalog);
  const set = useWorkspace((x) => x.set);
  const [libs, setLibs] = useState<CatalogItem[]>([]);
  useEffect(() => {
    if (kind === 'funcoes') void allFunctions().then((fs) => setLibs(fs.map((f) => libItem(f, (n) => texOf(n), texOf(f.sig)))));
  }, [kind]);
  if (!kind) return null;
  const units = (): CatalogItem[] => unitItems().map((u) => ({ name: u.name, sig: `${u.name}  ${u.title?.replace(/ \(.*$/, '') ?? ''}`, cat: u.title?.match(/\((.*)\)$/)?.[1] ?? '', desc: u.title ?? '', latex: u.insert, formula: u.detail ?? u.nameLatex }));
  const items = kind === 'funcoes' ? [...nativeItems(), ...libs] : units();
  const categories = kind === 'funcoes' ? [...FUNCTION_CATEGORIES, ...new Set(libs.map((l) => l.cat))] : UNIT_CATEGORIES;
  const close = () => { takeCatalogTarget(); set({ catalog: null }); };
  const pick = (it: CatalogItem) => {
    const { field: mf, region, line } = takeCatalogTarget();
    set({ catalog: null });
    const key = it.cat + it.name;
    recentCatalog.splice(0, recentCatalog.length, key, ...recentCatalog.filter((k) => k !== key).slice(0, 19));
    setTimeout(() => { // depois de o diálogo fechar: antes, o fechamento devolveria o foco ao body
      if (mf?.isConnected) { mf.focus(); if (insertInFocused(it.latex)) return; }
      window.dispatchEvent(new CustomEvent('prisma:inserir', { detail: region ? { latex: it.latex, region, line } : it.latex })); // folha: reabre a linha ou cria na cruz
    }, 0);
  };
  return <Catalog title={kind === 'funcoes' ? 'Catálogo de funções' : 'Catálogo de unidades'} categories={categories} items={items} recent={recentCatalog}
    math={(latex) => <MathMarkup latex={latex} theme="dark" />} onPick={pick} onClose={close} />;
}

/** Busca de função (F4-06): Ctrl+K ou "Inserir função". Enter insere a chamada no último campo matemático. */
export function FunctionSearch() {
  const open = useWorkspace((x) => x.fnSearchOpen);
  const set = useWorkspace((x) => x.set);
  const [q, setQ] = useState('');
  const [fns, setFns] = useState<Awaited<ReturnType<typeof allFunctions>>>([]);
  const [i, setI] = useState(0);
  useEffect(() => { if (open) { setQ(''); setI(0); void allFunctions().then(setFns); } }, [open]);
  if (!open) return null;
  const norm = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const shown = fns.filter((f) => norm(`${f.sig} ${f.lib} ${f.description}`).includes(norm(q)));
  const close = () => set({ fnSearchOpen: false });
  const choose = (f: (typeof fns)[number] | undefined) => {
    close();
    if (!f) return;
    const mf = lastMathField;
    if (!mf || !mf.isConnected) return set({ status: 'Clique numa expressão e use Inserir função de novo para escrever a chamada' });
    mf.focus();
    mf.insert(texOf(f.sig), { format: 'latex', mode: 'math' });
    set({ status: `Inserido ${f.sig} (${f.lib})` });
  };
  return (
    <div className={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label="Inserir função" className={`${s.dialog} ${s.choice}`}>
        <div className={s.dlgHead}><span>Inserir função</span></div>
        <div className={s.choiceBody}>
          <input autoFocus className={s.choiceInput} placeholder="Buscar por nome, biblioteca ou descrição" aria-label="Buscar função" value={q}
            onChange={(e) => { setQ(e.target.value); setI(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(i + 1, shown.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(i - 1, 0)); }
              if (e.key === 'Enter') choose(shown[i]);
              if (e.key === 'Escape') { e.stopPropagation(); close(); }
            }} />
          <div role="listbox" aria-label="Funções" className={s.fnList}>
            {shown.length === 0 && <div className={s.fnEmpty}>Nenhuma função encontrada</div>}
            {shown.map((f, k) => (
              <button key={f.lib + f.sig} type="button" role="option" aria-selected={k === i} className={k === i ? s.fnItemOn : s.fnItem} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(f)}>
                <MathMarkup latex={texOf(f.sig)} theme="dark" /><span className={s.fnLib}>{f.lib}</span>
                {f.description && <span className={s.fnDesc}>{f.description}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChoiceDialog() {
  const dialog = useWorkspace((x) => x.dialog);
  const [value, setValue] = useState('');
  const first = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!dialog) return;
    setValue(dialog.input ?? '');
    setTimeout(() => (dialog.input !== undefined ? input.current?.select() : first.current?.focus()), 0);
  }, [dialog]);
  if (!dialog) return null;
  const pick = (id: string) => dialog.resolve({ id, value });
  const cancel = dialog.buttons[dialog.buttons.length - 1].id;
  return (
    <div className={s.overlay} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); pick(cancel); } }}>
      <div role="alertdialog" aria-modal="true" aria-label={dialog.title} className={`${s.dialog} ${s.choice}`}>
        <div className={s.dlgHead}><span>{dialog.title}</span></div>
        <div className={s.choiceBody}>
          <p>{dialog.message}</p>
          {dialog.compare && (
            <div className={s.compare}>
              <div><div className={s.compareHead}>Na biblioteca</div><MathMarkup latex={texOf(dialog.compare.before)} theme="dark" /></div>
              <div><div className={s.compareHead}>No caderno</div><MathMarkup latex={texOf(dialog.compare.after)} theme="dark" /></div>
            </div>
          )}
          {dialog.input !== undefined && (
            <input ref={input} className={s.choiceInput} value={value} aria-label={dialog.message}
              onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && pick(dialog.buttons[0].id)} />
          )}
        </div>
        <div className={s.dlgFoot}>
          {dialog.buttons.map((b, i) => (
            <button key={b.id} ref={i === 0 ? first : undefined} type="button" className={b.primary ? s.btnPrimary : s.btn} onClick={() => pick(b.id)}>{b.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
