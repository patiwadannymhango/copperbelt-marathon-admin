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
      <NavLink to="/summary" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
        Summary
      </NavLink>
      <NavLink to="/lenco-records" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
        Lenco Records
      </NavLink>
    </nav>
  );
}
