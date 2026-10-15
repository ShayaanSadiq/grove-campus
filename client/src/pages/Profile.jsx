import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, Banner, Field, PageHeader } from '../components/ui.jsx';
import { DEPARTMENTS } from '../constants.js';
import { useTitle } from '../format.js';

export default function Profile() {
  useTitle('Profile');
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    department: user?.department || DEPARTMENTS[0],
    phone: user?.phone || '',
    studentId: user?.studentId || '',
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setFields({});
    try {
      const data = await api('/api/users/me', { method: 'PATCH', body: form });
      setUser(data.user);
      setNotice('Profile updated.');
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setFields({});
    try {
      await api('/api/users/me/password', { method: 'PATCH', body: passwords });
      setPasswords({ currentPassword: '', newPassword: '' });
      setNotice('Password updated.');
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <PageHeader eyebrow="Account" title="Profile" lede="Your email and role stay with the campus office. You can update the rest." />
      <Banner>{error}</Banner>
      <Banner kind="ok">{notice}</Banner>
      <div className="detail">
        <form className="panel stack" onSubmit={saveProfile} noValidate>
          <div className="badge-row">
            <Badge value={user?.status} />
            <span className="badge">{user?.role}</span>
          </div>
          <p className="muted">{user?.email}</p>
          <Field label="Full name" error={fields.name}>
            <input value={form.name} onChange={(event) => set('name', event.target.value)} />
          </Field>
          <Field label="Student ID" error={fields.studentId}>
            <input value={form.studentId} onChange={(event) => set('studentId', event.target.value)} />
          </Field>
          <Field label="Department" error={fields.department}>
            <select value={form.department} onChange={(event) => set('department', event.target.value)}>
              {DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Phone" error={fields.phone}>
            <input value={form.phone} onChange={(event) => set('phone', event.target.value)} />
          </Field>
          <button className="btn btn-primary" disabled={busy}>Save profile</button>
        </form>
        <form className="panel stack" onSubmit={savePassword} noValidate>
          <h2>Password</h2>
          <Field label="Current password" error={fields.currentPassword}>
            <input type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
          </Field>
          <Field label="New password" error={fields.newPassword} hint="Uppercase, lowercase, and a number">
            <input type="password" autoComplete="new-password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
          </Field>
          <button className="btn btn-ghost" disabled={busy}>Change password</button>
        </form>
      </div>
    </div>
  );
}
