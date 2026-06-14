import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { groupAPI } from '../services/api';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = () => {
    groupAPI.getAll()
      .then(res => setGroups(res.data.groups))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await groupAPI.create({ name, description });
      navigate(`/groups/${res.data.group.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="loading-page"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Groups</h1>
          <p className="page-subtitle">Manage your expense sharing groups</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          + New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">👥</div>
          <div className="empty-state__title">No groups yet</div>
          <div className="empty-state__desc">
            Create your first group to start tracking shared expenses with friends.
          </div>
          <button className="btn btn--primary" onClick={() => setShowModal(true)}>
            Create Your First Group
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {groups.map(group => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="card" style={{ height: '100%' }}>
                <div className="card__body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '28px' }}>👥</div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{group.name}</h3>
                      {group.description && (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{group.description}</p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span>👤 {group.members.length} members</span>
                    <span>📝 {group._count?.expenses || 0} expenses</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {group.members.slice(0, 6).map(m => (
                      <span key={m.id} className="badge badge--info" style={{ fontSize: '10px' }}>
                        {m.user.name}
                        {m.leftAt && ' (left)'}
                      </span>
                    ))}
                    {group.members.length > 6 && (
                      <span className="badge badge--neutral">+{group.members.length - 6}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Create New Group</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Group Name</label>
                  <input
                    className="form-input"
                    placeholder="e.g., Flat Expenses"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description (optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="What is this group for?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
