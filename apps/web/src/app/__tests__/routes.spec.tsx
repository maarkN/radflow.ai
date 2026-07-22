import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { routes } from '../routes';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe('cockpit shell', () => {
  it('renders the brand and main navigation', () => {
    renderAt('/');
    expect(screen.getByText('RadFlow')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Worklist' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
  });

  it('shows the worklist page on the index route', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Worklist' })).toBeInTheDocument();
  });

  it('shows the admin page on /admin', () => {
    renderAt('/admin');
    expect(screen.getByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  });
});
