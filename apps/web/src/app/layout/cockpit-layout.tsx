import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getAuth, logout } from '../../lib/auth';

export function CockpitLayout() {
  const navigate = useNavigate();
  const auth = getAuth();
  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="cockpit">
      <aside className="sidebar">
        <div className="brand">RadFlow</div>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Worklist
          </NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
      </aside>
      <div className="content">
        <header className="topbar">
          <span>Radiology Cockpit</span>
          <span className="topbar-user">
            {auth.user.name} · {auth.user.role}
            <button
              className="ghost"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Sign out
            </button>
          </span>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
