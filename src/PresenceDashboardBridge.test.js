import React from 'react';
import { render, screen } from '@testing-library/react';
import PresenceDashboardBridge from './PresenceDashboardBridge';
import { InitialDataContext } from './InitialDataContext';

jest.mock('react-chartjs-2', () => ({
  Bar: () => null, Doughnut: () => null, Line: () => null
}));

const data = { data: { dashboard: { dates:['2026-10-11','2026-10-18'], players:[
  { id:'me', name:'Minha Conta', attendance:{'2026-10-11':'✅ Presente','2026-10-18':'Ausente'}, dailyStats:{} },
  { id:'other', name:'Outro Atleta', attendance:{'2026-10-11':'✅ Presente','2026-10-18':'✅ Presente'}, dailyStats:{} }
]}}};

test('MEMBER vê a mesma visão coletiva de ADM, com cards, quórum e temporadas', () => {
  render(<InitialDataContext.Provider value={data}>
    <PresenceDashboardBridge isAdmin={false} athleteId="me" />
  </InitialDataContext.Provider>);
  expect(screen.getByRole('heading', { name:/Visão do elenco em 2026/ })).toBeInTheDocument();
  expect(screen.getByText('Quórum médio')).toBeInTheDocument();
  expect(screen.getByText('Top assiduidade')).toBeInTheDocument();
  expect(screen.getAllByText('Outro Atleta').length).toBeGreaterThan(0);
  expect(screen.getByText('Comparativo Anual de Presenças')).toBeInTheDocument();
  expect(screen.getByText('Temporada')).toBeInTheDocument();
});

test('ADM mantém os indicadores gerais do elenco', () => {
  render(<InitialDataContext.Provider value={data}>
    <PresenceDashboardBridge isAdmin />
  </InitialDataContext.Provider>);
  expect(screen.getByRole('heading', { name:/Visão do elenco em 2026/ })).toBeInTheDocument();
  expect(screen.getByText('Quórum médio')).toBeInTheDocument();
});

test('MEMBER sem atleta vinculado ainda pode consultar indicadores coletivos públicos do elenco', () => {
  render(<InitialDataContext.Provider value={data}>
    <PresenceDashboardBridge isAdmin={false} />
  </InitialDataContext.Provider>);
  expect(screen.getByRole('heading', { name:/Visão do elenco em 2026/ })).toBeInTheDocument();
  expect(screen.getAllByText('Outro Atleta').length).toBeGreaterThan(0);
  expect(screen.getByText('Quórum médio')).toBeInTheDocument();
});
