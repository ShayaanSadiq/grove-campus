import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { CATEGORIES } from '../constants.js';
import { ServiceLink } from '../components/cards.jsx';
import { inr, useTitle } from '../format.js';

export default function Home() {
  useTitle('');
  const { user } = useAuth();
  const secondary = user?.role === 'admin'
    ? { to: '/admin', label: 'Open admin' }
    : user
      ? { to: '/services', label: 'Browse services' }
      : { to: '/register', label: 'Create account' };
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let live = true;
    api('/api/meta').then((data) => { if (live) setStats(data.publicStats); }).catch(() => {});
    api('/api/services?sort=rating').then((data) => { if (live) setServices(data.services.slice(0, 6)); }).catch(() => {});
    return () => { live = false; };
  }, []);

  return (
    <div className="container">
      <section className="hero">
        <div>
          <p className="eyebrow">Smart campus booking</p>
          <h1>Reserve the room before you cross the quad.</h1>
          <p className="lede">Study rooms, lab benches, courts, clinic hours, and shuttle seats. Search them, pay if there is a charge, and follow the booking until it is done.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to={user ? '/bookings' : '/services'}>{user ? 'My bookings' : 'Browse services'}</Link>
            <Link className="btn btn-ghost" to={secondary.to}>{secondary.label}</Link>
          </div>
          <dl className="hero-stats">
            <div><dt>Open services</dt><dd>{stats?.services ?? '—'}</dd></div>
            <div><dt>Categories</dt><dd>{stats?.categories ?? '—'}</dd></div>
            <div><dt>Average rating</dt><dd>{stats?.averageRating ?? '—'}</dd></div>
          </dl>
        </div>
        <article className="ticket" aria-label="Sample booking pass">
          <p className="eyebrow">Sample pass</p>
          <h2>Group Study Room A</h2>
          <p>North Library, Level 2</p>
          <dl>
            <div><dt>When</dt><dd>Tue · 10:00</dd></div>
            <div><dt>Length</dt><dd>2 hours</dd></div>
            <div><dt>Hold</dt><dd>1 room</dd></div>
            <div><dt>Charge</dt><dd>{inr(150)}</dd></div>
          </dl>
        </article>
      </section>

      <section>
        <h2>What do you need today?</h2>
        <div className="cat-row">
          {CATEGORIES.map((category) => (
            <Link key={category} to={`/services?category=${encodeURIComponent(category)}`}>{category}</Link>
          ))}
        </div>
      </section>

      <section className="steps">
        <article className="step"><strong>1. Find</strong><p>Search by name or filter by category and price. Each card shows where it is and what it costs.</p></article>
        <article className="step"><strong>2. Reserve</strong><p>Pick a date and an open slot. Free services confirm immediately. Paid ones wait for the sandbox payment.</p></article>
        <article className="step"><strong>3. Track</strong><p>Follow pending, confirmed, in progress, and completed. Leave a review when the campus office closes it.</p></article>
      </section>

      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">In use this term</p>
            <h2>Services students book again</h2>
          </div>
          <Link className="btn btn-ghost" to="/services">See the full list</Link>
        </div>
        <div className="cards">
          {services.map((service) => <ServiceLink key={service.id} service={service} />)}
        </div>
      </section>
    </div>
  );
}
