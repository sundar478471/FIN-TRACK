import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Icon } from './common/Icon';
import { Plus, Edit2, Trash2, Search, ArrowLeftRight, Calendar, Paperclip, Download, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface TransactionsProps {
  defaultType?: 'INCOME' | 'EXPENSE';
}

export const Transactions: React.FC<TransactionsProps> = ({ defaultType }) => {
  const { 
    transactions, 
    accounts, 
    categories, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction, 
    transferFunds 
  } = useFinance();

  const currencySymbol = '₹';

  // Filters state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [viewingTx, setViewingTx] = useState<any | null>(null);

  // Form State - Transaction
  const [txType, setTxType] = useState('EXPENSE');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txAccountId, setTxAccountId] = useState('');
  const [txCategoryId, setTxCategoryId] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txReceipt, setTxReceipt] = useState('');

  // Form State - Transfer
  const [tfFromAccount, setTfFromAccount] = useState('');
  const [tfToAccount, setTfToAccount] = useState('');
  const [tfAmount, setTfAmount] = useState('');
  const [tfDate, setTfDate] = useState(new Date().toISOString().split('T')[0]);
  const [tfNotes, setTfNotes] = useState('');

  const [error, setError] = useState('');

  // Format money helper
  const formatMoney = (val: number) => {
    return `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter categories matching transaction type
  const filteredCategories = categories.filter(c => c.type === (editingTx ? editingTx.type : txType));

  const handleOpenAddModal = () => {
    setEditingTx(null);
    const initialType = defaultType || 'EXPENSE';
    setTxType(initialType);
    setTxAmount('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxAccountId(accounts[0]?.id || '');
    setTxCategoryId(categories.filter(c => c.type === initialType)[0]?.id || '');
    setTxNotes('');
    setTxReceipt('');
    setError('');
    setIsTxModalOpen(true);
  };

  const handleOpenEditModal = (tx: any) => {
    setEditingTx(tx);
    setTxType(tx.type);
    setTxAmount(tx.amount.toString());
    setTxDate(new Date(tx.date).toISOString().split('T')[0]);
    setTxAccountId(tx.accountId || '');
    setTxCategoryId(tx.categoryId || '');
    setTxNotes(tx.notes || '');
    setTxReceipt(tx.receiptUrl || '');
    setError('');
    setIsTxModalOpen(true);
  };

  const handleOpenViewModal = (tx: any) => {
    setViewingTx(tx);
    setIsViewModalOpen(true);
  };

  const handleOpenTransferModal = () => {
    setTfFromAccount(accounts[0]?.id || '');
    setTfToAccount(accounts[1]?.id || '');
    setTfAmount('');
    setTfDate(new Date().toISOString().split('T')[0]);
    setTfNotes('');
    setError('');
    setIsTransferModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!txAccountId) return setError('Please select an account');
    if (txType !== 'TRANSFER' && !txCategoryId) return setError('Please select a category');
    if (!txAmount || Number(txAmount) <= 0) return setError('Please enter a valid amount');

    setIsTxModalOpen(false);

    const txPromise = editingTx
      ? updateTransaction(editingTx.id, {
          type: txType,
          amount: Number(txAmount),
          date: new Date(txDate).toISOString(),
          accountId: txAccountId,
          categoryId: txCategoryId || undefined,
          notes: txNotes,
          receiptUrl: txReceipt || undefined
        })
      : addTransaction({
          type: txType,
          amount: Number(txAmount),
          date: new Date(txDate).toISOString(),
          accountId: txAccountId,
          categoryId: txCategoryId || undefined,
          notes: txNotes,
          receiptUrl: txReceipt || undefined
        });

    txPromise.catch((err: any) => {
      alert(err.message || 'Failed to save transaction');
    });
  };

  // Override type filter strictly if defaultType prop is set
  const activeTypeFilter = defaultType || typeFilter;
  
  // 1. Search filter
  let processedTxs = transactions.filter(t => 
    t.notes?.toLowerCase().includes(search.toLowerCase()) ||
    categories.find(c => c.id === t.categoryId)?.name.toLowerCase().includes(search.toLowerCase())
  );

  // Date range filter
  if (fromDate) {
    const fromTime = new Date(fromDate).getTime();
    processedTxs = processedTxs.filter(t => new Date(t.date).getTime() >= fromTime);
  }
  if (toDate) {
    const toTime = new Date(toDate + 'T23:59:59').getTime();
    processedTxs = processedTxs.filter(t => new Date(t.date).getTime() <= toTime);
  }

  // 2. Type filter
  if (activeTypeFilter) {
    processedTxs = processedTxs.filter(t => t.type === activeTypeFilter);
  }

  // Rest of filtering is unchanged
  if (accountFilter) {
    processedTxs = processedTxs.filter(t => t.accountId === accountFilter);
  }

  if (categoryFilter) {
    processedTxs = processedTxs.filter(t => t.categoryId === categoryFilter);
  }

  processedTxs.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    const amountA = a.amount;
    const amountB = b.amount;

    if (sortBy === 'date_desc') return timeB - timeA;
    if (sortBy === 'date_asc') return timeA - timeB;
    if (sortBy === 'amount_desc') return amountB - amountA;
    if (sortBy === 'amount_asc') return amountA - amountB;
    return timeB - timeA;
  });

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tfFromAccount || !tfToAccount) return setError('Please select both source and target accounts');
    if (tfFromAccount === tfToAccount) return setError('Source and target accounts cannot be the same');
    if (!tfAmount || Number(tfAmount) <= 0) return setError('Enter a valid amount');

    setIsTransferModalOpen(false);

    transferFunds(tfFromAccount, tfToAccount, Number(tfAmount), tfNotes, new Date(tfDate).toISOString())
      .catch((err: any) => {
        alert(err.message || 'Failed to process transfer');
      });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await deleteTransaction(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete transaction');
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const title = defaultType === 'INCOME' 
      ? 'Incomes Ledger Report' 
      : defaultType === 'EXPENSE' 
        ? 'Expenses Ledger Report' 
        : 'Transactions Ledger Report';
    
    doc.setFontSize(16);
    doc.setTextColor(11, 26, 48); // Navy blue
    doc.text(title, 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Muted grey
    doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 22);

    const headers = [['Date', 'Type', 'Account', 'Category', 'Notes', 'Amount']];
    const data = processedTxs.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.type,
      accounts.find(a => a.id === t.accountId)?.name || '-',
      categories.find(c => c.id === t.categoryId)?.name || '-',
      t.notes || '',
      `Rs. ${t.amount.toFixed(2)}`
    ]);

    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 28,
      theme: 'striped',
      headStyles: { fillColor: [11, 26, 48] },
      styles: { fontSize: 9 }
    });

    const filename = defaultType === 'INCOME' 
      ? 'incomes_report.pdf' 
      : defaultType === 'EXPENSE' 
        ? 'expenses_report.pdf' 
        : 'transactions_report.pdf';

    doc.save(filename);
  };

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>
            {defaultType === 'INCOME' ? 'Incomes Ledger' : defaultType === 'EXPENSE' ? 'Expenses Ledger' : 'Transactions Log'}
          </h1>
          <p>
            {defaultType === 'INCOME' 
              ? 'View and manage your incoming revenue flows.' 
              : defaultType === 'EXPENSE' 
                ? 'View and manage your outgoing payment transactions.' 
                : 'Register income, log expenses, and transfer money between accounts.'}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleDownloadPDF} title="Download PDF Ledger">
            <Download size={16} /> Export PDF
          </button>
          {!defaultType && (
            <button className="btn btn-secondary" onClick={handleOpenTransferModal}>
              <ArrowLeftRight size={18} /> Transfer Funds
            </button>
          )}
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={18} /> Add {defaultType === 'INCOME' ? 'Income' : defaultType === 'EXPENSE' ? 'Expense' : 'Transaction'}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '18px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }} className="filters-flex-container">
          
          <div style={{ flex: '2', minWidth: '240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search notes or categories..." 
              className="input-premium"
              style={{ width: '100%', paddingLeft: '42px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {!defaultType && (
            <div style={{ minWidth: '120px' }}>
              <select className="input-premium" style={{ width: '100%' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>
          )}

          <div style={{ minWidth: '150px' }}>
            <select className="input-premium" style={{ width: '100%' }} value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
              <option value="">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <select className="input-premium" style={{ width: '100%' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>From:</span>
            <input 
              type="date" 
              className="input-premium" 
              style={{ padding: '8px 12px', fontSize: '0.85rem' }} 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>To:</span>
            <input 
              type="date" 
              className="input-premium" 
              style={{ padding: '8px 12px', fontSize: '0.85rem' }} 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          {(fromDate || toDate) && (
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => { setFromDate(''); setToDate(''); }}
              style={{ padding: '10px 14px' }}
            >
              Reset Dates
            </button>
          )}

          <div style={{ minWidth: '160px', marginLeft: 'auto' }}>
            <select className="input-premium" style={{ width: '100%' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date_desc">Newest Date</option>
              <option value="date_asc">Oldest Date</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>

        </div>
      </div>

      {/* Transactions List */}
      <div className="card" style={{ padding: '0px' }}>
        {processedTxs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '32px', textAlign: 'center' }}>No transactions match your current search filters.</p>
        ) : (
          <div className="table-container" style={{ border: 'none', margin: '0' }}>
            <table className="table-premium transactions-table">
              <thead>
                <tr>
                  <th>Category / Type</th>
                  <th>Notes</th>
                  <th>Account</th>
                  <th>Date</th>
                  <th>Receipt</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedTxs.map(t => {
                  const catColor = t.category?.color || '#64748b';
                  const isIncome = t.type === 'INCOME';
                  const isExpense = t.type === 'EXPENSE';
                  const isTransfer = t.type === 'TRANSFER';

                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: isTransfer ? 'var(--info-light)' : `${catColor}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isTransfer ? 'var(--info)' : catColor
                          }}>
                            {isTransfer ? (
                              <Icon name="ArrowLeftRight" size={18} />
                            ) : (
                              <Icon name={t.category?.icon || 'HelpCircle'} size={18} />
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              {isTransfer ? 'Transfer' : (t.category?.name || 'Uncategorized')}
                            </div>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: isIncome ? 'var(--success)' : (isExpense ? 'var(--danger)' : 'var(--info)') }}>
                              {t.type}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.notes || ''}
                      </td>
                      <td>
                        {isTransfer ? (
                          <div style={{ fontSize: '0.85rem' }}>
                            {t.account?.name || t.accountName} ➔ {t.toAccount?.name || t.toAccountName}
                          </div>
                        ) : (
                          t.account?.name || t.accountName || '-'
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                          <Calendar size={14} className="text-muted" />
                          {new Date(t.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        {t.receiptUrl ? (
                          <a href={t.receiptUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                            <Paperclip size={14} /> Receipt
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>
                        )}
                      </td>
                      <td style={{ 
                        textAlign: 'right', 
                        fontWeight: 800, 
                        fontSize: '1.05rem',
                        color: isIncome ? 'var(--success)' : (isExpense ? 'var(--danger)' : 'var(--info)') 
                      }}>
                        {isIncome ? '+' : (isExpense ? '-' : '')}
                        {formatMoney(t.amount)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', transition: 'color var(--transition-fast)' }} 
                            onClick={() => handleOpenViewModal(t)}
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', transition: 'color var(--transition-fast)' }} 
                            onClick={() => handleOpenEditModal(t)}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} 
                            onClick={() => handleDelete(t.id)}
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

      {/* Transaction Add/Edit Modal */}
      {isTxModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingTx ? 'Edit Transaction' : 'Add Transaction'}</h2>
              <button className="modal-close" onClick={() => setIsTxModalOpen(false)}>×</button>
            </div>
            
            {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}
            
            <form onSubmit={handleSaveTransaction}>
              {!defaultType && (
                <div className="form-group">
                  <label>Type</label>
                  <select 
                    className="input-premium" 
                    value={txType} 
                    disabled={!!editingTx} // Type locked on edit
                    onChange={(e) => {
                      setTxType(e.target.value);
                      setTxCategoryId(categories.filter(c => c.type === e.target.value)[0]?.id || '');
                    }}
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Amount</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  className="input-premium"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  className="input-premium"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Account</label>
                <select 
                  className="input-premium" 
                  value={txAccountId}
                  onChange={(e) => setTxAccountId(e.target.value)}
                  required
                >
                  <option value="">-- Select Account --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select 
                  className="input-premium" 
                  value={txCategoryId}
                  onChange={(e) => setTxCategoryId(e.target.value)}
                  required
                >
                  <option value="">-- Select Category --</option>
                  {filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <input 
                  type="text" 
                  placeholder="What is this transaction for?" 
                  className="input-premium"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Receipt Image URL</label>
                <input 
                  type="text" 
                  placeholder="Paste hosted image URL (optional)" 
                  className="input-premium"
                  value={txReceipt}
                  onChange={(e) => setTxReceipt(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsTxModalOpen(false)}>Cancel</button>
                 <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                   Save
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Funds Modal */}
      {isTransferModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Transfer Funds</h2>
              <button className="modal-close" onClick={() => setIsTransferModalOpen(false)}>×</button>
            </div>
            
            {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}
            
            <form onSubmit={handleSaveTransfer}>
              <div className="form-group">
                <label>From Account (Source)</label>
                <select 
                  className="input-premium" 
                  value={tfFromAccount}
                  onChange={(e) => setTfFromAccount(e.target.value)}
                  required
                >
                  <option value="">-- Select Source --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>To Account (Destination)</label>
                <select 
                  className="input-premium" 
                  value={tfToAccount}
                  onChange={(e) => setTfToAccount(e.target.value)}
                  required
                >
                  <option value="">-- Select Destination --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Amount</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  className="input-premium"
                  value={tfAmount}
                  onChange={(e) => setTfAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  className="input-premium"
                  value={tfDate}
                  onChange={(e) => setTfDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <input 
                  type="text" 
                  placeholder="Optional details" 
                  className="input-premium"
                  value={tfNotes}
                  onChange={(e) => setTfNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsTransferModalOpen(false)}>Cancel</button>
                 <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                   Transfer
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction View Details Modal */}
      {isViewModalOpen && viewingTx && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Transaction Details</h2>
              <button className="modal-close" onClick={() => setIsViewModalOpen(false)}>×</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Type</span>
                <span style={{ 
                  fontWeight: 700, 
                  textTransform: 'uppercase',
                  color: viewingTx.type === 'INCOME' ? 'var(--success)' : (viewingTx.type === 'EXPENSE' ? 'var(--danger)' : 'var(--info)')
                }}>
                  {viewingTx.type}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Amount</span>
                <span style={{ 
                  fontWeight: 800, 
                  fontSize: '1.1rem',
                  color: viewingTx.type === 'INCOME' ? 'var(--success)' : (viewingTx.type === 'EXPENSE' ? 'var(--danger)' : 'var(--info)')
                }}>
                  {viewingTx.type === 'INCOME' ? '+' : (viewingTx.type === 'EXPENSE' ? '-' : '')}
                  {formatMoney(viewingTx.amount)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Date</span>
                <span style={{ fontWeight: 600 }}>{new Date(viewingTx.date).toLocaleDateString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Account</span>
                <span style={{ fontWeight: 600 }}>
                  {viewingTx.type === 'TRANSFER' 
                    ? `${viewingTx.account?.name || viewingTx.accountName || '-'} ➔ ${viewingTx.toAccount?.name || viewingTx.toAccountName || '-'}` 
                    : (viewingTx.account?.name || viewingTx.accountName || '-')}
                </span>
              </div>

              {viewingTx.type !== 'TRANSFER' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Category</span>
                  <span style={{ fontWeight: 600, color: viewingTx.category?.color || 'inherit' }}>
                    {viewingTx.category?.name || 'Uncategorized'}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Notes</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {viewingTx.notes || <em style={{ color: 'var(--text-muted)' }}>No notes provided</em>}
                </span>
              </div>

              {viewingTx.receiptUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Receipt Attachment</span>
                  <a href={viewingTx.receiptUrl} target="_blank" rel="noreferrer" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
                    <Paperclip size={16} /> Open Receipt File
                  </a>
                  <div style={{ width: '100%', maxHeight: '200px', overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '8px' }}>
                    <img src={viewingTx.receiptUrl} alt="Receipt Preview" style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'contain' }} onError={(e) => { (e.target as any).style.display = 'none'; }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsViewModalOpen(false)}>Close</button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }} 
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleOpenEditModal(viewingTx);
                  }}
                >
                  Edit Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
