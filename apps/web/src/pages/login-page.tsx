import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/auth';

const DEMO_ACCOUNTS = [
  { username: 'ana', password: 'ana', label: 'Dra. Ana — radiologist' },
  { username: 'bruno', password: 'bruno', label: 'Dr. Bruno — radiologist' },
  { username: 'admin', password: 'admin', label: 'Alex — admin' },
  { username: 'tech', password: 'tech', label: 'Tati — technologist' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (user = username, pass = password) => {
    setError(null);
    try {
      const session = await login(user, pass);
      navigate(session.user.role === 'admin' ? '/admin' : '/');
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="brand">RadFlow</div>
        <p className="muted">Radiology cockpit — sign in to continue</p>
        {error && <p className="alert">{error}</p>}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit">Sign in</button>
        </form>
        <div className="demo-accounts">
          <span className="muted">Demo accounts:</span>
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.username}
              className="ghost"
              onClick={() => void submit(account.username, account.password)}
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
