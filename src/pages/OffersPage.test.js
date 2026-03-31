import { render, screen } from '@testing-library/react';
import { OffersPage } from './OffersPage';

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');

    return {
      Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
    };
  },
  { virtual: true }
);

test('offers placeholder keeps next steps visible', () => {
  render(<OffersPage />);

  expect(screen.getByText(/offers inbox is coming soon/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /browse listings/i })).toHaveAttribute('href', '/listings');
  expect(screen.getByRole('link', { name: /open messages/i })).toHaveAttribute('href', '/messages');
});
