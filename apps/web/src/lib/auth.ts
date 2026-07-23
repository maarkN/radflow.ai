export type AuthUser = {
  id: string;
  name: string;
  role: 'radiologist' | 'admin' | 'technologist';
};

export type AuthSession = { token: string; user: AuthUser };

const STORAGE_KEY = 'radflow.auth';
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3010/api/v1';

export function getAuth(): AuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Invalid credentials' : 'Login failed');
  }
  const body = (await response.json()) as { data: AuthSession };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(body.data));
  return body.data;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function authHeaders(): Record<string, string> {
  const auth = getAuth();
  return auth ? { authorization: `Bearer ${auth.token}` } : {};
}
