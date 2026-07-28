import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { transactions, accounts, categories } = useFinance();
  
  const currencySymbol = '₹';

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyTransactions, setDailyTransactions] = useState<any[]>([]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Get days of the month grid
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Previous month's overlapping days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i)
      });
    }
    
    // Current month's days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // Next month's overlapping days to fill the grid (multiple of 7)
    const remaining = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to check if dates match
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  // Fetch transactions for the selected day
  useEffect(() => {
    const filtered = transactions.filter(t => {
      const txDate = new Date(t.date);
      return isSameDay(txDate, selectedDate);
    });
    setDailyTransactions(filtered);
  }, [selectedDate, transactions]);

  // Calculate day sums for cell indicators
  const getDaySums = (date: Date) => {
    const dayTxs = transactions.filter(t => isSameDay(new Date(t.date), date));
    const income = dayTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTxs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    return { income, expense };
  };

  // Handle manual date entry / date picker selection
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
    setCurrentDate(newDate); // Synchronize calendar month view
  };

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Financial Calendar</h1>
          <p>Select any date to view detailed income logs, expenses, and cash flow history.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'stretch' }}>
        
        {/* Left Side: Monthly Calendar Grid */}
        <div className="card" style={{ flex: '3', minWidth: '320px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            
            {/* Quick Picker & Month Switchers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Select Date:</span>
                <input 
                  type="date" 
                  className="input-premium" 
                  style={{ padding: '6px 12px', fontSize: '0.85rem', width: '150px' }}
                  value={selectedDate.toISOString().split('T')[0]} 
                  onChange={handleDateInputChange}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth} style={{ padding: '6px 10px' }}>
                  <ChevronLeft size={16} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedDate(new Date()); setCurrentDate(new Date()); }} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                  Today
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleNextMonth} style={{ padding: '6px 10px' }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid UI */}
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="calendar-day-header" style={{ fontWeight: 700, padding: '8px 0', fontSize: '0.85rem' }}>{day}</div>
            ))}
            
            {getDaysInMonth().map(({ day, isCurrentMonth, date }, idx) => {
              const selected = isSameDay(date, selectedDate);
              const today = isSameDay(date, new Date());
              const { income, expense } = getDaySums(date);
              
              return (
                <div 
                  key={idx} 
                  className={`calendar-day-cell ${isCurrentMonth ? '' : 'outside'} ${selected ? 'active' : ''} ${today ? 'today' : ''}`}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    minHeight: '80px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    backgroundColor: selected ? 'var(--info-light)' : today ? 'var(--primary-light)' : 'inherit',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.2s ease',
                    boxShadow: selected ? 'inset 0 0 0 2px var(--info)' : 'none'
                  }}
                >
                  <span style={{ 
                    fontWeight: selected || today ? 800 : 500, 
                    fontSize: '0.9rem',
                    color: isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)'
                  }}>
                    {day}
                  </span>
                  
                  {/* Daily Sum Indicators */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.7rem', width: '100%', textAlign: 'left' }}>
                    {income > 0 && (
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                        +{currencySymbol}{income.toLocaleString()}
                      </span>
                    )}
                    {expense > 0 && (
                      <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                        -{currencySymbol}{expense.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Day's Ledger (Side Panel) */}
        <div className="card" style={{ flex: '2', minWidth: '300px', display: 'flex', flexDirection: 'column', padding: '20px' }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 800, 
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CalendarIcon size={20} style={{ color: 'var(--primary)' }} />
            Day Details
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', fontWeight: 600 }}>
            {selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div style={{ flex: '1', overflowY: 'auto' }}>
            {dailyTransactions.length === 0 ? (
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '40px 10px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                gap: '12px'
              }}>
                <Wallet size={36} style={{ strokeWidth: 1.5 }} />
                <span style={{ fontSize: '0.85rem' }}>No transactions recorded on this day.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dailyTransactions.map(tx => {
                  const isIncome = tx.type === 'INCOME';
                  const isTransfer = tx.type === 'TRANSFER';
                  const cat = categories.find(c => c.id === tx.categoryId);
                  
                  return (
                    <div 
                      key={tx.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isIncome ? 'var(--success-light)' : isTransfer ? 'var(--info-light)' : 'var(--danger-light)',
                          color: isIncome ? 'var(--success)' : isTransfer ? 'var(--info)' : 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isIncome ? <ArrowUpRight size={16} /> : isTransfer ? <ChevronLeft size={16} /> : <ArrowDownLeft size={16} />}
                        </div>
                        
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            {cat ? cat.name : isTransfer ? 'Account Transfer' : 'Expense'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {tx.notes || 'No description'}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontWeight: 800, 
                          fontSize: '0.95rem',
                          color: isIncome ? 'var(--success)' : isTransfer ? 'var(--info)' : 'var(--danger)'
                        }}>
                          {isIncome ? '+' : isTransfer ? '' : '-'}{currencySymbol}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {accounts.find(a => a.id === tx.accountId)?.name || 'Default'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
