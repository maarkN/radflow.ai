import type { AuthSession } from '../lib/auth';

export const TEST_SESSION: AuthSession = {
  token: 'test-token',
  user: {
    id: 'a1a1a1a1-0000-4000-8000-000000000001',
    name: 'Dra. Ana Souza',
    role: 'radiologist',
  },
};

export function seedAuth(session: AuthSession = TEST_SESSION): void {
  localStorage.setItem('radflow.auth', JSON.stringify(session));
}

export function clearAuth(): void {
  localStorage.removeItem('radflow.auth');
}
