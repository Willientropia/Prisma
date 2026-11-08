// Caminhos da SPEC seção 4.4. Todo ícone do app é traço SVG, nunca caractere.
export const ICONS = {
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  home: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10', // ADENDO 04, D3
  open: 'M3 7h6l2 2h10v10H3z',
  save: 'M5 3h12l2 2v16H5zM8 3v6h8V3M8 21v-7h8v7',
  undo: 'M9 7l-5 5 5 5M4 12h10a6 6 0 016 6',
  redo: 'M15 7l5 5-5 5M20 12H10a6 6 0 00-6 6',
  print: 'M7 9V3h10v6M7 17H4V9h16v8h-3M7 14h10v7H7z',
  text: 'M5 5h14M12 5v14M9 19h6',
  calc: 'M4 8l6 8M10 8l-6 8M14 10h6M14 14h6',
  fn: 'M15 4c-3 0-4 2-4 5v11M7 10h8',
  plot: 'M4 4v16h16M7 15l4-5 3 3 5-6',
  check: 'M4 12l5 5L20 6',
  table: 'M3 5h18v14H3zM3 10h18M9 5v14',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
  ruler: 'M3 15L15 3l6 6L9 21zM7 11l2 2M10 8l2 2M13 5l2 2',
  run: 'M7 5v14l11-7z',
  stop: 'M6 6h12v12H6z',
  lib: 'M5 4h4v16H5zM10 4h4v16h-4zM15.5 5l3.5-1 2.5 15.5-3.5 1z',
  import: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  export: 'M12 15V3M7 8l5-5 5 5M4 21h16',
  section: 'M4 6h16M4 12h10M4 18h12',
  sigma: 'M18 4H6l6 8-6 8h12',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  insert: 'M4 4h10v10H4zM14 14l6 6M20 14v6h-6',
  book: 'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11',
  zoom: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  grid: 'M4 4h16v16H4zM4 12h16M12 4v16',
  align: 'M4 4v16M8 7h12M8 12h8M8 17h10',
  code: 'M8 6l-5 6 5 6M16 6l5 6-5 6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  tree: 'M6 3v18M6 8h8M6 16h8M14 5h6v6h-6zM14 13h6v6h-6z',
  clean: 'M4 20h16M7 16l9-9 3 3-9 9H7z',
  test: 'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3',
  close: 'M6 6l12 12M18 6L6 18',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 018 0v4', // Fase 4: biblioteca de fábrica
  chevron: 'M9 6l6 6-6 6', // ADENDO 05, E6: recolher área
  bold: 'M7 4h6a4 4 0 010 8H7zM7 12h7a4 4 0 010 8H7z',
  italic: 'M10 4h8M6 20h8M14 4l-4 16',
  heading: 'M6 4v16M18 4v16M6 12h12',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, stroke = 1.6, className }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={ICONS[name]} />
    </svg>
  );
}
