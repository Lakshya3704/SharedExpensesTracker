import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { groupAPI, expenseAPI, settlementAPI, balanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getInitials, getUserColor } from '../utils/formatCurrency';

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [simplified, setSimplified] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [activeTab, setActiveTab] = useState('expenses');
  const [loading, setLoading] = useState(true);

  // Expense modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '', amount: '', currency: 'INR', splitType: 'EQUAL',
    paidById: '', expenseDate: new Date().toISOString().split('T')[0], notes: '',
  });

  // Settlement modal state
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleForm, setSettleForm] = useState({
    fromUserId: '', toUserId: '', amount: '', currency: 'INR', notes: '',
  });

  // Add member modal
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Breakdown modal
  const [breakdown, setBreakdown] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [groupRes, expRes, balRes, simpRes, settleRes] = await Promise.all([
        groupAPI.getOne(id),
        expenseAPI.getByGroup(id),
        balanceAPI.getGroupBalances(id).catch(() => null),
        balanceAPI.getSimplified(id).catch(() => null),
        settlementAPI.getByGroup(id).catch(() => ({ data: { settlements: [] } })),
      ]);
      setGroup(groupRes.data.group);
      setExpenses(expRes.data.expenses);
      if (balRes) setBalances(balRes.data);
      if (simpRes) setSimplified(simpRes.data);
      setSettlements(settleRes.data.settlements);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const activeMembers = group.members.filter(m => !m.leftAt);
      const participants = activeMembers.map(m => ({ userId: m.userId, value: 1 }));

      await expenseAPI.create(id, {
        ...expenseForm,
        paidById: parseInt(expenseForm.paidById),
        participants,
      });
      setShowExpenseModal(false);
      setExpenseForm({
        description: '', amount: '', currency: 'INR', splitType: 'EQUAL',
        paidById: '', expenseDate: new Date().toISOString().split('T')[0], notes: '',
      });
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create expense');
    }
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    try {
      await settlementAPI.create(id, {
        ...settleForm,
        fromUserId: parseInt(settleForm.fromUserId),
        toUserId: parseInt(settleForm.toUserId),
        amount: parseFloat(settleForm.amount),
      });
      setShowSettleModal(false);
      setSettleForm({ fromUserId: '', toUserId: '', amount: '', currency: 'INR', notes: '' });
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to record settlement');
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    try {
      await groupAPI.addMember(id, { userId: parseInt(selectedUserId) });
      setShowMemberModal(false);
      setSelectedUserId('');
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Mark this member as left?')) return;
    try {
      await groupAPI.updateMember(id, userId, { leftAt: new Date().toISOString() });
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update member');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await expenseAPI.delete(expenseId);
      loadAll();
    } catch (err) {
      alert('Failed to delete expense');
    }
  };

  const loadBreakdown = async (userId, userName) => {
    try {
      const res = await balanceAPI.getBreakdown(id, userId);
      setBreakdown({ ...res.data.breakdown, userName });
      setShowBreakdown(true);
    } catch (err) {
      alert('Failed to load breakdown');
    }
  };

  const loadAllUsers = async () => {
    try {
      const res = await groupAPI.getAllUsers();
      setAllUsers(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading-page"><div className="spinner" /></div>;
  }

  if (!group) {
    return <div className="empty-state"><div className="empty-state__title">Group not found</div></div>;
  }

  const activeMembers = group.members.filter(m => !m.leftAt);

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/groups" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px' }}>
            ← Back to Groups
          </Link>
          <h1 className="page-title">{group.name}</h1>
          {group.description && <p className="page-subtitle">{group.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to={`/import?group=${id}`} className="btn btn--ghost btn--sm">📥 Import CSV</Link>
          <button className="btn btn--primary btn--sm" onClick={() => setShowExpenseModal(true)}>
            + Add Expense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['expenses', 'balances', 'settlements', 'members'].map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="card">
          <div className="card__header">
            <span className="card__title">Expenses ({expenses.length})</span>
            <button className="btn btn--primary btn--sm" onClick={() => setShowExpenseModal(true)}>
              + Add
            </button>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {expenses.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-state__icon">📝</div>
                <div className="empty-state__title">No expenses yet</div>
                <div className="empty-state__desc">Add your first expense or import from CSV.</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Paid By</th>
                      <th>Amount</th>
                      <th>Split</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formatDate(e.expenseDate)}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{e.description}</div>
                          {e.notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{e.notes}</div>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div className="avatar avatar--sm" style={{ backgroundColor: getUserColor(e.paidBy?.name), width: '24px', height: '24px', fontSize: '10px' }}>
                              {getInitials(e.paidBy?.name)}
                            </div>
                            <span style={{ fontSize: '13px' }}>{e.paidBy?.name}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(e.amount, e.currency)}</td>
                        <td>
                          <span className="badge badge--info">{e.splitType}</span>
                        </td>
                        <td>
                          <span className={`badge ${e.status === 'ACTIVE' ? 'badge--success' : e.status === 'VOID' ? 'badge--neutral' : 'badge--warning'}`}>
                            {e.status}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn--ghost btn--sm" onClick={() => handleDeleteExpense(e.id)}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Balances Tab */}
      {activeTab === 'balances' && balances && (
        <div>
          {/* Per-user balances */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card__header">
              <span className="card__title">Member Balances</span>
            </div>
            <div className="card__body" style={{ padding: 0 }}>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Total Paid</th>
                      <th>Total Owed</th>
                      <th>Net Balance</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.balances.map(b => (
                      <tr key={b.userId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="avatar avatar--sm" style={{ backgroundColor: getUserColor(b.name) }}>
                              {getInitials(b.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{b.name}</div>
                              {!b.isActive && <span className="badge badge--neutral" style={{ fontSize: '9px' }}>Left</span>}
                            </div>
                          </div>
                        </td>
                        <td>{formatCurrency(b.totalPaid)}</td>
                        <td>{formatCurrency(b.totalOwed)}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: b.netBalance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                            {b.netBalance >= 0 ? '+' : ''}{formatCurrency(b.netBalance)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${b.netBalance > 0 ? 'badge--success' : b.netBalance < 0 ? 'badge--danger' : 'badge--neutral'}`}>
                            {b.netBalance > 0 ? 'Gets back' : b.netBalance < 0 ? 'Owes' : 'Settled'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn--ghost btn--sm" onClick={() => loadBreakdown(b.userId, b.name)}>
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Simplified debts */}
          {simplified && simplified.transactions.length > 0 && (
            <div className="card">
              <div className="card__header">
                <span className="card__title">💡 Simplified Settlements</span>
                <span className="badge badge--success">{simplified.transactions.length} transaction(s)</span>
              </div>
              <div className="card__body">
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Minimum payments needed to settle all debts:
                </p>
                {simplified.transactions.map((t, i) => (
                  <div key={i} className="debt-item">
                    <div className="avatar avatar--sm" style={{ backgroundColor: getUserColor(t.fromName) }}>
                      {getInitials(t.fromName)}
                    </div>
                    <span style={{ fontWeight: 600 }}>{t.fromName}</span>
                    <span className="debt-item__arrow">→</span>
                    <div className="avatar avatar--sm" style={{ backgroundColor: getUserColor(t.toName) }}>
                      {getInitials(t.toName)}
                    </div>
                    <span style={{ fontWeight: 600 }}>{t.toName}</span>
                    <span className="debt-item__amount">{formatCurrency(t.amount)}</span>
                    <button
                      className="btn btn--success btn--sm"
                      onClick={() => {
                        setSettleForm({
                          fromUserId: t.fromUserId.toString(),
                          toUserId: t.toUserId.toString(),
                          amount: t.amount.toString(),
                          currency: 'INR',
                          notes: 'Simplified settlement',
                        });
                        setShowSettleModal(true);
                      }}
                    >
                      Settle
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed debts */}
          {balances.debts.length > 0 && (
            <div className="card" style={{ marginTop: '16px' }}>
              <div className="card__header">
                <span className="card__title">All Outstanding Debts</span>
              </div>
              <div className="card__body">
                {balances.debts.map((d, i) => (
                  <div key={i} className="debt-item">
                    <span style={{ fontWeight: 600, color: 'var(--accent-danger)' }}>{d.from.name}</span>
                    <span className="debt-item__arrow">owes</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-success)' }}>{d.to.name}</span>
                    <span className="debt-item__amount">{formatCurrency(d.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settlements Tab */}
      {activeTab === 'settlements' && (
        <div className="card">
          <div className="card__header">
            <span className="card__title">Settlements</span>
            <button className="btn btn--success btn--sm" onClick={() => setShowSettleModal(true)}>
              + Record Payment
            </button>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {settlements.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-state__icon">🤝</div>
                <div className="empty-state__title">No settlements yet</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr><th>Date</th><th>From</th><th></th><th>To</th><th>Amount</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {settlements.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontSize: '13px' }}>{formatDate(s.settledAt)}</td>
                        <td style={{ fontWeight: 600 }}>{s.fromUser.name}</td>
                        <td style={{ textAlign: 'center', color: 'var(--accent-primary)' }}>→</td>
                        <td style={{ fontWeight: 600 }}>{s.toUser.name}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(s.amount, s.currency)}</td>
                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{s.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="card">
          <div className="card__header">
            <span className="card__title">Members ({group.members.length})</span>
            <button className="btn btn--primary btn--sm" onClick={() => { loadAllUsers(); setShowMemberModal(true); }}>
              + Add Member
            </button>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Member</th><th>Role</th><th>Joined</th><th>Left</th><th></th></tr>
                </thead>
                <tbody>
                  {group.members.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar avatar--md" style={{ backgroundColor: getUserColor(m.user.name) }}>
                            {getInitials(m.user.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{m.user.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge ${m.role === 'ADMIN' ? 'badge--info' : 'badge--neutral'}`}>{m.role}</span></td>
                      <td style={{ fontSize: '13px' }}>{formatDate(m.joinedAt)}</td>
                      <td style={{ fontSize: '13px' }}>{m.leftAt ? formatDate(m.leftAt) : '—'}</td>
                      <td>
                        {!m.leftAt && m.userId !== user.id && (
                          <button className="btn btn--ghost btn--sm" onClick={() => handleRemoveMember(m.userId)}>
                            Mark Left
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Add Expense</h2>
              <button className="modal__close" onClick={() => setShowExpenseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-input" placeholder="What was this for?"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Amount</label>
                    <input className="form-input" type="number" step="0.01" placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="form-select" value={expenseForm.currency}
                      onChange={(e) => setExpenseForm({ ...expenseForm, currency: e.target.value })}>
                      <option value="INR">₹ INR</option>
                      <option value="USD">$ USD</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Paid By</label>
                    <select className="form-select" value={expenseForm.paidById}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paidById: e.target.value })} required>
                      <option value="">Select</option>
                      {activeMembers.map(m => (
                        <option key={m.userId} value={m.userId}>{m.user.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input className="form-input" type="date" value={expenseForm.expenseDate}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Split Type</label>
                  <select className="form-select" value={expenseForm.splitType}
                    onChange={(e) => setExpenseForm({ ...expenseForm, splitType: e.target.value })}>
                    <option value="EQUAL">Equal</option>
                    <option value="UNEQUAL">Unequal</option>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="SHARE">By Shares</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="form-textarea" placeholder="Any notes..."
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--ghost" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn--primary">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettleModal && (
        <div className="modal-overlay" onClick={() => setShowSettleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Record Payment</h2>
              <button className="modal__close" onClick={() => setShowSettleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSettle}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">From (who paid)</label>
                  <select className="form-select" value={settleForm.fromUserId}
                    onChange={(e) => setSettleForm({ ...settleForm, fromUserId: e.target.value })} required>
                    <option value="">Select payer</option>
                    {group.members.map(m => (
                      <option key={m.userId} value={m.userId}>{m.user.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">To (who received)</label>
                  <select className="form-select" value={settleForm.toUserId}
                    onChange={(e) => setSettleForm({ ...settleForm, toUserId: e.target.value })} required>
                    <option value="">Select receiver</option>
                    {group.members.map(m => (
                      <option key={m.userId} value={m.userId}>{m.user.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Amount</label>
                    <input className="form-input" type="number" step="0.01" value={settleForm.amount}
                      onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="form-select" value={settleForm.currency}
                      onChange={(e) => setSettleForm({ ...settleForm, currency: e.target.value })}>
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" value={settleForm.notes}
                    onChange={(e) => setSettleForm({ ...settleForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--ghost" onClick={() => setShowSettleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn--success">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Add Member</h2>
              <button className="modal__close" onClick={() => setShowMemberModal(false)}>✕</button>
            </div>
            <div className="modal__body">
              <div className="form-group">
                <label className="form-label">Select User</label>
                <select className="form-select" value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}>
                  <option value="">Choose a user</option>
                  {allUsers
                    .filter(u => !group.members.some(m => m.userId === u.id && !m.leftAt))
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowMemberModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleAddMember}>Add Member</button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Breakdown Modal (Rohan's request) */}
      {showBreakdown && breakdown && (
        <div className="modal-overlay" onClick={() => setShowBreakdown(false)}>
          <div className="modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Balance Breakdown: {breakdown.userName}</h2>
              <button className="modal__close" onClick={() => setShowBreakdown(false)}>✕</button>
            </div>
            <div className="modal__body">
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>
                EXPENSES
              </h4>
              {breakdown.expenses.map(e => (
                <div key={e.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid var(--border-color)',
                  fontSize: '13px',
                }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{e.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatDate(e.date)} • Paid by {e.paidBy} • Share: {formatCurrency(e.yourShare)}
                    </div>
                  </div>
                  <span style={{
                    fontWeight: 700,
                    color: e.impact >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                  }}>
                    {e.impact >= 0 ? '+' : ''}{formatCurrency(e.impact)}
                  </span>
                </div>
              ))}

              {breakdown.settlements.length > 0 && (
                <>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '16px 0 12px', color: 'var(--text-secondary)' }}>
                    SETTLEMENTS
                  </h4>
                  {breakdown.settlements.map(s => (
                    <div key={s.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: '1px solid var(--border-color)',
                      fontSize: '13px',
                    }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.description}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(s.date)}</div>
                      </div>
                      <span style={{
                        fontWeight: 700,
                        color: s.impact >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                      }}>
                        {s.impact >= 0 ? '+' : ''}{formatCurrency(s.impact)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
