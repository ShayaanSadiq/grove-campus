import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui.jsx';
import { useTitle } from '../format.js';

const SCREENS = [
  {
    title: 'Catalog',
    href: '/services',
    note: 'Filters stay on the left. Cards carry category, place, price, and rating.',
    blocks: ['search', 'chips', 'card', 'card', 'card'],
  },
  {
    title: 'Reserve',
    href: '/services',
    note: 'The service story is on the left. Date, slots, and the charge sit in a side panel.',
    blocks: ['title', 'facts', 'panel'],
  },
  {
    title: 'My bookings',
    href: '/bookings',
    note: 'Each hold is a row with status and payment. Opening it shows the pass and the receipt.',
    blocks: ['tabs', 'row', 'row'],
  },
  {
    title: 'Admin overview',
    href: '/admin',
    note: 'Totals first, then revenue and category charts, then the latest bookings and reviews.',
    blocks: ['stats', 'chart', 'table'],
  },
];

export default function Wireframes() {
  useTitle('Wireframes');
  return (
    <div className="container">
      <PageHeader
        eyebrow="UI / UX"
        title="Wireframes"
        lede="These are the low-fidelity layouts the live screens follow. The same regions reflow at tablet and phone widths."
      />
      <ol className="flow">
        <li>Find a service</li>
        <li>Pick a date and slot</li>
        <li>Pay if there is a charge</li>
        <li>Track status</li>
        <li>Review when it is complete</li>
      </ol>
      <div className="wire-grid">
        {SCREENS.map((screen) => (
          <article key={screen.title} className="wire-screen">
            <header>
              <h2>{screen.title}</h2>
              <Link to={screen.href}>Open live screen</Link>
            </header>
            <div className="wire-stage">
              <div className="wire-bar" />
              {screen.blocks.map((block, index) => <div key={`${block}-${index}`} className={`wire-block wire-${block}`} />)}
            </div>
            <p>{screen.note}</p>
          </article>
        ))}
      </div>
      <section className="panel">
        <h2>Responsive behavior</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Width</th><th>What changes</th></tr></thead>
            <tbody>
              <tr><td>Desktop, from 980px</td><td>Catalog filters sit beside the cards. Booking details use two columns. Admin keeps a side menu.</td></tr>
              <tr><td>Tablet, under 980px</td><td>Service cards drop to two columns. The hero stacks. Charts stack under the totals.</td></tr>
              <tr><td>Phone, under 720px</td><td>Navigation collapses into Menu. Filters, forms, and admin links stack. Tables scroll sideways.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
