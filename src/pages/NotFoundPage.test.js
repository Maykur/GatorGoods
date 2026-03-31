import { render, screen } from '@testing-library/react';
import { NotFoundPage } from './NotFoundPage';
import { resetClerkState, setClerkState } from '../testUtils/mockClerk';

jest.mock('@clerk/react', () => {
  const React = require('react');
  const { getClerkState } = require('../testUtils/mockClerk');

  return {
    Show: ({ children, fallback, when }) => {
      const { isSignedIn } = getClerkState();
      const shouldRender = when === 'signed-in' ? isSignedIn : !isSignedIn;

      return shouldRender ? React.createElement(React.Fragment, null, children) : fallback || null;
    },
  };
});

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

beforeEach(() => {
  resetClerkState();
});

test('signed-out users get a sign-in CTA on the not-found page', () => {
  render(<NotFoundPage />);

  expect(screen.getByText(/chomp! page not found/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /open sign in/i })).toHaveAttribute('href', '/login');
});

test('signed-in users get a listings CTA on the not-found page', () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'user-1',
    },
  });

  render(<NotFoundPage />);

  expect(screen.getByRole('link', { name: /browse listings/i })).toHaveAttribute('href', '/listings');
});
