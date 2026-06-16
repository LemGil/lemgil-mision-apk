/// <reference types="vite/client" />

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean
    onReady?: (registration: ServiceWorkerRegistration) => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: any) => void
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>
}

interface JsPDFWithAutoTable {
  lastAutoTable?: { finalY: number };
}

declare module 'jspdf' {
  interface jsPDF extends JsPDFWithAutoTable {}
}
