import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuth } from '../../lib/auth';
import { LoginPage } from '../login-page';

const session = {
  token: 'jwt-token',
  user: { id: 'a1a1a1a1-0000-4000-8000-000000000001', name: 'Dra. Ana Souza', role: 'radiologist' },
};

describe('LoginPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores the session after a successful login', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(
          async () => new Response(JSON.stringify({ data: session }), { status: 200 }),
        ),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ana' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'ana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(getAuth()?.token).toBe('jwt-token'));
    expect(getAuth()?.user.name).toBe('Dra. Ana Souza');
  });

  it('shows an error on invalid credentials and stores nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(
          async () => new Response(JSON.stringify({ statusCode: 401 }), { status: 401 }),
        ),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ana' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(getAuth()).toBeNull();
  });

  it('lists the demo accounts as one-click logins', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /Dra\. Ana — radiologist/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Alex — admin/ })).toBeInTheDocument();
  });
});
