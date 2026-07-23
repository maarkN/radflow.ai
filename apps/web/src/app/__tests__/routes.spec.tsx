import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '../routes';

vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listStudies: vi.fn().mockResolvedValue({
    data: [],
    meta: { total: 0, currentPage: 1, perPage: 100, lastPage: 0 },
  }),
}));

vi.mock('../../lib/socket', () => ({
  getSocket: () => ({ on: vi.fn(), off: vi.fn() }),
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
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
