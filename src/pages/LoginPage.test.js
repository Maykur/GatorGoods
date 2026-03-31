import { render, screen } from '@testing-library/react';
import { LoginPage } from './LoginPage';
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
    SignIn: () => <div>Clerk Sign In</div>,
  };
});

jest.mock(
  'react-router-dom',
  () => ({
    Navigate: ({ to }) => {
      global.window.history.pushState({}, '', to);
      return null;
    },
  }),
  { virtual: true }
);

beforeEach(() => {
  resetClerkState();
  window.history.pushState({}, '', '/login');
});

test('signed-out users see the login wrapper and clerk form', () => {
  render(<LoginPage />);

  expect(screen.getByText(/sign in and get back to campus deals/i)).toBeInTheDocument();
  expect(screen.getByText('Clerk Sign In')).toBeInTheDocument();
});

test('signed-in users are redirected from login to listings', () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'user-1',
    },
  });

  render(<LoginPage />);

  expect(window.location.pathname).toBe('/listings');
});
