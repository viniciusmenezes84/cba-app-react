import { useEffect } from 'react';

function findLegacyRankingCard() {
  const reportsRoot = document.querySelector('[data-reports-dashboard-v2="true"]');
  if (!reportsRoot) return null;

  const attendanceButton = [...reportsRoot.querySelectorAll('button')]
    .find(button => (
      button.textContent?.trim() === 'Assiduidade' &&
      !button.closest('[data-compact-reports-ranking="true"]')
    ));

  if (!attendanceButton) return null;

  let element = attendanceButton.parentElement;
  while (element && element !== reportsRoot) {
    const className = typeof element.className === 'string' ? element.className : '';
    if (className.includes('rounded-3xl') && className.includes('shadow-xl')) {
      return element;
    }
    element = element.parentElement;
  }

  return null;
}

export default function ReportsLegacyRankingHider() {
  useEffect(() => {
    let hiddenCard = null;

    const sync = () => {
      const reportsButton = document.querySelector('button[title="Relatórios"]');
      const isReports = Boolean(reportsButton?.className?.includes('scale-110'));
      const compactMount = document.querySelector('[data-compact-reports-ranking="true"]');
      const legacyCard = findLegacyRankingCard();

      if (hiddenCard && hiddenCard !== legacyCard) {
        hiddenCard.style.display = '';
        hiddenCard = null;
      }

      if (!legacyCard) return;
      hiddenCard = legacyCard;

      // O ranking antigo só deve aparecer como fallback quando o compacto não existe.
      legacyCard.style.display = isReports && compactMount ? 'none' : '';
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => {
      observer.disconnect();
      if (hiddenCard) hiddenCard.style.display = '';
    };
  }, []);

  return null;
}
