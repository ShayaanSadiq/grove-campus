import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="container wide">
      <div className="admin-shell">
        <aside className="side-nav">
          <p className="eyebrow">Office</p>
          <NavLink to="/admin" end>Overview</NavLink>
          <NavLink to="/admin/services">Services</NavLink>
          <NavLink to="/admin/bookings">Bookings</NavLink>
          <NavLink to="/admin/users">Users</NavLink>
        </aside>
        <section>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
