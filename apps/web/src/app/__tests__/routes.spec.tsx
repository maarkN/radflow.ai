import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../routes';
import { CockpitLayout } from '../layout/cockpit-layout';
import { clearAuth, seedAuth } from '../../test/auth';

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
  beforeEach(() => {
    seedAuth();
  });

  it('renders the brand and main navigation', () => {
    renderAt('/');
    expect(screen.getByText('RadFlow')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Worklist' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
  });

  it('shows the signed-in user and a sign out button in the topbar', () => {
    renderAt('/');
    expect(screen.getByText(/Dra\. Ana Souza/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('shows the worklist page on the index route', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Worklist' })).toBeInTheDocument();
  });

  it('shows the admin page on /admin', () => {
    renderAt('/admin');
    expect(screen.getByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  });

  it('redirects to the login page when unauthenticated', () => {
    clearAuth();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/login" element={<p>sign in to continue</p>} />
          <Route path="/" element={<CockpitLayout />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/sign in to continue/)).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });
});
