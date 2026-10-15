import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Badge, Banner, Loading, PageHeader } from '../../components/ui.jsx';
import { prettyDate, useTitle } from '../../format.js';

const STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

export default function ManageBookings() {
  useTitle('Manage bookings');
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (q) query.set('q', q);
    api(`/api/bookings?${query.toString()}`)
      .then((data) => { if (live) setBookings(data.bookings); })
      .catch((err) => { if (live) setError(err.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [status, q]);

  async function updateStatus(booking, next) {
    setError('');
    try {
      const data = await api(`/api/bookings/${booking.id}/status`, { method: 'PATCH', body: { status: next } });
      setBookings((current) => current.flatMap((item) => {
        if (item.id !== booking.id) return [item];
        if (status && data.booking.status !== status) return [];
        return [data.booking];
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Operations" title="Bookings" lede="Move a hold from pending to complete, or cancel it. A paid cancellation is marked refunded." />
      <Banner>{error}</Banner>
      <div className="toolbar">
        <input value={q} placeholder="Search student or service" onChange={(event) => setQ(event.target.value)} />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}
        </select>
      </div>
      {loading ? <Loading label="Loading bookings" /> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>When</th><th>Student</th><th>Service</th><th>Payment</th><th>Status</th></tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{prettyDate(booking.date)}<br />{booking.timeSlot}</td>
                  <td>{booking.user?.name}<br /><span className="muted">{booking.user?.email}</span></td>
                  <td>{booking.service?.name}</td>
                  <td><Badge value={booking.paymentStatus} /></td>
                  <td>
                    <select aria-label={`Status for ${booking.service?.name}`} value={booking.status} onChange={(event) => updateStatus(booking, event.target.value)}>
                      {STATUSES.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
