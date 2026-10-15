import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { ServiceLink } from '../components/cards.jsx';
import { Banner, Empty, Loading, PageHeader } from '../components/ui.jsx';
import { CATEGORIES } from '../constants.js';
import { useTitle } from '../format.js';

const PRICES = [
  { id: '', label: 'Any price' },
  { id: 'free', label: 'Free' },
  { id: '200', label: 'Up to ₹200' },
  { id: '500', label: 'Up to ₹500' },
  { id: '500plus', label: 'Over ₹500' },
];

export default function Services() {
  useTitle('Services');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const price = params.get('price') || '';
  const sort = params.get('sort') || 'name';
  const [draft, setDraft] = useState(q);
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { setDraft(q); }, [q]);

  useEffect(() => {
    if (draft === q) return undefined;
    const timer = setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (draft) next.set('q', draft);
        else next.delete('q');
        return next;
      }, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [draft, q, setParams]);

  useEffect(() => {
    let live = true;
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if (category) query.set('category', category);
    if (price === 'free') query.set('maxPrice', '0');
    if (price === '200') query.set('maxPrice', '200');
    if (price === '500') query.set('maxPrice', '500');
    if (price === '500plus') query.set('minPrice', '501');
    query.set('sort', sort);
    setLoading(true);
    api(`/api/services?${query.toString()}`)
      .then((data) => {
        if (!live) return;
        setServices(data.services);
        setTotal(data.total);
        setError('');
      })
      .catch((err) => { if (live) setError(err.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [q, category, price, sort]);

  function setParam(key, value) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }

  const filtered = Boolean(q || category || price || sort !== 'name');

  return (
    <div className="container">
      <PageHeader eyebrow="Catalog" title="Campus services" lede="Search the quad. Filter by what it is and what it costs, then open a service to see open slots." />
      <Banner>{error}</Banner>
      <div className="catalog">
        <aside className="filters">
          <label className="field">
            <span>Search</span>
            <input value={draft} placeholder="Room, lab, shuttle…" onChange={(event) => setDraft(event.target.value)} />
          </label>
          <div>
            <p className="eyebrow">Category</p>
            <div className="chips">
              <button type="button" className={!category ? 'on' : ''} onClick={() => setParam('category', '')}>All</button>
              {CATEGORIES.map((item) => (
                <button type="button" key={item} className={category === item ? 'on' : ''} onClick={() => setParam('category', item)}>{item}</button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Price</span>
            <select value={price} onChange={(event) => setParam('price', event.target.value)}>
              {PRICES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setParam('sort', event.target.value)}>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="rating">Rating</option>
              <option value="newest">Newest</option>
            </select>
          </label>
          {filtered ? <button type="button" className="btn btn-ghost" onClick={() => { setDraft(''); setParams({}, { replace: true }); }}>Clear filters</button> : null}
        </aside>
        <section>
          {loading ? <Loading label="Looking up services" /> : null}
          {!loading && services.length === 0 ? (
            <Empty title="Nothing matches" action={filtered ? <button type="button" className="btn btn-primary" onClick={() => { setDraft(''); setParams({}, { replace: true }); }}>Clear filters</button> : null}>
              Try another word, or look across all categories.
            </Empty>
          ) : null}
          {!loading && services.length > 0 ? <p className="muted">{total} service{total === 1 ? '' : 's'}</p> : null}
          <div className="cards">
            {services.map((service) => <ServiceLink key={service.id} service={service} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
