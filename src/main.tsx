// Fora do Tauri (npm run dev, testes), carrega o Tauri simulado antes do app (ADENDO 03, C1).
// Só em desenvolvimento: o pacote de produção não leva o simulador nem os arquivos de teste.
if (import.meta.env.DEV && !('__TAURI_INTERNALS__' in window)) await import('./dev/tauri-mock');
await import('./start');

export {};
