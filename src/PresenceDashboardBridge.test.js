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

test('membro visualiza apenas o próprio histórico sem quórum, recordistas ou nomes de outros', () => {
  render(<InitialDataContext.Provider value={data}>
    <PresenceDashboardBridge isAdmin={false} athleteId="me" />
  </InitialDataContext.Provider>);
  expect(screen.getByRole('heading', { name:'Meu histórico de presença' })).toBeInTheDocument();
  expect(screen.getByText('50%')).toBeInTheDocument();
  expect(screen.queryByText('Outro Atleta')).not.toBeInTheDocument();
  expect(screen.queryByText('Quórum médio')).not.toBeInTheDocument();
});

test('ADM mantém os indicadores gerais do elenco', () => {
  render(<InitialDataContext.Provider value={data}>
    <PresenceDashboardBridge isAdmin />
  </InitialDataContext.Provider>);
  expect(screen.getByRole('heading', { name:/Visão do elenco em 2026/ })).toBeInTheDocument();
  expect(screen.getByText('Quórum médio')).toBeInTheDocument();
});

test('MEMBER sem atleta vinculado não vê registros de terceiros', () => {
  render(<InitialDataContext.Provider value={data}>
    <PresenceDashboardBridge isAdmin={false} />
  </InitialDataContext.Provider>);
  expect(screen.getByRole('heading', { name:'Meu histórico de presença' })).toBeInTheDocument();
  expect(screen.queryByText('Outro Atleta')).not.toBeInTheDocument();
  expect(screen.getByText('Nenhum registro de presença encontrado.')).toBeInTheDocument();
});
