import { buildAgendaItems, calendarDates, googleCalendarUrl, makeCalendarFile } from './agendaCalendar';

const data = {
  user: { name: 'Ana' },
  games: [
    { id: 'g1', date: '2026-10-01', time: '19:00', location: 'Ginásio; CBA', confirmed: ['Ana'] },
    { id: 'cancelled', date: '2026-10-02', time: '18:00', cancelledAt: '2026-09-28', confirmed: [] },
    { id: 'old', date: '2026-09-28', time: '20:00', confirmed: [] }
  ],
  events: [
    { id: 'e1', name: 'Festa, CBA', startsAt: '2026-10-02T16:00:00Z', deadline: '2026-10-01', location: 'Clube', description: 'Levar camisa; água\nAtenção', attendees: [] },
    { id: 'old-event', startsAt: '2026-09-27T20:00:00Z', attendees: [] }
  ]
};

test('agenda une jogos e eventos futuros em ordem e preserva o estado de confirmação', () => {
  const items = buildAgendaItems(data, '2026-09-29');
  expect(items.map(item => `${item.kind}:${item.id}`)).toEqual(['jogo:g1', 'evento:e1']);
  expect(items.map(item => item.confirmed)).toEqual([true, false]);
  expect(calendarDates(items[0])).toEqual(['20261001T220000Z', '20261002T000000Z']);
  expect(calendarDates(items[1])).toEqual(['20261002T160000Z', '20261002T180000Z']);
});

test('arquivo iCalendar escapa os detalhes e gera datas UTC compatíveis', () => {
  const item = buildAgendaItems(data, '2026-09-29')[1];
  const content = makeCalendarFile(item, new Date('2026-09-29T18:00:00Z'));
  expect(content).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n');
  expect(content).toContain('DTSTART:20261002T160000Z\r\nDTEND:20261002T180000Z');
  expect(content).toContain('SUMMARY:Festa\\, CBA');
  expect(content).toContain('DESCRIPTION:Levar camisa\\; água\\nAtenção');
  expect(content).toContain('END:VEVENT\r\nEND:VCALENDAR\r\n');
  expect(content.split('\r\n').every(line => Buffer.byteLength(line, 'utf8') <= 75)).toBe(true);
  const url = new URL(googleCalendarUrl(item));
  expect(url.hostname).toBe('calendar.google.com');
  expect(url.searchParams.get('dates')).toBe('20261002T160000Z/20261002T180000Z');
});
