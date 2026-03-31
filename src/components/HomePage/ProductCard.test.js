import {render, screen} from '@testing-library/react';
import ProductCard from './ProductCard';

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');

    return {
      Link: ({children, to, ...props}) => React.createElement('a', {href: to, ...props}, children),
    };
  },
  {virtual: true}
);

test('renders listing status badges so seeded reserved and sold items are obvious in the feed', () => {
  render(
    <ProductCard
      item={{
        id: 'listing-1',
        title: 'Mini Fridge',
        priceLabel: '$40',
        condition: 'Fair',
        category: 'Home & Garden',
        location: 'Heavener',
        sellerName: 'Scott Knowles',
        status: 'reserved',
        statusLabel: 'Reserved',
      }}
    />
  );

  expect(screen.getByText('Reserved')).toBeInTheDocument();
  expect(screen.getByText('Home & Garden')).toBeInTheDocument();
  expect(screen.getByText('Heavener')).toBeInTheDocument();
  expect(screen.getByText('Scott Knowles')).toBeInTheDocument();
  expect(screen.getByRole('link', {name: /mini fridge/i})).toHaveAttribute('href', '/items/listing-1');
});
