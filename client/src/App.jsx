import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { Layout } from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Services from './pages/Services.jsx';
import ServiceDetail from './pages/ServiceDetail.jsx';
import Bookings from './pages/Bookings.jsx';
import BookingDetail from './pages/BookingDetail.jsx';
import Profile from './pages/Profile.jsx';
import Wireframes from './pages/Wireframes.jsx';
import ApiMap from './pages/ApiMap.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import ManageServices from './pages/admin/ManageServices.jsx';
import ManageBookings from './pages/admin/ManageBookings.jsx';
import ManageUsers from './pages/admin/ManageUsers.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="services" element={<Services />} />
        <Route path="services/:id" element={<ServiceDetail />} />
        <Route path="design" element={<Wireframes />} />
        <Route path="api-map" element={<ApiMap />} />
        <Route path="bookings" element={<Protected><Bookings /></Protected>} />
        <Route path="bookings/:id" element={<Protected><BookingDetail /></Protected>} />
        <Route path="profile" element={<Protected><Profile /></Protected>} />
        <Route path="admin" element={<Protected roles={['admin']}><AdminLayout /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="services" element={<ManageServices />} />
          <Route path="bookings" element={<ManageBookings />} />
          <Route path="users" element={<ManageUsers />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function Protected({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <p className="center-screen">Loading Grove…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Forbidden />;
  return children;
}

function Forbidden() {
  return (
    <div className="container narrow">
      <h1>Office only</h1>
      <p>That area is for campus administrators.</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="container narrow">
      <h1>That page is not on the map</h1>
      <p>Try the service catalog instead.</p>
    </div>
  );
}
