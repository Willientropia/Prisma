import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { Logo, Tag } from '../components/ui';
import { APP_NAME, APP_YEAR, TYPE_INFO } from '../constants';
import { all, run } from '../commands/registry';
import { useWorkspace, activeDoc } from '../store/workspace';
import { FORMATS } from '../mock';
import { displayPath, shortenPath } from '../format/display';
import { RIBBONS, RIBBON_TABS } from './ribbons';
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

export function Ribbon() {
  const doc = useWorkspace(activeDoc);
  const tab = useWorkspace((x) => x.ribbonTab);
  const set = useWorkspace((x) => x.set);
  useWorkspace((x) => x.project); // botões que dependem do projeto mudam de estado
  if (!doc) return null;
  const cmds = all();
  return (
    <div className={s.ribbon}>
      <div role="tablist" aria-label="Guias da faixa de opções" className={s.rtabs}>
        {RIBBON_TABS.map(([id, text]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? s.rtOn : s.rt}
            onClick={() => set({ ribbonTab: id })}>{text}</button>
        ))}
      </div>
      <div className={s.rbody}>
        {RIBBONS[doc.type][tab].map((g) => (
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
      <button type="button" role="tab" aria-selected={active === 'home'} className={active === 'home' ? s.dtOn : s.dt} onClick={() => activate('home')}>
        <Tag color={active === 'home' ? 'var(--type-inicio)' : undefined}>INI</Tag>Início
      </button>
      {openDocs.map((d) => (
        <button key={d.id} type="button" role="tab" title={d.path ? displayPath(d.path) : 'Ainda não salvo'} aria-selected={active === d.id} className={active === d.id ? s.dtOn : s.dt} onClick={() => activate(d.id)}>
          <Tag color={active === d.id ? TYPE_INFO[d.type].color : undefined}>{TYPE_INFO[d.type].tag}</Tag>{d.name}{d.dirty ? '*' : ''}{d.readOnly ? ' (somente leitura)' : ''}
        </button>
      ))}
    </div>
  );
}

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
