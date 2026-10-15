import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Banner, Field } from '../components/ui.jsx';
import { DEPARTMENTS } from '../constants.js';
import { useTitle } from '../format.js';
import { AuthSplit } from './Login.jsx';

export default function Register() {
  useTitle('Create account');
  const { user, ready, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '', studentId: '', department: 'Computer Science', phone: '',
  });
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  if (ready && user) return <Navigate to="/services" replace />;

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (form.password !== form.confirm) {
      setFields({ confirm: 'Those passwords do not match.' });
      return;
    }
    setBusy(true);
    setError('');
    setFields({});
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        studentId: form.studentId,
        department: form.department,
        phone: form.phone,
      });
      navigate('/services');
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit>
      <h2>Create a student account</h2>
      <p className="lede">Administrator accounts are issued by the campus office.</p>
      <Banner>{error}</Banner>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field label="Full name" error={fields.name}>
          <input value={form.name} autoComplete="name" onChange={(event) => set('name', event.target.value)} />
        </Field>
        <Field label="Email" error={fields.email}>
          <input type="email" autoComplete="email" value={form.email} onChange={(event) => set('email', event.target.value)} />
        </Field>
        <Field label="Student ID" error={fields.studentId} hint="4 to 16 letters or numbers">
          <input value={form.studentId} onChange={(event) => set('studentId', event.target.value)} />
        </Field>
        <Field label="Department" error={fields.department}>
          <select value={form.department} onChange={(event) => set('department', event.target.value)}>
            {DEPARTMENTS.filter((item) => item !== 'Administration').map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Phone" error={fields.phone} hint="Optional">
          <input value={form.phone} autoComplete="tel" onChange={(event) => set('phone', event.target.value)} />
        </Field>
        <Field label="Password" error={fields.password} hint="8 or more characters, with upper, lower, and a number">
          <input type="password" autoComplete="new-password" value={form.password} onChange={(event) => set('password', event.target.value)} />
        </Field>
        <Field label="Confirm password" error={fields.confirm}>
          <input type="password" autoComplete="new-password" value={form.confirm} onChange={(event) => set('confirm', event.target.value)} />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p>Already registered? <Link to="/login">Log in</Link></p>
    </AuthSplit>
  );
}
