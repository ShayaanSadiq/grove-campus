import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Banner, Field } from '../components/ui.jsx';
import { useTitle } from '../format.js';

export default function Login() {
  useTitle('Log in');
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  if (ready && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/bookings'} replace />;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      const next = await login(email, password);
      const from = location.state?.from?.pathname;
      navigate(from || (next.role === 'admin' ? '/admin' : '/bookings'));
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit>
      <h2>Welcome back</h2>
      <p className="lede">Use your campus email. Students land on bookings. Administrators land on the dashboard.</p>
      <Banner>{error}</Banner>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field label="Email" error={fields.email}>
          <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Password" error={fields.password}>
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="demo">
        <strong>Demo access</strong>
        <p>Student · <code>ananya@grove.edu</code> · <code>Student@123</code></p>
        <p>Admin · <code>admin@grove.edu</code> · <code>Admin@123</code></p>
      </div>
      <p>New here? <Link to="/register">Create a student account</Link></p>
    </AuthSplit>
  );
}

export function AuthSplit({ children }) {
  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Grove</p>
        <h1>Campus services, without the counter queue.</h1>
        <ul>
          <li>Search rooms, labs, courts, and care</li>
          <li>Pay with a card or the campus wallet</li>
          <li>Track every booking until it is done</li>
        </ul>
      </section>
      <section className="auth-card">{children}</section>
    </div>
  );
}
