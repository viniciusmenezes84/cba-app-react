const BAHIA_TIME_ZONE = 'America/Bahia';
const todayBahia = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: BAHIA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

export function buildAgendaItems(data, today = todayBahia()) {
  const ownName = data?.user?.name || '';
  const games = (data?.games || []).filter(game => !game.cancelledAt && game.date >= today)
    .map(game => ({
      kind: 'jogo', id: game.id, title: 'Jogo do CBA', date: game.date,
      start: /^\d{2}:\d{2}$/.test(String(game.time || ''))
        ? new Date(`${game.date}T${game.time}:00-03:00`) : null,
      location: game.location || '', description: 'Jogo do CBA',
      confirmed: Boolean(ownName && (game.confirmed || []).includes(ownName))
    }));
  const events = (data?.events || []).filter(event => {
    const start = new Date(event.startsAt);
    return !Number.isNaN(start.getTime()) && new Intl.DateTimeFormat('en-CA', {
      timeZone: BAHIA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(start) >= today;
  }).map(event => ({
    kind: 'evento', id: event.id, title: event.name || 'Evento do CBA',
    start: new Date(event.startsAt), location: event.location || '',
    description: event.description || 'Evento do CBA', deadline: event.deadline || '',
    confirmed: Boolean(ownName && (event.attendees || []).includes(ownName))
  }));
  return [...games, ...events].sort((a, b) => {
    const left = a.start && !Number.isNaN(a.start.getTime()) ? a.start.getTime() : Infinity;
    const right = b.start && !Number.isNaN(b.start.getTime()) ? b.start.getTime() : Infinity;
    return left - right || String(a.id).localeCompare(String(b.id));
  });
}

export const calendarDates = item => {
  if (!item.start || Number.isNaN(item.start.getTime())) return null;
  const format = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return [format(item.start), format(new Date(item.start.getTime() + 2 * 60 * 60 * 1000))];
};

const escapeIcs = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

function foldLine(value) {
  const lines = [];
  let line = '';
  let bytes = 0;
  for (const char of value) {
    const point = char.codePointAt(0);
    const size = point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (bytes + size > 75) { lines.push(line); line = ' '; bytes = 1; }
    line += char;
    bytes += size;
  }
  lines.push(line);
  return lines.join('\r\n');
}

export function makeCalendarFile(item, now = new Date()) {
  const dates = calendarDates(item);
  if (!dates) return null;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const uid = `${item.kind}-${String(item.id).replace(/[^a-z0-9-]/gi, '')}@cba-app-react`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Portal CBA//Agenda//PT-BR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART:${dates[0]}`, `DTEND:${dates[1]}`,
    `SUMMARY:${escapeIcs(item.title)}`, `DESCRIPTION:${escapeIcs(item.description)}`,
    `LOCATION:${escapeIcs(item.location)}`, 'END:VEVENT', 'END:VCALENDAR'
  ].map(foldLine).join('\r\n') + '\r\n';
}

export function googleCalendarUrl(item) {
  const dates = calendarDates(item);
  if (!dates) return null;
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: item.title, dates: dates.join('/'),
    details: item.description, location: item.location
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
