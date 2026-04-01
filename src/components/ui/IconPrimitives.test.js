import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';
import { Button } from './Button';
import { Input } from './Input';
import { PageHeader } from './PageHeader';
import { Select } from './Select';
import { Textarea } from './Textarea';

test('button icons keep the button accessible name intact', () => {
  render(
    <Button leadingIcon="message" trailingIcon="send">
      Send message
    </Button>
  );

  const button = screen.getByRole('button', { name: 'Send message' });

  expect(button).toBeInTheDocument();
  expect(button.querySelectorAll('svg[data-icon]').length).toBe(2);
});

test('fields with leading icons remain label-accessible and receive icon spacing', () => {
  const { container } = render(
    <div>
      <Input id="search" label="Search listings" leadingIcon="search" />
      <Select id="sort" label="Sort by" leadingIcon="sort" defaultValue="newest">
        <option value="newest">Newest first</option>
      </Select>
      <Textarea id="message" label="Message" leadingIcon="message" />
    </div>
  );

  expect(screen.getByLabelText('Search listings')).toHaveClass('pl-11');
  expect(screen.getByLabelText('Sort by')).toHaveClass('pl-11');
  expect(screen.getByLabelText('Message')).toHaveClass('pl-11');
  expect(container.querySelectorAll('svg[data-icon]').length).toBe(3);
});

test('page headers and badges can render decorative icons without changing text content', () => {
  const { container } = render(
    <div>
      <PageHeader
        eyebrow="Marketplace"
        icon="browse"
        title="Browse campus listings"
        description="Search campus listings and message sellers."
      />
      <Badge icon="rating">4.8/5</Badge>
    </div>
  );

  expect(screen.getByText('Marketplace')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Browse campus listings' })).toBeInTheDocument();
  expect(screen.getByText('4.8/5')).toBeInTheDocument();
  expect(container.querySelectorAll('svg[data-icon]').length).toBe(2);
});
