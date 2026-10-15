import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { Badge, Banner, Loading, PageHeader } from '../../components/ui.jsx';
import { useTitle } from '../../format.js';

export default function ManageUsers() {
  useTitle('Manage users');
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    api(`/api/admin/users${query}`)
      .then((data) => { if (live) setUsers(data.users); })
      .catch((err) => { if (live) setError(err.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [q]);

  async function update(person, patch) {
    setError('');
    setNotice('');
    try {
      const data = await api(`/api/admin/users/${person.id}`, {
        method: 'PATCH',
        body: { role: person.role, status: person.status, ...patch },
      });
      setUsers((current) => current.map((item) => (item.id === person.id ? data.user : item)));
      setNotice(`${data.user.name} updated.`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Directory" title="Users" lede="Suspend an account or grant the office role. You cannot change your own access." />
      <Banner>{error}</Banner>
      <Banner kind="ok">{notice}</Banner>
      <div className="toolbar">
        <input value={q} placeholder="Search name, email, or ID" onChange={(event) => setQ(event.target.value)} />
      </div>
      {loading ? <Loading label="Loading users" /> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Department</th><th>Role</th><th>Access</th></tr>
            </thead>
            <tbody>
              {users.map((person) => {
                const mine = person.id === me?.id;
                return (
                  <tr key={person.id}>
                    <td>{person.name}<br /><span className="muted">{person.email} · {person.studentId}</span></td>
                    <td>{person.department}</td>
                    <td>
                      <select aria-label={`Role for ${person.name}`} disabled={mine} value={person.role} onChange={(event) => update(person, { role: event.target.value })}>
                        <option value="student">student</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="actions">
                      <Badge value={person.status} />
                      <button type="button" className="btn btn-ghost btn-small" disabled={mine} onClick={() => update(person, { status: person.status === 'active' ? 'suspended' : 'active' })}>
                        {mine ? 'You' : person.status === 'active' ? 'Suspend' : 'Reinstate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
