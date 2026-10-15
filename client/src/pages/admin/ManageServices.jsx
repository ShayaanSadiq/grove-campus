import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Badge, Banner, Field, Loading, Modal, PageHeader } from '../../components/ui.jsx';
import { CATEGORIES, SLOTS } from '../../constants.js';
import { inr, useTitle } from '../../format.js';

const blank = () => ({
  name: '',
  category: 'Academics',
  description: '',
  location: '',
  price: 100,
  durationMinutes: 60,
  capacity: 1,
  status: 'active',
  slots: ['09:00', '10:00', '11:00'],
});

export default function ManageServices() {
  useTitle('Manage services');
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    return api('/api/services?includeInactive=1&sort=name')
      .then((data) => setServices(data.services))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleSlot(slot) {
    setForm((current) => ({
      ...current,
      slots: current.slots.includes(slot) ? current.slots.filter((item) => item !== slot) : [...current.slots, slot],
    }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setFields({});
    try {
      const body = { ...form, price: Number(form.price), durationMinutes: Number(form.durationMinutes), capacity: Number(form.capacity) };
      if (form.id) await api(`/api/services/${form.id}`, { method: 'PUT', body });
      else await api('/api/services', { method: 'POST', body });
      setForm(null);
      setNotice(form.id ? 'Service updated.' : 'Service added.');
      await load();
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  async function remove(service) {
    setError('');
    setNotice('');
    try {
      const data = await api(`/api/services/${service.id}`, { method: 'DELETE' });
      setNotice(data.deactivated ? 'This service has bookings, so it was marked inactive.' : 'Service removed.');
      setConfirmId('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Catalog" title="Services" lede="Add a room, change a price, or retire something the campus no longer offers.">
        <button type="button" className="btn btn-primary" onClick={() => { setFields({}); setForm(blank()); }}>Add service</button>
      </PageHeader>
      <Banner>{error}</Banner>
      <Banner kind="ok">{notice}</Banner>
      {loading ? <Loading label="Loading services" /> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Service</th><th>Category</th><th>Price</th><th>Capacity</th><th>Status</th><th>Holds</th><th></th></tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>{service.name}<br /><span className="muted">{service.location}</span></td>
                  <td>{service.category}</td>
                  <td>{inr(service.price)}</td>
                  <td>{service.capacity}</td>
                  <td><Badge value={service.status} /></td>
                  <td>{service.bookingCount}</td>
                  <td className="actions">
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => { setFields({}); setForm(service); }}>Edit</button>
                    {confirmId === service.id ? (
                      <button type="button" className="btn btn-danger btn-small" onClick={() => remove(service)}>Confirm</button>
                    ) : (
                      <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmId(service.id)}>Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {form ? (
        <Modal title={form.id ? 'Edit service' : 'New service'} onClose={() => setForm(null)}>
          <form className="form-grid" onSubmit={save} noValidate>
            <div className="span-2"><Banner>{error}</Banner></div>
            <Field label="Name" error={fields.name}><input value={form.name} onChange={(event) => update('name', event.target.value)} /></Field>
            <Field label="Category" error={fields.category}>
              <select value={form.category} onChange={(event) => update('category', event.target.value)}>
                {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <div className="span-2">
              <Field label="Description" error={fields.description} hint="At least 20 characters">
                <textarea value={form.description} onChange={(event) => update('description', event.target.value)} />
              </Field>
            </div>
            <Field label="Location" error={fields.location}><input value={form.location} onChange={(event) => update('location', event.target.value)} /></Field>
            <Field label="Price in rupees" error={fields.price}><input type="number" min="0" value={form.price} onChange={(event) => update('price', event.target.value)} /></Field>
            <Field label="Duration (minutes)" error={fields.durationMinutes}><input type="number" min="15" value={form.durationMinutes} onChange={(event) => update('durationMinutes', event.target.value)} /></Field>
            <Field label="Capacity per slot" error={fields.capacity}><input type="number" min="1" value={form.capacity} onChange={(event) => update('capacity', event.target.value)} /></Field>
            <Field label="Status" error={fields.status}>
              <select value={form.status} onChange={(event) => update('status', event.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <div className="span-2">
              <span className="field-label">Slots</span>
              <div className="slot-picker">
                {SLOTS.map((slot) => (
                  <label key={slot} className={form.slots.includes(slot) ? 'on' : ''}>
                    <input type="checkbox" checked={form.slots.includes(slot)} onChange={() => toggleSlot(slot)} />
                    {slot}
                  </label>
                ))}
              </div>
              {fields.slots ? <small className="field-error">{fields.slots}</small> : null}
            </div>
            <div className="span-2"><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save service'}</button></div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
