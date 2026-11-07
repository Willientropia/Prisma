// Registro único: ribbon, menu, atalhos, busca e linha de comando chamam daqui (SPEC seção 10).
export type Command = { id: string; label: string; shortcut?: string; run?: () => void };

const commands = new Map<string, Command>();
let fallback: (cmd: Command) => void = () => {};

/** Cria ou completa um comando; chamadas repetidas mesclam rótulo, atalho e handler. */
export function register(id: string, patch: Partial<Omit<Command, 'id'>>): void {
  const prev = commands.get(id);
  commands.set(id, { id, label: id, ...prev, ...patch });
}

/** O que fazer com comando ainda sem handler (fase 0: avisar na barra de status). */
export function onUnhandled(fn: (cmd: Command) => void): void {
  fallback = fn;
}

export function run(id: string): void {
  const cmd = commands.get(id);
  if (!cmd) throw new Error(`Comando desconhecido: ${id}`);
  if (cmd.run) cmd.run();
  else fallback(cmd);
}

export function all(): Command[] {
  return [...commands.values()];
}

/** "Ctrl+Shift+S" a partir de um KeyboardEvent, no mesmo formato de Command.shortcut. */
export function shortcutOf(e: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey' | 'key'>): string {
  const mods = [(e.ctrlKey || e.metaKey) && 'Ctrl', e.shiftKey && 'Shift', e.altKey && 'Alt'].filter(Boolean);
  return [...mods, e.key.length === 1 ? e.key.toUpperCase() : e.key].join('+');
}

export function byShortcut(sc: string): Command | undefined {
  return all().find((c) => c.shortcut === sc);
}
