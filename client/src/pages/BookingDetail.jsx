import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, Banner, Field, Loading, Stars } from '../components/ui.jsx';
import { inr, prettyDate, prettyDateTime, useTitle } from '../format.js';

const FLOW = ['pending', 'confirmed', 'in_progress', 'completed'];

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useTitle(booking?.service?.name || 'Booking');

  useEffect(() => {
    let live = true;
    api(`/api/bookings/${id}`)
      .then((data) => { if (live) setBooking(data.booking); })
      .catch((err) => { if (live) setError(err.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id]);

  async function pay(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      const data = await api('/api/payments', {
        method: 'POST',
        body: {
          bookingId: booking.id,
          method,
          ...(method === 'card' ? { card: { ...card, number: card.number.replace(/\s+/g, '') } } : {}),
        },
      });
      setBooking(data.booking);
      setNotice('Payment received. The booking is confirmed.');
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  async function cancel(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api(`/api/bookings/${booking.id}/cancel`, { method: 'POST', body: { reason } });
      setBooking(data.booking);
      setNotice(data.booking.paymentStatus === 'refunded' ? 'Booking cancelled and the payment was refunded.' : 'Booking cancelled.');
      setShowCancel(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function review(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      const data = await api('/api/feedback', { method: 'POST', body: { bookingId: booking.id, rating, comment } });
      setBooking(data.booking);
      setNotice('Review saved. Thank you.');
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="container"><Loading label="Opening booking" /></div>;
  if (!booking) return <div className="container"><Banner>{error || 'Booking not found.'}</Banner></div>;

  const owner = user?.id === booking.user?.id;
  const canCancel = owner && ['pending', 'confirmed', 'in_progress'].includes(booking.status);
  const canPay = owner && booking.paymentStatus === 'unpaid' && booking.status !== 'cancelled';
  const canReview = owner && booking.status === 'completed' && !booking.feedback;
  const step = FLOW.indexOf(booking.status);

  return (
    <div className="container">
      <p className="crumb"><Link to="/bookings">My bookings</Link> / {booking.service?.name}</p>
      <Banner>{error}</Banner>
      <Banner kind="ok">{notice}</Banner>
      <div className="detail">
        <article className="panel">
          <p className="eyebrow">{booking.service?.category}</p>
          <h1>{booking.service?.name}</h1>
          <p>{booking.service?.location}</p>
          {booking.status === 'cancelled' ? <Badge value="cancelled" /> : (
            <ol className="track">
              {FLOW.map((status, index) => <li key={status} className={index <= step ? 'on' : ''}>{label(status)}</li>)}
            </ol>
          )}
          <dl className="facts">
            <div><dt>Date</dt><dd>{prettyDate(booking.date)}</dd></div>
            <div><dt>Slot</dt><dd>{booking.timeSlot}</dd></div>
            <div><dt>Length</dt><dd>{booking.service?.durationMinutes} min</dd></div>
            <div><dt>Charge</dt><dd>{inr(booking.amount)}</dd></div>
          </dl>
          {booking.notes ? <p><strong>Note. </strong>{booking.notes}</p> : null}
          {booking.cancelReason ? <p><strong>Cancellation. </strong>{booking.cancelReason}</p> : null}
          <div className="badge-row">
            <Badge value={booking.status} />
            <Badge value={booking.paymentStatus} />
          </div>
          {canCancel && !showCancel ? <button type="button" className="btn btn-ghost noprint" onClick={() => setShowCancel(true)}>Cancel booking</button> : null}
          {showCancel ? (
            <form className="stack noprint" onSubmit={cancel}>
              <Field label="Reason" hint="Optional, shown to the campus office">
                <textarea value={reason} maxLength={200} onChange={(event) => setReason(event.target.value)} />
              </Field>
              <button className="btn btn-danger" disabled={busy}>Confirm cancellation</button>
            </form>
          ) : null}
        </article>
        <aside className="stack">
          {canPay ? (
            <form className="panel stack noprint" onSubmit={pay} noValidate>
              <h2>Pay {inr(booking.amount)}</h2>
              <p className="muted">Sandbox only. Card numbers are checked, then discarded. Grove keeps the last four digits and a transaction id.</p>
              <div className="chips">
                <button type="button" className={method === 'card' ? 'on' : ''} onClick={() => setMethod('card')}>Card</button>
                <button type="button" className={method === 'campus_wallet' ? 'on' : ''} onClick={() => setMethod('campus_wallet')}>Campus wallet</button>
              </div>
              {method === 'card' ? (
                <>
                  <Field label="Name on card" error={fields.name}>
                    <input autoComplete="cc-name" value={card.name} onChange={(event) => setCard({ ...card, name: event.target.value })} />
                  </Field>
                  <Field label="Card number" error={fields.number} hint="Success 4242 4242 4242 4242 · Decline 4000 0000 0000 0002">
                    <input inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(event) => setCard({ ...card, number: formatCard(event.target.value) })} />
                  </Field>
                  <div className="form-grid">
                    <Field label="Expiry" error={fields.expiry}>
                      <input autoComplete="cc-exp" placeholder="MM/YY" value={card.expiry} onChange={(event) => setCard({ ...card, expiry: formatExpiry(event.target.value) })} />
                    </Field>
                    <Field label="CVV" error={fields.cvv}>
                      <input autoComplete="cc-csc" inputMode="numeric" value={card.cvv} onChange={(event) => setCard({ ...card, cvv: event.target.value.replace(/\D/g, '').slice(0, 4) })} />
                    </Field>
                  </div>
                </>
              ) : <p>The campus wallet approves this sandbox charge immediately.</p>}
              <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Processing…' : `Pay ${inr(booking.amount)}`}</button>
            </form>
          ) : null}
          {booking.payment ? (
            <section className="panel receipt">
              <h2>Receipt</h2>
              <div><span>Transaction</span><strong>{booking.payment.transactionId}</strong></div>
              <div><span>Method</span><strong>{booking.payment.brand}{booking.payment.last4 ? ` ···· ${booking.payment.last4}` : ''}</strong></div>
              <div><span>Amount</span><strong>{inr(booking.payment.amount)}</strong></div>
              <div><span>Status</span><strong>{booking.payment.status}</strong></div>
              <div><span>When</span><strong>{prettyDateTime(booking.payment.createdAt)}</strong></div>
              <button type="button" className="btn btn-ghost noprint" onClick={() => window.print()}>Print receipt</button>
            </section>
          ) : null}
          {booking.paymentStatus === 'not_required' ? <section className="panel"><h2>No charge</h2><p>This campus service is free, so the hold was confirmed without a payment.</p></section> : null}
          {canReview ? (
            <form className="panel stack" onSubmit={review}>
              <h2>How did it go?</h2>
              <fieldset className="star-input">
                <legend>Rating</legend>
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value}>
                    <input type="radio" name="rating" checked={rating === value} onChange={() => setRating(value)} />
                    <span aria-hidden="true">{value <= rating ? '★' : '☆'}</span>
                    <span className="sr-only">{value} star{value > 1 ? 's' : ''}</span>
                  </label>
                ))}
              </fieldset>
              <Field label="Comment" error={fields.comment}>
                <textarea value={comment} maxLength={600} onChange={(event) => setComment(event.target.value)} />
              </Field>
              <button className="btn btn-primary" disabled={busy}>Send review</button>
            </form>
          ) : null}
          {booking.feedback ? (
            <section className="panel">
              <h2>Your review</h2>
              <Stars value={booking.feedback.rating} />
              <p>{booking.feedback.comment}</p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function label(status) {
  if (status === 'in_progress') return 'In progress';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatCard(value) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
