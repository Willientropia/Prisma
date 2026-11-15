// Desfazer e refazer do documento (pedido do usuário, 14/11). O documento é texto: cada edição guarda o texto de antes,
// então desfazer cobre tudo na ordem em que aconteceu (vista e zoom do gráfico, rótulos, regiões movidas, linhas digitadas).
// Edições seguidas no mesmo lugar do texto e em sequência rápida (a digitação grava a linha a cada tecla) viram um passo só;
// ações diferentes (zoom no gráfico, depois mover uma região) são passos separados mesmo quando vêm logo uma da outra.

const MAX = 200; // passos guardados por documento
const GROUP_MS = 800; // edições no mesmo lugar mais próximas que isso entram no mesmo passo
const ACTION_MS = 30; // edições quase simultâneas são uma ação só (mover várias regiões edita uma por uma)

type H = { undo: string[]; redo: string[]; last: number; at: number };
const hist = new Map<string, H>();
const of = (id: string) => { let h = hist.get(id); if (!h) hist.set(id, (h = { undo: [], redo: [], last: 0, at: -1 })); return h; };

/** Antes de uma edição do usuário em `at` (posição no texto): guarda o texto anterior, ou junta com o passo anterior (mesmo lugar, há pouco). */
export function record(id: string, before: string, at: number, now = performance.now()): void { // relógio monotônico: intervalo, não data
  const h = of(id);
  const sameAction = now - h.last < ACTION_MS;
  if (!h.undo.length || now - h.last > GROUP_MS || (at !== h.at && !sameAction)) { h.undo.push(before); if (h.undo.length > MAX) h.undo.shift(); }
  h.last = now;
  h.at = at;
  h.redo = [];
}

/** Texto para voltar, ou null se não há o que desfazer. */
export function undo(id: string, current: string): string | null {
  const h = hist.get(id);
  const prev = h?.undo.pop();
  if (prev === undefined) return null;
  h!.redo.push(current);
  h!.last = 0; // a próxima edição começa um passo novo
  return prev;
}

export function redo(id: string, current: string): string | null {
  const h = hist.get(id);
  const next = h?.redo.pop();
  if (next === undefined) return null;
  h!.undo.push(current);
  h!.last = 0;
  return next;
}

export const forget = (id: string) => void hist.delete(id);
/** O documento mudou de id (Salvar como, renomear): o histórico vai junto, e nada fica órfão no id antigo. */
export function rename(from: string, to: string): void {
  const h = hist.get(from);
  hist.delete(from);
  if (h) hist.set(to, h); else hist.delete(to);
}
