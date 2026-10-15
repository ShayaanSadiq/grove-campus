import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { artClass, Banner, Loading, Stars } from '../components/ui.jsx';
import { addCampusDays, inr, prettyDate, useTitle } from '../format.js';

export default function ServiceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [date, setDate] = useState(addCampusDays(1));
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useTitle(service?.name || 'Service');

  useEffect(() => {
    let live = true;
    setLoading(true);
    api(`/api/services/${id}`)
      .then((data) => {
        if (!live) return;
        setService(data.service);
        setReviews(data.reviews);
        setError('');
      })
      .catch((err) => { if (live) setError(err.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id]);

  useEffect(() => {
    if (!service || service.status !== 'active') return undefined;
    let live = true;
    api(`/api/services/${id}/availability?date=${date}`)
      .then((data) => {
        if (!live) return;
        setSlots(data.slots);
        setSlot((current) => (data.slots.some((item) => item.time === current && item.remaining > 0) ? current : ''));
      })
      .catch((err) => { if (live) setFields((current) => ({ ...current, date: err.message })); });
    return () => { live = false; };
  }, [id, date, service]);

  async function onSubmit(event) {
    event.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setBusy(true);
    setError('');
    setFields({});
    try {
      const data = await api('/api/bookings', {
        method: 'POST',
        body: { serviceId: id, date, timeSlot: slot, notes },
      });
      navigate(`/bookings/${data.booking.id}`);
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="container"><Loading label="Opening service" /></div>;
  if (!service) return <div className="container"><Banner>{error || 'Service not found.'}</Banner></div>;

  const closed = service.status !== 'active';

  return (
    <div className="container">
      <p className="crumb"><Link to="/services">Services</Link> / {service.category}</p>
      <div className="detail">
        <article className="panel">
          <div className={artClass(service.category)}><span>{service.category}</span></div>
          <h1>{service.name}</h1>
          <p className="lede">{service.description}</p>
          <dl className="facts">
            <div><dt>Location</dt><dd>{service.location}</dd></div>
            <div><dt>Duration</dt><dd>{service.durationMinutes} min</dd></div>
            <div><dt>Capacity</dt><dd>{service.capacity} per slot</dd></div>
            <div><dt>Charge</dt><dd>{inr(service.price)}</dd></div>
          </dl>
          <p>{service.rating ? <><Stars value={service.rating} /> {service.rating.toFixed(1)} from {service.reviewCount} review{service.reviewCount === 1 ? '' : 's'}</> : 'No reviews yet.'}</p>
          <div className="reviews">
            {reviews.map((review) => (
              <blockquote key={review.id}>
                <Stars value={review.rating} />
                <p>{review.comment}</p>
                <footer>{review.author}</footer>
              </blockquote>
            ))}
          </div>
        </article>
        <aside className="panel book-panel">
          <h2>Reserve a slot</h2>
          {closed ? <Banner>This service is not currently offered.</Banner> : null}
          {user?.role === 'admin' ? <p className="muted">Administrator accounts manage services. Sign in as a student to book.</p> : null}
          {!closed && user?.role !== 'admin' ? (
            <form className="stack" onSubmit={onSubmit} noValidate>
              <Banner>{error}</Banner>
              <label className="field">
                <span>Date</span>
                <input type="date" min={addCampusDays(0)} value={date} onChange={(event) => setDate(event.target.value)} />
                {fields.date ? <small className="field-error">{fields.date}</small> : <small className="hint">{prettyDate(date)}</small>}
              </label>
              <div>
                <span className="field-label">Open slots</span>
                <div className="slot-grid">
                  {slots.map((item) => (
                    <button
                      type="button"
                      key={item.time}
                      className={slot === item.time ? 'slot on' : 'slot'}
                      disabled={item.remaining === 0}
                      onClick={() => setSlot(item.time)}
                    >
                      <strong>{item.time}</strong>
                      <span>{item.remaining} left</span>
                    </button>
                  ))}
                </div>
                {fields.timeSlot ? <small className="field-error">{fields.timeSlot}</small> : null}
              </div>
              <label className="field">
                <span>Note for the desk</span>
                <textarea maxLength={400} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional. For example, a group name or a repair detail." />
              </label>
              <p className="price-line"><span>Due now</span><strong>{inr(service.price)}</strong></p>
              <button className="btn btn-primary btn-block" disabled={busy || !slot}>{busy ? 'Reserving…' : user ? 'Reserve' : 'Sign in to reserve'}</button>
            </form>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
