// Imprimir (SPEC 7.4, Ctrl+P): só o papel do documento ativo; no diálogo do sistema, "Salvar como PDF" gera o arquivo.
// O MathLive não quebra linha (BUG-025): na tela a expressão longa rola dentro do bloco, mas no papel a parte escondida
// sumiria. Por isso, antes de imprimir, cada expressão mais larga que o bloco diminui de fonte até caber.
// O layout de impressão (classe "printing" + @media print em global.css) já vale na medição, para a largura ser a do papel.

const MIN_FONT = 8; // px: menor que isso não se lê no papel
const RESTORE_MS = 120_000; // prazo: se o afterprint não vier, a tela volta sozinha

/** Devolve false quando não há papel para imprimir (por enquanto, só o caderno tem). */
export function printPage(): boolean {
  if (!document.querySelector('article')) return false;
  const root = document.documentElement;
  root.classList.add('printing');
  const shrunk: HTMLElement[] = [];
  for (const mf of document.querySelectorAll<HTMLElement>('article math-field')) {
    const content = mf.shadowRoot?.querySelector<HTMLElement>('.ML__content');
    const room = mf.clientWidth, need = content?.scrollWidth ?? 0;
    if (!room || need <= room + 1) continue;
    const size = parseFloat(getComputedStyle(mf).fontSize);
    mf.style.fontSize = `${Math.max(MIN_FONT, Math.floor(((size * room) / need) * 0.97 * 10) / 10)}px`; // abaixo do piso, aceita o corte
    shrunk.push(mf);
  }
  let timer = 0;
  const restore = () => {
    window.removeEventListener('afterprint', restore);
    clearTimeout(timer);
    root.classList.remove('printing');
    for (const mf of shrunk) mf.style.fontSize = '';
  };
  window.addEventListener('afterprint', restore);
  timer = window.setTimeout(restore, RESTORE_MS);
  window.print();
  return true;
}
