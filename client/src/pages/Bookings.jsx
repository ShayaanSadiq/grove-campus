import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Badge, Banner, Empty, Loading, PageHeader } from '../components/ui.jsx';
import { campusToday, inr, prettyDate, useTitle } from '../format.js';

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function Bookings() {
  useTitle('My bookings');
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('upcoming');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const today = campusToday();

  useEffect(() => {
    let live = true;
    api('/api/bookings')
      .then((data) => { if (live) setBookings(data.bookings); })
      .catch((err) => { if (live) setError(err.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  const visible = bookings.filter((booking) => {
    if (tab === 'completed') return booking.status === 'completed';
    if (tab === 'cancelled') return booking.status === 'cancelled';
    if (tab === 'upcoming') {
      return booking.date >= today && !['completed', 'cancelled'].includes(booking.status);
    }
    return true;
  });
  const unpaid = bookings.filter((booking) => booking.paymentStatus === 'unpaid').length;

  return (
    <div className="container">
      <PageHeader eyebrow="Your holds" title="Bookings" lede="Pay for a pending hold, open the receipt, or leave a review once the office marks it complete." />
      <Banner>{error}</Banner>
      {unpaid > 0 ? <Banner kind="ok">{unpaid} booking{unpaid === 1 ? '' : 's'} still need payment.</Banner> : null}
      <div className="chips">
        {TABS.map((item) => (
          <button type="button" key={item.id} className={tab === item.id ? 'on' : ''} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </div>
      {loading ? <Loading label="Loading bookings" /> : null}
      {!loading && visible.length === 0 ? (
        <Empty title="No bookings here" action={<Link className="btn btn-primary" to="/services">Browse services</Link>}>
          {tab === 'upcoming' ? 'You have nothing coming up.' : 'Nothing in this list yet.'}
        </Empty>
      ) : null}
      <div className="booking-list">
        {visible.map((booking) => (
          <Link key={booking.id} to={`/bookings/${booking.id}`} className="booking-row">
            <div>
              <h2>{booking.service?.name || 'Campus service'}</h2>
              <p>{prettyDate(booking.date)} · {booking.timeSlot} · {booking.service?.location}</p>
            </div>
            <div className="booking-side">
              <Badge value={booking.status} />
              <Badge value={booking.paymentStatus} />
              <strong>{inr(booking.amount)}</strong>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
