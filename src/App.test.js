import { render, screen } from '@testing-library/react';
import App from './App';

test('mostra a entrada do Portal CBA', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: 'Entrar no Portal' })).toBeInTheDocument();
});
