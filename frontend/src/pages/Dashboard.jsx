import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { formatCurrency, formatDate, getInitials, getUserColor } from '../utils/formatCurrency';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading-page"><div className="spinner" /></div>;
  }

  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📊</div>
        <div className="empty-state__title">Welcome to SplitEase</div>
        <div className="empty-state__desc">Create a group to start tracking shared expenses.</div>
        <Link to="/groups" className="btn btn--primary">Create Group</Link>
      </div>
    );
  }

  const { summary, groups, recentExpenses } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your expense overview across all groups</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Total Groups</div>
          <div className="stat-card__value">{summary.totalGroups}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">You Are Owed</div>
          <div className="stat-card__value stat-card__value--positive">
            {formatCurrency(summary.totalOwed)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">You Owe</div>
          <div className="stat-card__value stat-card__value--negative">
            {formatCurrency(summary.totalOwing)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Net Balance</div>
          <div className={`stat-card__value ${summary.netBalance >= 0 ? 'stat-card__value--positive' : 'stat-card__value--negative'}`}>
            {formatCurrency(Math.abs(summary.netBalance))}
            <span style={{ fontSize: '14px', marginLeft: '4px' }}>
              {summary.netBalance >= 0 ? '▲' : '▼'}
            </span>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card__header">
          <span className="card__title">Your Groups</span>
          <Link to="/groups" className="btn btn--primary btn--sm">+ New Group</Link>
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          {groups.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <div className="empty-state__icon">👥</div>
              <div className="empty-state__title">No groups yet</div>
              <div className="empty-state__desc">Create your first group to get started.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Members</th>
                    <th>Expenses</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(g => (
                    <tr key={g.id}>
                      <td style={{ fontWeight: 600 }}>{g.name}</td>
                      <td>{g.memberCount}</td>
                      <td>{g.expenseCount}</td>
                      <td>
                        <span className={`badge ${g.isActive ? 'badge--success' : 'badge--neutral'}`}>
                          {g.isActive ? 'Active' : 'Left'}
                        </span>
                      </td>
                      <td>
                        <Link to={`/groups/${g.id}`} className="btn btn--ghost btn--sm">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">Recent Expenses</span>
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          {recentExpenses.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <div className="empty-state__icon">📝</div>
              <div className="empty-state__title">No expenses yet</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Group</th>
                    <th>Paid By</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExpenses.map(e => (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{formatDate(e.date)}</td>
                      <td style={{ fontWeight: 500 }}>{e.description}</td>
                      <td>
                        <Link to={`/groups/${e.groupId}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {e.group}
                        </Link>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="avatar avatar--sm" style={{ backgroundColor: getUserColor(e.paidBy), width: '24px', height: '24px', fontSize: '10px' }}>
                            {getInitials(e.paidBy)}
                          </div>
                          {e.paidBy}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(e.amount, e.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
