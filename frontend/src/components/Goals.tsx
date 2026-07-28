import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Plus, Edit2, Trash2, Calendar, Target, PiggyBank } from 'lucide-react';

export const SavingsGoals: React.FC = () => {
  const { goals, addGoal, updateGoal, deleteGoal } = useFinance();

  const currencySymbol = '₹';

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [deadline, setDeadline] = useState(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatMoney = (val: number) => {
    return `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenAdd = () => {
    setSelectedGoal(null);
    setName('');
    setTargetAmount('');
    setSavedAmount('');
    setDeadline(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]);
    setError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (g: any) => {
    setSelectedGoal(g);
    setName(g.name);
    setTargetAmount(g.targetAmount.toString());
    setSavedAmount(g.savedAmount.toString());
    setDeadline(new Date(g.deadline).toISOString().split('T')[0]);
    setError('');
    setIsOpen(true);
  };

  const handleOpenDeposit = (g: any) => {
    setSelectedGoal(g);
    setDepositAmount('');
    setError('');
    setIsDepositOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Name is required');
    if (!targetAmount || Number(targetAmount) <= 0) return setError('Target amount must be greater than zero');
    if (!deadline) return setError('Deadline is required');

    setLoading(true);
    try {
      if (selectedGoal && !isDepositOpen) {
        await updateGoal(selectedGoal.id, {
          name: name.trim(),
          targetAmount: Number(targetAmount),
          savedAmount: Number(savedAmount) || 0.0,
          deadline: new Date(deadline).toISOString()
        });
      } else {
        await addGoal(
          name.trim(),
          Number(targetAmount),
          Number(savedAmount) || 0.0,
          new Date(deadline).toISOString()
        );
      }
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save goal');
    } finally {
      setLoading(false);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const depVal = Number(depositAmount);
    if (!depVal || depVal <= 0) return setError('Enter a valid amount to deposit');

    setLoading(true);
    try {
      const newSavedAmount = selectedGoal.savedAmount + depVal;
      await updateGoal(selectedGoal.id, {
        savedAmount: newSavedAmount
      });
      setIsDepositOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to deposit money to goal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (g: any) => {
    if (!window.confirm(`Are you sure you want to delete goal: "${g.name}"?`)) return;
    try {
      await deleteGoal(g.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete goal');
    }
  };

  // Helper to calculate days remaining
  const getDaysRemaining = (deadlineStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(deadlineStr);
    target.setHours(0,0,0,0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    return `${diffDays} days left`;
  };

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Savings Goals</h1>
          <p>Allocate funds towards major savings targets and track milestone progress.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Create Goal
          </button>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Target size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>No Savings Goals Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '20px' }}>
            Set a target for something you are saving up for (e.g. Laptop, Bike, or Emergency Fund).
          </p>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            Create A Goal
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {goals.map(g => {
            const percent = Math.min((g.savedAmount / g.targetAmount) * 100, 100);
            const isCompleted = g.savedAmount >= g.targetAmount;
            const remaining = Math.max(g.targetAmount - g.savedAmount, 0);

            return (
              <div 
                key={g.id} 
                className="card card-premium" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  borderColor: isCompleted ? 'var(--success)' : 'var(--border-color)',
                  borderWidth: isCompleted ? '1.5px' : '1px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{g.name}</h2>
                    <span 
                      style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        color: isCompleted ? 'var(--success)' : 'var(--text-muted)'
                      }}
                    >
                      {isCompleted ? '🎉 Goal Completed!' : `Remaining: ${formatMoney(remaining)}`}
                    </span>
                  </div>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? 'var(--success-light)' : 'var(--primary-light)',
                    color: isCompleted ? 'var(--success)' : 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Target size={20} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                    <span>{percent.toFixed(0)}% Saved</span>
                    <span>{formatMoney(g.savedAmount)} / {formatMoney(g.targetAmount)}</span>
                  </div>
                  <div className="progress-container" style={{ margin: '0' }}>
                    <div 
                      className="progress-bar" 
                      style={{ width: `${percent}%`, backgroundColor: isCompleted ? 'var(--success)' : 'var(--primary)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    <span>Target: {new Date(g.deadline).toLocaleDateString()}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {getDaysRemaining(g.deadline)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: 'auto' }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1, padding: '8px' }} onClick={() => handleOpenEdit(g)}>
                    <Edit2 size={14} /> Edit
                  </button>
                  {!isCompleted && (
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'var(--success)', border: 'none', color: '#fff' }} 
                      onClick={() => handleOpenDeposit(g)}
                    >
                      <PiggyBank size={14} /> Save Money
                    </button>
                  )}
                  <button className="btn btn-danger btn-sm" style={{ padding: '8px 12px' }} onClick={() => handleDelete(g)}>
                    <Trash2 size={14} />
                  </button>
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
              <h2>{selectedGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}</h2>
              <button className="modal-close" onClick={() => setIsOpen(false)}>×</button>
            </div>

            {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Goal Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. MacBook Pro, Bali Trip" 
                  className="input-premium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Target Amount</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  className="input-premium"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Current Saved Amount</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  className="input-premium"
                  value={savedAmount}
                  onChange={(e) => setSavedAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Target Deadline Date</label>
                <input 
                  type="date" 
                  className="input-premium"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
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

      {/* Quick Deposit Funds Modal */}
      {isDepositOpen && selectedGoal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Add Savings</h2>
              <button className="modal-close" onClick={() => setIsDepositOpen(false)}>×</button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Allocate money towards <strong>{selectedGoal.name}</strong>. Target remaining: {formatMoney(selectedGoal.targetAmount - selectedGoal.savedAmount)}.
            </p>

            {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}

            <form onSubmit={handleDepositSubmit}>
              <div className="form-group">
                <label>Amount to Add</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  className="input-premium"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsDepositOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--success)' }} disabled={loading}>
                  {loading ? 'Processing...' : 'Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
