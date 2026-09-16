let frame = null;

function normalizeReportsStatsLayout() {
  const statsNode = document.querySelector('[data-reports-stats-by-date="true"]');
  const dashboardNode = document.querySelector('[data-reports-dashboard-v2="true"]');

  if (!statsNode || !dashboardNode) return;

  // O painel de súmulas deve fazer parte do corpo do dashboard, não do cabeçalho
  // que contém título, filtros e botões de relatório.
  if (statsNode.parentElement !== dashboardNode) {
    dashboardNode.appendChild(statsNode);
  }

  statsNode.style.width = '100%';
  statsNode.style.maxWidth = '100%';
  statsNode.style.minWidth = '0';
  statsNode.style.marginTop = '1.5rem';

  // Remove a rolagem vertical interna responsável pela barra branca.
  // A página passa a controlar a rolagem vertical da tabela.
  statsNode.querySelectorAll('[class*="max-h-[430px]"]').forEach(element => {
    element.style.maxHeight = 'none';
    element.style.overflowY = 'visible';
  });
}

function scheduleNormalize() {
  if (frame !== null) return;
  frame = window.requestAnimationFrame(() => {
    frame = null;
    normalizeReportsStatsLayout();
  });
}

const observer = new MutationObserver(scheduleNormalize);
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener('load', scheduleNormalize);
scheduleNormalize();

export {};
