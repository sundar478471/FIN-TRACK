import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Icon } from './common/Icon';
import { Plus, Wallet, TrendingUp, TrendingDown, Landmark } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { 
    accounts, 
    transactions, 
    categories, 
    budgets, 
    addTransaction 
  } = useFinance();

  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  
  const [quickAddError, setQuickAddError] = useState('');
  const [quickAddSuccess, setQuickAddSuccess] = useState('');

  const currencySymbol = '₹';

  // Format money helper
  const formatMoney = (val: number) => {
    return `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculations
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Current month's transactions
  const monthTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthIncome = monthTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthExpense = monthTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthSavings = monthIncome - monthExpense;

  // Filter categories matching active type for Quick Add
  const filteredCategories = categories.filter(c => c.type === type);

  // Take 5 recent transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickAddError('');
    setQuickAddSuccess('');

    if (!accountId) return setQuickAddError('Select an account');
    if (!categoryId) return setQuickAddError('Select a category');
    if (!amount || Number(amount) <= 0) return setQuickAddError('Enter a valid amount');

    const currentAmount = amount;
    const currentNotes = notes;

    // Clear inputs immediately for instant user feedback
    setAmount('');
    setNotes('');
    setQuickAddSuccess('Transaction added!');
    setTimeout(() => setQuickAddSuccess(''), 3000);

    addTransaction({
      type,
      amount: Number(currentAmount),
      date: new Date().toISOString(),
      accountId,
      categoryId,
      notes: currentNotes || `Quick Add: ${categories.find(c => c.id === categoryId)?.name}`
    }).catch((err: any) => {
      // Revert values if the request fails
      setAmount(currentAmount);
      setNotes(currentNotes);
      setQuickAddSuccess('');
      setQuickAddError(err.message || 'Failed to add transaction');
    });
  };

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Financial Dashboard</h1>
          <p>Real-time updates of your account status and budgets.</p>
        </div>
      </div>

      {/* Grid of Summary Indicators */}
      <div className="dashboard-grid">
        <div className="card summary-card savings">
          <div className="summary-details savings">
            <h4>Total Net Balance</h4>
            <div className="value">{formatMoney(totalBalance)}</div>
          </div>
          <div className="summary-icon">
            <Wallet size={24} />
          </div>
        </div>

        <div className="card summary-card income">
          <div className="summary-details income">
            <h4>Monthly Income</h4>
            <div className="value">{formatMoney(monthIncome)}</div>
          </div>
          <div className="summary-icon">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="card summary-card expense">
          <div className="summary-details expense">
            <h4>Monthly Expenses</h4>
            <div className="value">{formatMoney(monthExpense)}</div>
          </div>
          <div className="summary-icon">
            <TrendingDown size={24} />
          </div>
        </div>

        <div className="card summary-card savings">
          <div className="summary-details savings" style={{ color: monthSavings >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            <h4>Monthly Net Savings</h4>
            <div className="value" style={{ color: 'inherit' }}>{formatMoney(monthSavings)}</div>
          </div>
          <div className="summary-icon">
            <Landmark size={24} />
          </div>
        </div>
      </div>

      {/* Content Columns */}
      <div className="content-grid">
        {/* Left Side: Recent Transactions & Budget Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Quick Add Widget */}
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={20} /> Quick Add Transaction
            </h3>
            
            {quickAddError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '8px' }}>{quickAddError}</div>}
            {quickAddSuccess && <div style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '8px' }}>{quickAddSuccess}</div>}
            
            <form onSubmit={handleQuickAdd} className="quick-add-form">
              <div className="form-group">
                <label>Type</label>
                <select 
                  className="input-premium" 
                  value={type} 
                  onChange={(e) => { setType(e.target.value); setCategoryId(''); }}
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </div>

              <div className="form-group">
                <label>Amount</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  className="input-premium"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Account</label>
                <select 
                  className="input-premium" 
                  value={accountId} 
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  <option value="">-- Choose --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select 
                  className="input-premium" 
                  value={categoryId} 
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">-- Choose --</option>
                  {filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: '2', minWidth: '200px' }}>
                <label>Notes</label>
                <input 
                  type="text" 
                  placeholder="Optional details" 
                  className="input-premium"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* Recent Activity List */}
          <div className="card">
            <h3>Recent Transactions</h3>
            {recentTransactions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>No transactions recorded yet.</p>
            ) : (
              <div className="table-container" style={{ border: 'none', marginTop: '12px' }}>
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th>Details</th>
                      <th>Account</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map(tx => {
                      const catColor = tx.category?.color || '#64748b';
                      const isIncome = tx.type === 'INCOME';
                      const isExpense = tx.type === 'EXPENSE';
                      const isTransfer = tx.type === 'TRANSFER';
                      
                      return (
                        <tr key={tx.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: isTransfer ? 'var(--info-light)' : `${catColor}15`,
                                display: 'flex',
                                alignItems: 'center',
                                color: isTransfer ? 'var(--info)' : catColor,
                                alignContent: 'center',
                                justifyContent: 'center'
                              }}>
                                {isTransfer ? (
                                  <Icon name="ArrowLeftRight" size={18} />
                                ) : (
                                  <Icon name={tx.category?.icon || 'HelpCircle'} size={18} />
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700 }}>
                                  {isTransfer 
                                    ? `Transfer` 
                                    : (tx.category?.name || 'Uncategorized')}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {tx.notes || ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>{tx.accountName || tx.account?.name || '-'}</td>
                          <td>{new Date(tx.date).toLocaleDateString()}</td>
                          <td style={{ 
                            textAlign: 'right', 
                            fontWeight: 800,
                            color: isIncome ? 'var(--success)' : (isExpense ? 'var(--danger)' : 'var(--info)')
                          }}>
                            {isIncome ? '+' : (isExpense ? '-' : '')}
                            {formatMoney(tx.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Account Balances & Budget Utilization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Account Balances Summary */}
          <div className="card">
            <h3>Accounts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              {accounts.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No accounts registered. Go to Accounts to create one.</p>
              ) : (
                accounts.map(acc => (
                  <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{acc.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{acc.type}</div>
                    </div>
                    <div style={{ fontWeight: 800 }}>{formatMoney(acc.balance)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Budgets Tracker Widget */}
          <div className="card">
            <h3>Budget Utilization</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {budgets.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No budgets defined for the current period.</p>
              ) : (
                budgets.map(b => {
                  const percent = Math.min(b.percentUsed || 0, 100);
                  const isBreached = percent >= 100;
                  const isWarning = percent >= 80 && percent < 100;
                  
                  let barColor = 'var(--primary)';
                  if (isBreached) barColor = 'var(--danger)';
                  else if (isWarning) barColor = 'var(--warning)';

                  return (
                    <div key={b.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                        <span>{b.categoryId ? (b.category?.name || 'Category') : 'Overall'} ({b.period})</span>
                        <span>{percent.toFixed(0)}%</span>
                      </div>
                      <div className="progress-container">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${percent}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>Spent: {formatMoney(b.used || 0)}</span>
                        <span>Limit: {formatMoney(b.amount)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
