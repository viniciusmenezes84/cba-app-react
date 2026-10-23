import React, { useEffect, useState } from 'react';
import { Download, Share2, Smartphone, X, RefreshCw } from 'lucide-react';
import { applyPortalUpdate, hasPortalUpdate } from './portalPwa';

// Chromium supports beforeinstallprompt; iOS uses the browser Share menu.
let deferredInstallPrompt = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    window.dispatchEvent(new Event('cba-pwa-installable'));
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new Event('cba-pwa-installed'));
  });
}

export function isPortalStandalone() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator?.standalone === true);
}

export function getInstallPlatform(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  if (/iPad|iPhone|iPod/i.test(ua) || (/Macintosh/i.test(ua) &&
    typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function PortalInstallGuide({ onClose }) {
  const [installed, setInstalled] = useState(isPortalStandalone);
  const [installable, setInstallable] = useState(Boolean(deferredInstallPrompt));
  const [showHelp, setShowHelp] = useState(false);
  const platform = getInstallPlatform();

  useEffect(() => {
    const onAvailable = () => setInstallable(Boolean(deferredInstallPrompt));
    const onInstalled = () => { setInstalled(true); setInstallable(false); };
    const onEscape = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('cba-pwa-installable', onAvailable);
    window.addEventListener('cba-pwa-installed', onInstalled);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('cba-pwa-installable', onAvailable);
      window.removeEventListener('cba-pwa-installed', onInstalled);
      window.removeEventListener('keydown', onEscape);
    };
  }, [onClose]);

  const install = async () => {
    if (!deferredInstallPrompt) { setShowHelp(true); return; }
    const prompt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    setInstallable(false);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === 'accepted') setInstalled(true);
      else setShowHelp(true);
    } catch {
      setShowHelp(true);
    }
  };

  return <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="cba-install-title" onClick={event => event.stopPropagation()}
      className="w-full max-w-lg rounded-3xl border border-slate-600 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/icon-192x192.png" alt="" className="h-14 w-14 rounded-2xl"/>
          <div><p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Aplicativo do CBA</p>
            <h2 id="cba-install-title" className="text-xl font-black">Instalar Portal CBA</h2></div>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar instruções de instalação" className="rounded-xl p-2 text-slate-300 hover:bg-slate-800"><X className="h-5 w-5"/></button>
      </div>
      {installed ? <div className="mt-6 rounded-xl border border-emerald-700 bg-emerald-950/30 p-4">
        <p className="font-bold text-emerald-200">O Portal CBA já está aberto como aplicativo.</p>
        <p className="mt-2 text-sm text-slate-300">Você pode acessar jogos, presença e estatísticas pelo ícone da tela inicial.</p>
      </div> : <div className="mt-5 space-y-4">
        <p className="text-sm leading-6 text-slate-300">Adicione o CBA à tela inicial do celular. O portal abre sem a barra do navegador e continua atualizado pela web.</p>
        {installable && !showHelp && <button type="button" onClick={install}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 font-black text-white hover:bg-rose-500">
          <Download className="h-5 w-5"/> Instalar agora
        </button>}
        {platform === 'ios' ? <div className="rounded-xl bg-slate-800 p-4">
          <p className="mb-2 flex items-center gap-2 font-black"><Share2 className="h-4 w-4 text-rose-400"/> iPhone / iPad</p>
          <p className="text-sm leading-6 text-slate-300">1. Abra o Portal CBA no Safari. 2. Toque em <strong>Compartilhar</strong>. 3. Escolha <strong>Adicionar à Tela de Início</strong>. 4. Mantenha <strong>Abrir como App da Web</strong> ativado, se exibido, e toque em <strong>Adicionar</strong>.</p>
        </div> : platform === 'android' ? <div className="rounded-xl bg-slate-800 p-4">
          <p className="mb-2 flex items-center gap-2 font-black"><Smartphone className="h-4 w-4 text-rose-400"/> Android / Chrome</p>
          <p className="text-sm leading-6 text-slate-300">No Chrome, abra o menu de três pontos (⋮), escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong> e confirme.</p>
        </div> : <div className="rounded-xl bg-slate-800 p-4">
          <p className="font-black">No celular ou computador</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">Abra o CBA no Chrome, Edge ou Safari e use a opção de instalação do navegador. No iPhone, utilize o menu Compartilhar.</p>
        </div>}
        <p className="text-xs text-slate-400">A instalação é gratuita. É preciso conexão para login, jogos, presença e estatísticas. Não exige App Store ou Play Store.</p>
      </div>}
    </section>
  </div>;
}

export function PortalUpdateNotice() {
  const [hasUpdate, setHasUpdate] = useState(hasPortalUpdate);
  useEffect(() => {
    const update = () => setHasUpdate(hasPortalUpdate());
    window.addEventListener('cba-pwa-update-ready', update);
    update();
    return () => window.removeEventListener('cba-pwa-update-ready', update);
  }, []);
  if (!hasUpdate) return null;
  return <div role="status" className="fixed bottom-24 left-4 right-4 z-[145] mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-500 bg-slate-900 p-4 text-slate-100 shadow-2xl md:bottom-5">
    <p className="text-sm font-bold">Nova versão do Portal CBA disponível.</p>
    <button type="button" onClick={applyPortalUpdate} className="flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-black text-white">
      <RefreshCw className="h-4 w-4"/> Atualizar agora
    </button>
  </div>;
}
