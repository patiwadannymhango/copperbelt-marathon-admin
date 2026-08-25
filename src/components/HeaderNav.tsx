import { NavLink } from 'react-router-dom';

export default function HeaderNav() {
  return (
    <nav className="nav-tabs">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
        Registrations
      </NavLink>
      <NavLink to="/vendors" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
        Vendors
      </NavLink>
    </nav>
  );
}
