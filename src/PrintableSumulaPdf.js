import { jsPDF } from 'jspdf';

// Ficha CBA de marcações acumuladas: dimensões reproduzem o modelo A4 validado.
// A grade usa a largura original para manter espaços de marcação manuscrita.
const WIDTH = 595.28;
const HEIGHT = 841.89;
const COLS = [24, 151, 227, 303, 379, 455, 531, 571];
const TABLE_TOP = 105.5;
const FIRST_ROW_TOP = 146;
const ROW_AREA = 629;
const MAX_PER_PAGE = 50;
const INK = [35, 35, 35];
const SECONDARY = [102, 102, 102];
const RULE = [160, 160, 160];
const HEADER_BG = [237, 237, 237];

export function printableSumulaAthletes(athletes = []) {
  if (!Array.isArray(athletes)) return [];
  return athletes.filter(row =>
    row && row.active !== false && typeof row.name === 'string'
    && row.name.trim() && !row.name.includes('*')
  ).map(row => row.name.trim())
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

function write(doc, value, x, y, size = 8, bold = false, color = INK, align = 'left') {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(String(value), x, y, { align });
}

function centered(doc, text, from, to, y, size, bold = false, color = INK) {
  write(doc, text, (from + to) / 2, y, size, bold, color, 'center');
}

function fittingName(doc, name, width, initialSize) {
  let size = initialSize;
  doc.setFont('helvetica', 'normal');
  while (size > 5.8) {
    doc.setFontSize(size);
    if (doc.getTextWidth(name) <= width) return { name, size };
    size -= 0.3;
  }
  doc.setFontSize(5.8);
  if (doc.getTextWidth(name) <= width) return { name, size: 5.8 };
  let truncated = name;
  while (truncated.length && doc.getTextWidth(truncated + '...') > width) truncated = truncated.slice(0, -1);
  return { name: truncated + '...', size: 5.8 };
}

function grid(doc, names, fullCount, pageNumber, pageCount) {
  const rowHeight = Math.min(17, ROW_AREA / Math.max(1, names.length));
  const tableEnd = FIRST_ROW_TOP + names.length * rowHeight;
  const bottom = tableEnd + 22;

  doc.setLineWidth(0.45);
  doc.setDrawColor(...RULE);
  doc.setFillColor(...HEADER_BG);

  write(doc, 'CBA | SÚMULA', 24, 30, 14, true);
  write(doc, pageCount === 1 ? 'PÁGINA ÚNICA' : `PÁGINA ${pageNumber}/${pageCount}`, 571, 29, 7, true, INK, 'right');
  write(doc, `${fullCount} jogadores ativos | Presença e totais acumulados do domingo`, 24, 46, 8, false, SECONDARY);
  write(doc, 'DATA: ____ / ____ / ______', 24, 65, 8, true);
  write(doc, 'QUADRA: ______________________', 182, 65, 7.5);
  write(doc, 'MESÁRIO: ____________________', 374, 65, 7.5);
  write(doc, '1 traço por ação, em grupos de 5. Acumule todos os jogos na mesma linha do jogador.', 24, 81, 7.5);
  write(doc, 'Ao encerrar, conte os traços e circule o total em cada campo. PTS = (C2 x 2) + (C3 x 3).', 24, 93, 7.2, false, SECONDARY);

  // Two-tier table header: 15pt grouped band and 25.5pt column names.
  doc.rect(COLS[0], TABLE_TOP, COLS[7] - COLS[0], FIRST_ROW_TOP - TABLE_TOP, 'F');
  doc.rect(COLS[0], tableEnd, COLS[7] - COLS[0], 22, 'F');
  // The original grouped header has three grouped regions.
  doc.line(COLS[0], TABLE_TOP, COLS[7], TABLE_TOP);
  doc.line(COLS[0], TABLE_TOP + 15, COLS[7], TABLE_TOP + 15);
  doc.line(COLS[0], FIRST_ROW_TOP, COLS[7], FIRST_ROW_TOP);
  doc.line(COLS[0], TABLE_TOP, COLS[0], bottom);
  doc.line(COLS[7], TABLE_TOP, COLS[7], bottom);
  doc.line(COLS[1], TABLE_TOP, COLS[1], bottom);
  doc.line(COLS[6], TABLE_TOP, COLS[6], bottom);
  for (const x of COLS.slice(2, 6)) doc.line(x, TABLE_TOP + 15, x, bottom);

  centered(doc, 'PRESENÇA', COLS[0], COLS[1], TABLE_TOP + 10.5, 7.5, true);
  centered(doc, 'MARCAÇÕES ACUMULADAS NO DOMINGO', COLS[1], COLS[6], TABLE_TOP + 10.5, 7.3, true);
  centered(doc, 'TOTAL', COLS[6], COLS[7], TABLE_TOP + 10.5, 7.5, true);
  const titleY = TABLE_TOP + 27;
  const subY = TABLE_TOP + 37;
  const headers = [
    ['JOGADOR', 'marque a presença'], ['C2', 'cestas de 2'], ['C3', 'cestas de 3'],
    ['REB', 'rebotes'], ['AST', 'assistências'], ['TOC', 'tocos'], ['PTS', 'pontos']
  ];
  headers.forEach(([head, sub], i) => {
    centered(doc, head, COLS[i], COLS[i + 1], titleY, 8.4, true);
    centered(doc, sub, COLS[i], COLS[i + 1], subY, 6.5, false, SECONDARY);
  });

  // Same thin grid, checkboxes and manual-stat fields as the validated sheet.
  names.forEach((name, i) => {
    const top = FIRST_ROW_TOP + i * rowHeight;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.45);
    doc.line(COLS[0], top + rowHeight, COLS[7], top + rowHeight);
    doc.rect(30, top + (rowHeight - 8.2) / 2, 8.2, 8.2);
    const nameFont = Math.min(8.5, Math.max(6.3, rowHeight * 0.53));
    const fitted = fittingName(doc, name, COLS[1] - 47, nameFont);
    write(doc, fitted.name, 44, top + rowHeight / 2 + fitted.size * 0.36, fitted.size);
  });
  doc.line(COLS[0], bottom, COLS[7], bottom);
  write(doc, 'TOTAL DO DOMINGO', 29, tableEnd + 15, 7.5, true);

  const noteY = Math.min(HEIGHT - 25, bottom + 16.5);
  write(doc, 'Exemplo:', 24, noteY, 7.5, true);
  // Five action marks, following the original tally notation.
  [0, 1, 2, 3].forEach(i => doc.line(59 + i * 4.1, noteY - 7, 59 + i * 4.1, noteY + 1));
  doc.line(57.5, noteY, 76, noteY - 8);
  write(doc, '= 5 ações. C2/C3 contam cestas, não pontos. Marque a presença ao lado do nome.', 83, noteY, 7.2, false, SECONDARY);
  write(doc, `${pageNumber}/${pageCount}`, 571, HEIGHT - 16, 6.4, false, SECONDARY, 'right');
}

/** PDF is generated locally using ONLY the roster returned by the authorized admin endpoint. */
export function buildPrintableSumulaPdf(athletes) {
  const names = printableSumulaAthletes(athletes);
  if (!names.length) throw new Error('Não há atletas ativos para imprimir na súmula.');
  const pages = [];
  for (let i = 0; i < names.length; i += MAX_PER_PAGE) pages.push(names.slice(i, i + MAX_PER_PAGE));
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
  pages.forEach((group, index) => {
    if (index) doc.addPage();
    grid(doc, group, names.length, index + 1, pages.length);
  });
  return doc;
}
