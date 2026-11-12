// A6-ROBUSTEZ-04: linha longa demais para o desenho do LaTeX aparece como "Não foi possível ler esta linha", sem derrubar a tela.
import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import '../styles/fonts.css';
import '../styles/tokens.css';
import '../styles/global.css';
import { MathLine, isKnownUnit } from './MathLine';

let root: Root | null = null;
let host: HTMLDivElement | null = null;
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; host = null; });

describe('[A6-ROBUSTEZ-04] linha com 3000 termos', () => {
  it('a região mostra o erro de leitura e não o texto cru', async () => {
    const raw = Array.from({ length: 3000 }, () => '1').join('+');
    host = document.createElement('div'); document.body.append(host);
    root = createRoot(host);
    await act(async () => { root!.render(<MathLine raw={raw} ctx={{ defined: new Set(), isUnit: isKnownUnit }} theme="dark" size={20} onWrite={() => {}} />); });
    expect(host.textContent).toContain('Não foi possível ler esta linha');
    expect(host.textContent).not.toContain(':=');
  });
});
