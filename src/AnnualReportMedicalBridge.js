import { useEffect } from 'react';

const MEDICAL_URL = 'https://vqirdswgchlcxevepamu.supabase.co/functions/v1/cba-medical';
const SESSION_KEYS = ['cba_session_v2', 'cba_session_v1'];

let currentRecords = [];
let currentError = '';
let replayingAnnualClick = false;

function readToken() {
  for (const key of SESSION_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token = parsed?.user?.token || parsed?.user?.user?.token || parsed?.token;
      if (token) return token;
    } catch { /* tenta a próxima chave */ }
  }

  try {
    const raw = window.sessionStorage.getItem('cba_session_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.token || parsed?.user?.token || null;
    }
  } catch { /* sem impacto */ }

  return null;
}

async function refreshMedicalRecords() {
  const token = readToken();
  if (!token) throw new Error('Sessão não encontrada.');

  const response = await fetch(MEDICAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'bootstrap', token })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.result === 'error') {
    throw new Error(data?.message || 'Falha ao carregar o Departamento Médico.');
  }

  currentRecords = (Array.isArray(data?.records) ? data.records : [])
    .filter(record => !record?.dischargedAt && String(record?.status || '').toLowerCase() !== 'alta')
    .sort((a, b) => {
      const da = String(a?.expectedReturn || '9999-12-31');
      const db = String(b?.expectedReturn || '9999-12-31');
      return da.localeCompare(db) || String(a?.playerName || '').localeCompare(String(b?.playerName || ''));
    });
  currentError = '';
  return currentRecords;
}

function formatDate(value) {
  if (!value) return '—';
  const parts = String(value).slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
}

function makeCell(text, options = {}) {
  const cell = document.createElement(options.header ? 'th' : 'td');
  cell.textContent = text;
  cell.style.padding = options.header ? '9px 10px' : '10px';
  cell.style.textAlign = options.align || 'left';
  cell.style.fontSize = options.header ? '9px' : '10px';
  cell.style.fontWeight = options.header ? '800' : (options.bold ? '800' : '600');
  cell.style.color = options.color || (options.header ? '#64748b' : '#334155');
  cell.style.textTransform = options.header ? 'uppercase' : 'none';
  cell.style.letterSpacing = options.header ? '0.06em' : 'normal';
  cell.style.borderBottom = options.header ? '1px solid #e2e8f0' : '1px solid #f1f5f9';
  return cell;
}

function statusColor(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('transição')) return '#047857';
  if (value.includes('fisioterapia')) return '#c2410c';
  if (value.includes('repouso') || value.includes('afastado')) return '#b91c1c';
  if (value.includes('exame')) return '#a16207';
  return '#475569';
}

function patchAnnualReport() {
  const root = document.getElementById('pdf-v2-annual');
  if (!root) return;

  const heading = [...root.querySelectorAll('h3')]
    .find(element => element.textContent?.includes('Líderes por Fundamento'));
  if (!heading) return;

  heading.textContent = '3. Departamento Médico';
  const content = heading.nextElementSibling;
  if (!content) return;

  content.replaceChildren();
  content.className = 'mb-6';
  content.style.display = 'block';

  const panel = document.createElement('div');
  panel.style.border = '1px solid #dbeafe';
  panel.style.borderRadius = '12px';
  panel.style.overflow = 'hidden';
  panel.style.background = '#ffffff';

  const summary = document.createElement('div');
  summary.style.padding = '12px 14px';
  summary.style.background = '#eff6ff';
  summary.style.borderBottom = '1px solid #dbeafe';

  const title = document.createElement('p');
  title.textContent = currentError
    ? 'Situação atual do Departamento Médico'
    : `${currentRecords.length} atleta${currentRecords.length === 1 ? '' : 's'} em acompanhamento`;
  title.style.margin = '0';
  title.style.fontSize = '11px';
  title.style.fontWeight = '900';
  title.style.color = '#1e3a8a';
  title.style.textTransform = 'uppercase';

  const note = document.createElement('p');
  note.textContent = currentError
    ? 'Não foi possível consultar o Departamento Médico durante a geração deste relatório.'
    : 'Situação atual na data de geração. A seção é atualizada automaticamente a partir do Departamento Médico.';
  note.style.margin = '3px 0 0';
  note.style.fontSize = '9px';
  note.style.color = '#475569';

  summary.append(title, note);
  panel.appendChild(summary);

  if (currentError) {
    const error = document.createElement('div');
    error.textContent = currentError;
    error.style.padding = '16px';
    error.style.fontSize = '10px';
    error.style.fontWeight = '700';
    error.style.color = '#b91c1c';
    panel.appendChild(error);
    content.appendChild(panel);
    return;
  }

  if (!currentRecords.length) {
    const empty = document.createElement('div');
    empty.style.padding = '18px';
    empty.style.textAlign = 'center';
    empty.style.fontSize = '10px';
    empty.style.fontWeight = '700';
    empty.style.color = '#64748b';
    empty.textContent = 'Nenhum atleta está no Departamento Médico no momento.';
    panel.appendChild(empty);
    content.appendChild(panel);
    return;
  }

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.tableLayout = 'fixed';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const athleteHeader = makeCell('Atleta', { header: true });
  athleteHeader.style.width = '43%';
  const statusHeader = makeCell('Situação', { header: true });
  statusHeader.style.width = '34%';
  const returnHeader = makeCell('Retorno previsto', { header: true, align: 'right' });
  returnHeader.style.width = '23%';
  headerRow.append(athleteHeader, statusHeader, returnHeader);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  currentRecords.forEach(record => {
    const row = document.createElement('tr');
    row.append(
      makeCell(String(record?.playerName || 'Atleta'), { bold: true, color: '#0f172a' }),
      makeCell(String(record?.status || 'Em acompanhamento'), { bold: true, color: statusColor(record?.status) }),
      makeCell(formatDate(record?.expectedReturn), { align: 'right', bold: true, color: '#475569' })
    );
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  panel.appendChild(table);
  content.appendChild(panel);
}

export default function AnnualReportMedicalBridge() {
  useEffect(() => {
    const observer = new MutationObserver(() => patchAnnualReport());
    observer.observe(document.body, { childList: true, subtree: true });
    patchAnnualReport();

    const handleAnnualClick = async event => {
      const button = event.target?.closest?.('button[title="Relatório Anual v2"]');
      if (!button || replayingAnnualClick || button.disabled) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

      try {
        await refreshMedicalRecords();
      } catch (error) {
        currentRecords = [];
        currentError = error?.message || 'Falha ao carregar o Departamento Médico.';
      }

      replayingAnnualClick = true;
      try {
        button.click();
      } finally {
        replayingAnnualClick = false;
      }
    };

    document.addEventListener('click', handleAnnualClick, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleAnnualClick, true);
    };
  }, []);

  return null;
}
