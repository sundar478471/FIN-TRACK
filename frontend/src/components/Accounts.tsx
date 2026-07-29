import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Plus, Edit2, Trash2, CreditCard } from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank Account' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'WALLET', label: 'Mobile Wallet' },
  { value: 'UPI', label: 'UPI Wallet' }
];

export const Accounts: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount } = useFinance();
  
  const currencySymbol = '₹';

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('BANK');
  const [balance, setBalance] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatMoney = (val: number) => {
    return `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenAdd = () => {
    setEditingAcc(null);
    setName('');
    setType('BANK');
    setBalance('');
    setError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (acc: any) => {
    setEditingAcc(acc);
    setName(acc.name);
    setType(acc.type);
    setBalance(acc.balance.toString());
    setError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Name is required');

    setLoading(true);
    try {
      if (editingAcc) {
        await updateAccount(editingAcc.id, {
          name: name.trim(),
          type,
          balance: Number(balance) || 0.0
        });
      } else {
        await addAccount(name.trim(), type, Number(balance) || 0.0);
      }
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (acc: any) => {
    if (!window.confirm(`Are you sure you want to delete account "${acc.name}"? Deleting this account will permanently delete all related transactions and transfers. This action cannot be undone.`)) return;
    try {
      await deleteAccount(acc.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
    }
  };

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Accounts</h1>
          <p>Track cash, bank balances, credit limits, debit cards, and UPI apps.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Add Account
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <CreditCard size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>No Accounts Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '20px' }}>
            Register your first account (e.g. Bank Account or Cash wallet) to start logging transactions.
          </p>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            Create First Account
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {accounts.map(acc => {
            const isNegative = acc.balance < 0;
            return (
              <div key={acc.id} className="card summary-card card-premium" style={{ flexDirection: 'column', gap: '24px', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span 
                      className="badge" 
                      style={{ 
                        backgroundColor: 'var(--primary-light)', 
                        color: 'var(--primary)', 
                        fontSize: '0.65rem',
                        marginBottom: '8px' 
                      }}
                    >
                      {ACCOUNT_TYPES.find(t => t.value === acc.type)?.label || acc.type}
                    </span>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{acc.name}</h2>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)'
                    }}>
                      <CreditCard size={20} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px', transition: 'color var(--transition-fast)' }}
                        onClick={() => handleOpenEdit(acc)}
                        title="Edit Account"
                        className="btn-icon"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '4px', transition: 'color var(--transition-fast)' }}
                        onClick={() => handleDelete(acc)}
                        title="Delete Account"
                        className="btn-icon"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Current Balance
                  </span>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    color: isNegative ? 'var(--danger)' : 'var(--text-primary)',
                    marginTop: '4px'
                  }}>
                    {formatMoney(acc.balance)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal Dialog */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingAcc ? 'Edit Account' : 'Add Account'}</h2>
              <button className="modal-close" onClick={() => setIsOpen(false)}>×</button>
            </div>

            {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Account Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. My Wallet, Chase Checking" 
                  className="input-premium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Account Type</label>
                <select 
                  className="input-premium" 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                >
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{editingAcc ? 'Current Balance' : 'Starting Balance'}</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  className="input-premium"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
