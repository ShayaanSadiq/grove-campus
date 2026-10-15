import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="nav">
        <Link to="/" className="brand">
          <Mark />
          <span>
            <strong>Grove</strong>
            <small>Campus services</small>
          </span>
        </Link>
        <button type="button" className="nav-toggle btn btn-ghost btn-small" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen((value) => !value)}>
          {open ? 'Close' : 'Menu'}
        </button>
        <nav id="nav-links" className={open ? 'nav-links open' : 'nav-links'}>
          <NavLink to="/services">Services</NavLink>
          {user ? <NavLink to="/bookings">My bookings</NavLink> : null}
          {user?.role === 'admin' ? <NavLink to="/admin">Admin</NavLink> : null}
          <NavLink to="/design">Wireframes</NavLink>
          {user ? (
            <>
              <NavLink to="/profile">{user.name.split(' ')[0]}</NavLink>
              <button type="button" className="btn btn-ghost btn-small" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <NavLink to="/register" className="btn btn-primary btn-small">Create account</NavLink>
            </>
          )}
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          <p>Grove · Smart Campus Service Booking and Management System</p>
          <p>
            <Link to="/services">Services</Link>
            {' · '}
            <Link to="/design">Wireframes</Link>
            {' · '}
            <Link to="/api-map">API map</Link>
          </p>
        </div>
      </footer>
    </>
  );
}

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" />
      <path d="M8 22c4-9 6-9 8-14 2 5 4 5 8 14" />
      <path d="M16 8v14" />
    </svg>
  );
}
