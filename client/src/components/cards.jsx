import { Link } from 'react-router-dom';
import { artClass } from './ui.jsx';
import { inr } from '../format.js';

export function ServiceLink({ service }) {
  return (
    <Link to={`/services/${service.id}`} className="service-card">
      <div className={artClass(service.category)}><span>{service.category}</span></div>
      <div>
        <h3>{service.name}</h3>
        <p className="clamp">{service.location}</p>
      </div>
      <div className="meta">
        <strong>{inr(service.price)}</strong>
        <span>{service.rating ? `${service.rating.toFixed(1)} ★` : 'New'} · {service.durationMinutes} min</span>
      </div>
    </Link>
  );
}
