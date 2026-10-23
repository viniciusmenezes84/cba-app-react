// Categorias amplas para diagnóstico; não armazenamos user-agent bruto nem fingerprint.
export function getDeviceCategory() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return {};
  const agent = navigator.userAgent || '';
  const os = /Android/i.test(agent) ? 'Android'
    : /iPhone|iPad|iPod/i.test(agent) ? 'iOS'
    : /Windows/i.test(agent) ? 'Windows'
    : /Mac OS X|Macintosh/i.test(agent) ? 'macOS'
    : /Linux/i.test(agent) ? 'Linux' : 'Outro';
  const type = /iPad|Tablet/i.test(agent) || (/Android/i.test(agent) && !/Mobile/i.test(agent))
    ? 'tablet' : /Mobile|iPhone|iPod|Android/i.test(agent) ? 'celular' : 'desktop';
  const browser = /Edg\//i.test(agent) ? 'Edge'
    : /Firefox|FxiOS/i.test(agent) ? 'Firefox'
    : /Chrome|CriOS/i.test(agent) ? 'Chrome'
    : /Safari/i.test(agent) ? 'Safari' : 'Outro';
  const width = window.screen?.width || 0;
  return {
    type, os, browser,
    mode: window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone ? 'pwa' : 'navegador',
    language: /^(pt|en|es)/i.test(navigator.language || '') ? (navigator.language || '').slice(0,2).toLowerCase() : 'outro',
    screen: width <= 480 ? 'compacta' : width <= 1024 ? 'media' : 'ampla'
  };
}
