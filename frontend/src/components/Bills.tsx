import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight } from 'lucide-react';

interface BillsProps {
  defaultView?: 'list' | 'calendar';
}

export const Bills: React.FC<BillsProps> = ({ defaultView }) => {
  const { bills, accounts, addBill, updateBill, deleteBill, transactions } = useFinance();

  const currencySymbol = '₹';

  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>(defaultView || 'list');

  React.useEffect(() => {
    if (defaultView) {
      setActiveTab(defaultView);
    }
  }, [defaultView]);

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals state
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  
  const [selectedBill, setSelectedBill] = useState<any | null>(null);

  // Form State - Bill
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('MONTHLY');

  // Form State - Pay Bill
  const [payAccountId, setPayAccountId] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatMoney = (val: number) => {
    return `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenAddBill = () => {
    setSelectedBill(null);
    setName('');
    setAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setIsRecurring(false);
    setFrequency('MONTHLY');
    setError('');
    setIsBillModalOpen(true);
  };

  const handleOpenEditBill = (bill: any) => {
    setSelectedBill(bill);
    setName(bill.name);
    setAmount(bill.amount.toString());
    setDueDate(new Date(bill.dueDate).toISOString().split('T')[0]);
    setIsRecurring(bill.isRecurring);
    setFrequency(bill.frequency || 'MONTHLY');
    setError('');
    setIsBillModalOpen(true);
  };

  const handleOpenPayBill = (bill: any) => {
    setSelectedBill(bill);
    setPayAccountId(accounts[0]?.id || '');
    setError('');
    setIsPayModalOpen(true);
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Bill name is required');
    if (!amount || Number(amount) <= 0) return setError('Amount must be greater than zero');
    if (!dueDate) return setError('Due date is required');

    setLoading(true);
    try {
      if (selectedBill) {
        await updateBill(selectedBill.id, {
          name: name.trim(),
          amount: Number(amount),
          dueDate: new Date(dueDate).toISOString(),
          isRecurring,
          frequency: isRecurring ? frequency : null
        });
      } else {
        await addBill(
          name.trim(),
          Number(amount),
          new Date(dueDate).toISOString(),
          isRecurring,
          frequency
        );
      }
      setIsBillModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  const handlePayBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!payAccountId) return setError('Select an account to pay from');

    setLoading(true);
    try {
      await updateBill(selectedBill.id, {
        status: 'PAID',
        accountId: payAccountId
      });
      setIsPayModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to complete payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBill = async (bill: any) => {
    if (!window.confirm(`Are you sure you want to delete bill: "${bill.name}"?`)) return;
    try {
      await deleteBill(bill.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete bill');
    }
  };

  // CALENDAR BUILDER LOGIC
  const startOfCalendarMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfCalendarMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const startDayIndex = startOfCalendarMonth.getDay(); // 0 is Sunday
  const daysInMonth = endOfCalendarMonth.getDate();

  const prevMonthDaysCount = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Render Days Grid
  const calendarCells = [];

  // 1. Fill leading empty cells (previous month overlap)
  for (let i = startDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      dayNum: prevMonthDaysCount - i,
      isEmpty: true,
      dateString: ''
    });
  }

  // 2. Fill active days
  for (let i = 1; i <= daysInMonth; i++) {
    const fullDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    calendarCells.push({
      dayNum: i,
      isEmpty: false,
      dateString: fullDate.toISOString().split('T')[0]
    });
  }

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>
            {defaultView === 'list' ? 'Scheduled Bills' : defaultView === 'calendar' ? 'Bills Calendar' : 'Bills & Calendar'}
          </h1>
          <p>
            {defaultView === 'list' 
              ? 'Schedule and manage your upcoming recurring invoices and payment reminders.' 
              : defaultView === 'calendar'
                ? 'Visualize cash flows, salary payouts, and bill deadlines on a monthly timeline.'
                : 'Schedule your invoices and visualize cash flow streams on a calendar grid.'}
          </p>
        </div>
        <div className="header-actions">
          {!defaultView && (
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '4px', backgroundColor: 'var(--bg-secondary)', gap: '4px' }}>
              <button 
                className="btn btn-sm" 
                style={{ 
                  backgroundColor: activeTab === 'list' ? 'var(--bg-primary)' : 'transparent',
                  color: 'var(--text-primary)',
                  boxShadow: activeTab === 'list' ? 'var(--shadow-sm)' : 'none',
                  border: 'none'
                }}
                onClick={() => setActiveTab('list')}
              >
                List View
              </button>
              <button 
                className="btn btn-sm"
                style={{ 
                  backgroundColor: activeTab === 'calendar' ? 'var(--bg-primary)' : 'transparent',
                  color: 'var(--text-primary)',
                  boxShadow: activeTab === 'calendar' ? 'var(--shadow-sm)' : 'none',
                  border: 'none'
                }}
                onClick={() => setActiveTab('calendar')}
              >
                Calendar View
              </button>
            </div>
          )}
          {activeTab === 'list' && (
            <button className="btn btn-primary" onClick={handleOpenAddBill}>
              <Plus size={18} /> Add Bill
            </button>
          )}
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="card" style={{ padding: '0px' }}>
          {bills.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', padding: '32px', textAlign: 'center' }}>No bills scheduled yet.</p>
          ) : (
            <div className="table-container" style={{ border: 'none', margin: '0' }}>
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Bill Title</th>
                    <th>Due Date</th>
                    <th>Frequency</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'center', width: '220px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(b => {
                    const isUnpaid = b.status === 'UNPAID';
                    const isOverdue = isUnpaid && new Date(b.dueDate) < new Date();

                    return (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 700 }}>{b.name}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                            <CalendarIcon size={14} className="text-muted" />
                            <span style={{ color: isOverdue ? 'var(--danger)' : 'inherit', fontWeight: isOverdue ? 700 : 500 }}>
                              {new Date(b.dueDate).toLocaleDateString()}
                              {isOverdue && ' (Overdue!)'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {b.isRecurring ? `Recurring (${b.frequency?.toLowerCase()})` : 'One-Time'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${b.status.toLowerCase()}`}>
                            {b.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem' }}>
                          {formatMoney(b.amount)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            {isUnpaid && (
                              <button 
                                className="btn btn-primary btn-sm" 
                                style={{ backgroundColor: 'var(--success)', border: 'none', color: '#fff', padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleOpenPayBill(b)}
                              >
                                <Check size={12} /> Mark Paid
                              </button>
                            )}
                            <button 
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} 
                              onClick={() => handleOpenEditBill(b)}
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} 
                              onClick={() => handleDeleteBill(b)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Calendar Monthly View */
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.4rem' }}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth}>
                <ChevronLeft size={16} />
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setCurrentDate(new Date())}>
                Today
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleNextMonth}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="calendar-day-header">{day}</div>
            ))}

            {calendarCells.map((cell, idx) => {
              // Find matching transactions and bills for this date
              const cellDate = cell.dateString;
              const cellTransactions = cellDate 
                ? transactions.filter(t => t.date.split('T')[0] === cellDate)
                : [];
              const cellBills = cellDate 
                ? bills.filter(b => b.dueDate.split('T')[0] === cellDate)
                : [];

              return (
                <div key={idx} className={`calendar-day ${cell.isEmpty ? 'empty' : ''}`}>
                  <div className="calendar-day-num">{cell.dayNum}</div>
                  <div className="calendar-day-events">
                    
                    {/* Render Income items */}
                    {cellTransactions.filter(t => t.type === 'INCOME').map(t => (
                      <div key={t.id} className="calendar-event-dot calendar-event-income" title={`Income: ${formatMoney(t.amount)}`}>
                        +{formatMoney(t.amount)}
                      </div>
                    ))}

                    {/* Render Expense items */}
                    {cellTransactions.filter(t => t.type === 'EXPENSE').map(t => (
                      <div key={t.id} className="calendar-event-dot calendar-event-expense" title={`Spend: ${formatMoney(t.amount)}`}>
                        -{formatMoney(t.amount)}
                      </div>
                    ))}

                    {/* Render Bills due */}
                    {cellBills.map(b => (
                      <div key={b.id} className="calendar-event-dot calendar-event-bill" title={`Bill due: ${b.name} (${formatMoney(b.amount)})`}>
                        🔔 {b.name}
                      </div>
                    ))}

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bill Add / Edit Modal */}
      {isBillModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedBill ? 'Edit Bill Reminder' : 'Add Bill Reminder'}</h2>
              <button className="modal-close" onClick={() => setIsBillModalOpen(false)}>×</button>
            </div>

            {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}

            <form onSubmit={handleSaveBill}>
              <div className="form-group">
                <label>Bill Name / Vendor</label>
                <input 
                  type="text" 
                  placeholder="e.g. Electric Bill, Rent" 
                  className="input-premium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Amount Due</label>
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
                <label>Due Date</label>
                <input 
                  type="date" 
                  className="input-premium"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                <input 
                  type="checkbox" 
                  id="recurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="recurring" style={{ cursor: 'pointer' }}>This is a recurring bill</label>
              </div>

              {isRecurring && (
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Billing Cycle / Frequency</label>
                  <select 
                    className="input-premium" 
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsBillModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Bill Confirmation Modal */}
      {isPayModalOpen && selectedBill && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Confirm Bill Payment</h2>
              <button className="modal-close" onClick={() => setIsPayModalOpen(false)}>×</button>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              You are marking <strong>{selectedBill.name}</strong> as PAID. This will automatically deduct <strong>{formatMoney(selectedBill.amount)}</strong> by adding an Expense transaction to your log.
            </p>

            {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}

            <form onSubmit={handlePayBillSubmit}>
              <div className="form-group">
                <label>Select Account to Pay From</label>
                <select 
                  className="input-premium" 
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Account --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsPayModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--success)' }} disabled={loading}>
                  {loading ? 'Confirm Payment' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
