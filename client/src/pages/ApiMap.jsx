import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Banner, Loading, PageHeader } from '../components/ui.jsx';
import { useTitle } from '../format.js';

export default function ApiMap() {
  useTitle('API map');
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    api('/api')
      .then((data) => { if (live) setCatalog(data); })
      .catch((err) => { if (live) setError(err.message); });
    return () => { live = false; };
  }, []);

  return (
    <div className="container">
      <PageHeader eyebrow="REST" title="API map" lede="Every screen talks to these routes. Send a JWT in the Authorization header after login." />
      <Banner>{error}</Banner>
      {!catalog && !error ? <Loading label="Reading the API map" /> : null}
      {catalog ? (
        <>
          <p className="muted">{catalog.name} · {catalog.version} · {catalog.auth}</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Method</th><th>Path</th><th>Access</th><th>Purpose</th></tr></thead>
              <tbody>
                {catalog.endpoints.map((item) => (
                  <tr key={`${item.method}-${item.path}`}>
                    <td><code>{item.method}</code></td>
                    <td><code>{item.path}</code></td>
                    <td>{item.access}</td>
                    <td>{item.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
