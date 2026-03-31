import { render, screen } from '@testing-library/react';
import { SignUp } from './signup';
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
    SignUp: () => <div>Clerk Sign Up</div>,
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
  window.history.pushState({}, '', '/signup');
});

test('signed-out users see the signup wrapper and clerk form', () => {
  render(<SignUp />);

  expect(screen.getByText(/create your gatorgoods account/i)).toBeInTheDocument();
  expect(screen.getByText('Clerk Sign Up')).toBeInTheDocument();
});

test('signed-in users are redirected from signup to listings', () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'user-1',
    },
  });

  render(<SignUp />);

  expect(window.location.pathname).toBe('/listings');
});
