import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Plus, Edit2, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { Chart, registerables } from 'chart.js/auto';

Chart.register(...registerables);

export const Budgets: React.FC = () => {
  const { budgets, categories, addBudget, updateBudget, deleteBudget } = useFinance();
  
  const currencySymbol = '₹';

  // Chart canvas refs
  const statusPieRef = useRef<HTMLCanvasElement | null>(null);
  const statusBarRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstances = useRef<Record<string, Chart | null>>({});

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any | null>(null);

  useEffect(() => {
    const destroyChart = (key: string) => {
      if (chartInstances.current[key]) {
        chartInstances.current[key]?.destroy();
        chartInstances.current[key] = null;
      }
    };

    if (budgets.length === 0) return;

    let breached = 0;
    let warning = 0;
    let onTrack = 0;

    budgets.forEach(b => {
      if (b.percentUsed >= 100) breached++;
      else if (b.percentUsed >= 80) warning++;
      else onTrack++;
    });

    if (statusPieRef.current) {
      destroyChart('statusPie');
      const totalBudgets = onTrack + warning + breached;
      const onTrackPct = totalBudgets > 0 ? ((onTrack / totalBudgets) * 100).toFixed(1) : '0';
      const warningPct = totalBudgets > 0 ? ((warning / totalBudgets) * 100).toFixed(1) : '0';
      const breachedPct = totalBudgets > 0 ? ((breached / totalBudgets) * 100).toFixed(1) : '0';

      chartInstances.current['statusPie'] = new Chart(statusPieRef.current, {
        type: 'doughnut',
        data: {
          labels: [
            `On Track (${onTrack} - ${onTrackPct}%)`,
            `Warning (${warning} - ${warningPct}%)`,
            `Breached (${breached} - ${breachedPct}%)`
          ],
          datasets: [{
            data: [onTrack, warning, breached],
            backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
            borderWidth: 1,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { size: 10 }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  const value = context.parsed;
                  const pct = totalBudgets > 0 ? ((value / totalBudgets) * 100).toFixed(1) : '0';
                  return ` ${context.label.split(' (')[0]}: ${value} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    if (statusBarRef.current) {
      destroyChart('statusBar');
      
      const labels = budgets.map(b => b.categoryId ? (b.category?.name || 'Category') : 'Overall');
      const limitData = budgets.map(b => b.amount);
      const spentData = budgets.map(b => b.used || 0);

      chartInstances.current['statusBar'] = new Chart(statusBarRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Spent',
              data: spentData,
              backgroundColor: 'rgba(239, 68, 68, 0.75)',
              borderColor: '#EF4444',
              borderWidth: 1,
            },
            {
              label: 'Limit',
              data: limitData,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: '#3B82F6',
              borderWidth: 1,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true,
              grid: { display: false }
            },
            y: {
              grid: { display: false }
            }
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { size: 10 }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  const datasetIndex = context.datasetIndex;
                  const index = context.dataIndex;
                  const value = context.parsed.x;
                  if (datasetIndex === 0) { // Spent
                    const limit = context.chart.data.datasets[1].data[index];
                    const percentage = limit > 0 ? ((value / limit) * 100).toFixed(1) : 0;
                    return ` Spent: ₹${value.toLocaleString()} (${percentage}% of limit)`;
                  } else { // Limit
                    return ` Limit: ₹${value.toLocaleString()}`;
                  }
                }
              }
            }
          }
        }
      });
    }

    return () => {
      destroyChart('statusPie');
      destroyChart('statusBar');
    };
  }, [budgets]);

  // Form State
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('MONTHLY');
  const [categoryId, setCategoryId] = useState('');
  
  // Set default dates: first day of current month to last day of current month
  const getMonthDateRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };

  const [startDate, setStartDate] = useState(getMonthDateRange().start);
  const [endDate, setEndDate] = useState(getMonthDateRange().end);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatMoney = (val: number) => {
    return `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenAdd = () => {
    setEditingBudget(null);
    setAmount('');
    setPeriod('MONTHLY');
    setCategoryId('');
    const dates = getMonthDateRange();
    setStartDate(dates.start);
    setEndDate(dates.end);
    setError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (b: any) => {
    setEditingBudget(b);
    setAmount(b.amount.toString());
    setPeriod(b.period);
    setCategoryId(b.categoryId || '');
    setStartDate(new Date(b.startDate).toISOString().split('T')[0]);
    setEndDate(new Date(b.endDate).toISOString().split('T')[0]);
    setError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount || Number(amount) <= 0) return setError('Amount must be greater than zero');
    if (!startDate || !endDate) return setError('Start date and End date are required');
    if (new Date(startDate) > new Date(endDate)) return setError('Start date cannot be after end date');

    setLoading(true);
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, {
          amount: Number(amount),
          period,
          categoryId: categoryId || null,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString()
        });
      } else {
        await addBudget(
          Number(amount),
          period,
          categoryId || null,
          new Date(startDate).toISOString(),
          new Date(endDate).toISOString()
        );
      }
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (b: any) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    try {
      await deleteBudget(b.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete budget');
    }
  };

  // Only expense categories can be budgeted
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Budgets Tracker</h1>
          <p>Limit your expenditures per category or overall, and track progress.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Set Budget
          </button>
        </div>
      </div>

      {budgets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <AlertTriangle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>No Budgets Defined</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '20px' }}>
            Setup a category budget (e.g. Food limit) or an overall monthly budget to keep expenses in check.
          </p>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            Setup First Budget
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }} className="budgets-flex-layout">
          {/* Left Column: Budget Cards Grid (Main) */}
          <div style={{ flex: '3', minWidth: '320px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }} className="budgets-list-main">
            {budgets.map(b => {
              const percent = Math.min(b.percentUsed || 0, 100);
              const isBreached = b.percentUsed >= 100;
              const isWarning = b.percentUsed >= 80 && b.percentUsed < 100;
              
              let cardBorderColor = 'var(--border-color)';
              let statusText = 'On Track';
              let statusColor = 'var(--success)';
              let barColor = 'var(--success)';
              let badgeBg = 'var(--success-light)';

              if (isBreached) {
                cardBorderColor = 'var(--danger)';
                statusText = 'Limit Breached!';
                statusColor = 'var(--danger)';
                barColor = 'var(--danger)';
                badgeBg = 'var(--danger-light)';
              } else if (isWarning) {
                cardBorderColor = 'var(--warning)';
                statusText = 'Warning: Over 80%';
                statusColor = 'var(--warning)';
                barColor = 'var(--warning)';
                badgeBg = 'var(--warning-light)';
              }

              return (
                <div 
                  key={b.id} 
                  className="card" 
                  style={{ 
                    borderColor: cardBorderColor, 
                    borderWidth: (isBreached || isWarning) ? '1.5px' : '1px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span 
                        className="badge" 
                        style={{ 
                          backgroundColor: b.categoryId ? `${b.category?.color || '#3b82f6'}15` : 'var(--primary-light)', 
                          color: b.categoryId ? (b.category?.color || 'var(--primary)') : 'var(--primary)', 
                          fontSize: '0.65rem',
                          marginBottom: '8px'
                        }}
                      >
                        {b.categoryId ? (b.category?.name || 'Category') : 'Overall Spending'}
                      </span>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                        {formatMoney(b.amount)}
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          {' '}/{b.period.toLowerCase()}
                        </span>
                      </h2>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                      <span className="badge" style={{ backgroundColor: badgeBg, color: statusColor }}>
                        {statusText}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px', transition: 'color var(--transition-fast)' }}
                          onClick={() => handleOpenEdit(b)}
                          title="Edit Budget"
                          className="btn-icon"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '4px', transition: 'color var(--transition-fast)' }}
                          onClick={() => handleDelete(b)}
                          title="Delete Budget"
                          className="btn-icon"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                      <span>Progress: {percent.toFixed(0)}% used</span>
                      <span style={{ color: b.remaining < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {b.remaining < 0 
                          ? `Overspent: ${formatMoney(Math.abs(b.remaining))}` 
                          : `Remaining: ${formatMoney(b.remaining)}`}
                      </span>
                    </div>
                    <div className="progress-container" style={{ margin: '0' }}>
                      <div 
                        className="progress-bar" 
                        style={{ width: `${percent}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      <span>Spent: {formatMoney(b.used || 0)}</span>
                      <span>Budget: {formatMoney(b.amount)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                    <Calendar size={12} />
                    <span>
                      {new Date(b.startDate).toLocaleDateString()} to {new Date(b.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Budget Status Analytics (Sidebar) */}
          <div style={{ flex: '1', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }} className="budgets-sidebar-analytics">
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Budget Status Distribution</h3>
              <div style={{ position: 'relative', height: '220px' }}>
                <canvas ref={statusPieRef}></canvas>
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Spent vs Budget Limit</h3>
              <div style={{ position: 'relative', height: '250px' }}>
                <canvas ref={statusBarRef}></canvas>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal Dialog */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingBudget ? 'Edit Budget' : 'Set Budget'}</h2>
              <button className="modal-close" onClick={() => setIsOpen(false)}>×</button>
            </div>

            {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Budget Limit Amount</label>
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
                <label>Limit Period</label>
                <select 
                  className="input-premium" 
                  value={period} 
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>

              <div className="form-group">
                <label>Scope / Category</label>
                <select 
                  className="input-premium" 
                  value={categoryId} 
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Overall Spending Limit (All Categories)</option>
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Start Date</label>
                <input 
                  type="date" 
                  className="input-premium"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input 
                  type="date" 
                  className="input-premium"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
