import { render, screen } from '@testing-library/react';
import { HomePage } from './pages/HomePage';

jest.mock('@clerk/react', () => {
  const React = require('react');

  return {
    ClerkProvider: ({ children }) =>
      React.createElement(React.Fragment, null, children),
    Show: ({ children, fallback, when }) =>
      when === 'signed-out'
        ? React.createElement(React.Fragment, null, children)
        : fallback || null,
    SignIn: () => null,
    SignInButton: ({ children }) =>
      React.createElement(React.Fragment, null, children),
    SignUp: () => null,
    SignUpButton: ({ children }) =>
      React.createElement(React.Fragment, null, children),
    UserButton: () => React.createElement('div', null, 'User'),
  };
});

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');

    return {
      Link: ({ children, to, ...props }) =>
        React.createElement('a', { href: to, ...props }, children),
    };
  },
  { virtual: true }
);

test('renders the home page headline', () => {
  render(<HomePage />);

  expect(
    screen.getByText(/buy, sell, and trade around campus/i)
  ).toBeInTheDocument();
});
