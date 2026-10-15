import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { Badge, Banner, Loading, PageHeader } from '../../components/ui.jsx';
import { inr, prettyDate, useTitle } from '../../format.js';

export default function Dashboard() {
  useTitle('Admin');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    api('/api/admin/stats')
      .then((data) => { if (live) setStats(data); })
      .catch((err) => { if (live) setError(err.message); });
    return () => { live = false; };
  }, []);

  if (error) return <Banner>{error}</Banner>;
  if (!stats) return <Loading label="Adding up the campus" />;

  const maxRevenue = Math.max(...stats.revenueByMonth.map((item) => item.amount), 1);
  const maxCategory = Math.max(...stats.byCategory.map((item) => item.bookings), 1);
  const maxStatus = Math.max(...Object.values(stats.byStatus), 1);

  return (
    <>
      <PageHeader eyebrow="Administration" title="Campus overview" lede="Bookings, revenue, and the services people keep coming back to." />
      <div className="stats">
        <article><span>Bookings</span><strong>{stats.totals.bookings}</strong></article>
        <article><span>Revenue</span><strong>{inr(stats.totals.revenue)}</strong></article>
        <article><span>Students</span><strong>{stats.totals.students}</strong></article>
        <article><span>Average rating</span><strong>{stats.totals.averageRating ?? '—'}</strong></article>
      </div>
      <div className="split">
        <section className="panel">
          <h2>Revenue, last six months</h2>
          <div className="cols" aria-hidden="true">
            {stats.revenueByMonth.map((item) => (
              <div className="col" key={item.month}>
                <div className="col-bar" style={{ height: `${Math.max(item.amount ? 8 : 0, (item.amount / maxRevenue) * 120)}px` }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <p className="sr-only">{stats.revenueByMonth.map((item) => `${item.label} ${inr(item.amount)}`).join(', ')}</p>
        </section>
        <section className="panel">
          <h2>Bookings by category</h2>
          {stats.byCategory.map((item) => (
            <div className="bar-row" key={item.category}>
              <span>{item.category}</span>
              <div className="bar"><span style={{ width: `${(item.bookings / maxCategory) * 100}%` }} /></div>
              <strong>{item.bookings}</strong>
            </div>
          ))}
        </section>
      </div>
      <div className="split">
        <section className="panel">
          <h2>Status</h2>
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div className="bar-row" key={status}>
              <Badge value={status} />
              <div className="bar"><span style={{ width: `${(count / maxStatus) * 100}%` }} /></div>
              <strong>{count}</strong>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Most booked</h2>
          <ol className="rank">
            {stats.topServices.map((service) => (
              <li key={service.id}><span>{service.name}</span><strong>{service.bookings} · {inr(service.revenue)}</strong></li>
            ))}
          </ol>
        </section>
      </div>
      <div className="split">
        <section>
          <h2>Recent bookings</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Student</th><th>Service</th><th>Status</th></tr></thead>
              <tbody>
                {stats.recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{prettyDate(booking.date)} {booking.timeSlot}</td>
                    <td>{booking.user?.name}</td>
                    <td><Link to={`/services/${booking.service?.id}`}>{booking.service?.name}</Link></td>
                    <td><Badge value={booking.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>Latest reviews</h2>
          {stats.recentFeedback.map((item) => (
            <blockquote key={item.id}>
              <strong>{item.rating} ★</strong>
              <p>{item.comment}</p>
              <footer>{item.author}</footer>
            </blockquote>
          ))}
        </section>
      </div>
    </>
  );
}
