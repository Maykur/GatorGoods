import { render, screen } from '@testing-library/react';
import { HomePage } from './pages/HomePage';

test('renders the home page headline', () => {
  render(<HomePage />);
  expect(
    screen.getByText(/buy, sell, and trade around campus/i)
  ).toBeInTheDocument();
});
