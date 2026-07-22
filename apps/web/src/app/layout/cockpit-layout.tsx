import { NavLink, Outlet } from 'react-router-dom';

export function CockpitLayout() {
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
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
