import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Download, Calendar } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const Reports: React.FC = () => {
  const { token } = useAuth();

  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'custom'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Custom dates
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');

  const currencySymbol = '₹';

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 2; y++) {
    years.push(y);
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to fetch report data from backend
  const fetchReportData = async () => {
    let start = '';
    let end = '';

    if (reportType === 'monthly') {
      const firstDay = new Date(selectedYear, selectedMonth, 1);
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
    } else if (reportType === 'yearly') {
      const firstDay = new Date(selectedYear, 0, 1);
      const lastDay = new Date(selectedYear, 12, 0);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
    } else {
      start = startDate;
      end = endDate;
    }

    if (!start || !end) {
      throw new Error('Please select a valid date range');
    }

    const res = await fetch(`${API_BASE_URL}/reports?startDate=${start}&endDate=${end}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error('Failed to retrieve report dataset');
    }

    return res.json();
  };

  // EXPORT CSV
  const handleExportCSV = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await fetchReportData();
      const txs = data.transactions;

      if (txs.length === 0) {
        throw new Error('No transactions found in this date range');
      }

      // Build CSV String
      const headers = ['Date', 'Type', 'Amount', 'Account Name', 'Target Account', 'Category', 'Notes'];
      const rows = txs.map((t: any) => [
        new Date(t.date).toLocaleDateString(),
        t.type,
        t.amount,
        t.accountName || '',
        t.toAccountName || '',
        t.categoryName || '',
        t.notes || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `fintrack_report_${startOrEndStr()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccess('CSV generated and downloaded!');
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  // EXPORT EXCEL
  const handleExportExcel = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await fetchReportData();
      
      // Workbook sheets
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary Stats
      const summaryRows = [
        ['FIN TRACK - FINANCIAL STATEMENT'],
        ['Generated On', new Date().toLocaleString()],
        ['Period Range', `${data.range.start} to ${data.range.end}`],
        [],
        ['Metric', 'Amount'],
        ['Total Income', data.summary.totalIncome],
        ['Total Expense', data.summary.totalExpense],
        ['Net Savings Flow', data.summary.netCashFlow]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

      // Sheet 2: Category Breakdown
      const categoryRows = [
        ['Category Name', 'Flow Type', 'Amount Spent/Earned']
      ];
      data.categoryBreakdown.forEach((c: any) => {
        categoryRows.push([c.name, c.type, c.amount]);
      });
      const wsCategory = XLSX.utils.aoa_to_sheet(categoryRows);
      XLSX.utils.book_append_sheet(wb, wsCategory, 'Category Breakdown');

      // Sheet 3: Account Statements
      const accountRows = [
        ['Account Name', 'Account Type', 'Starting Balance', 'Total Inflows', 'Total Outflows', 'Ending Balance']
      ];
      data.accountSummary.forEach((a: any) => {
        accountRows.push([a.name, a.type, a.startingBalance, a.incomeSum, a.expenseSum, a.endingBalance]);
      });
      const wsAccounts = XLSX.utils.aoa_to_sheet(accountRows);
      XLSX.utils.book_append_sheet(wb, wsAccounts, 'Account Balances');

      // Sheet 4: Full Ledger Transactions Log
      const txRows = [
        ['Date', 'Type', 'Amount', 'Account Source', 'Account Destination', 'Category', 'Notes']
      ];
      data.transactions.forEach((t: any) => {
        txRows.push([
          new Date(t.date).toLocaleDateString(),
          t.type,
          t.amount,
          t.accountName || '',
          t.toAccountName || '',
          t.categoryName || '',
          t.notes || ''
        ]);
      });
      const wsTx = XLSX.utils.aoa_to_sheet(txRows);
      XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions Log');

      // Trigger Save
      XLSX.writeFile(wb, `fintrack_report_${startOrEndStr()}.xlsx`);
      setSuccess('Excel spreadsheet generated and saved!');
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  // EXPORT PDF
  const handleExportPDF = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await fetchReportData();
      
      const doc = new jsPDF();

      // Report Brand Header
      doc.setFontSize(22);
      doc.setTextColor(11, 26, 48); // Deep Dark Blue Accent
      doc.text('FIN TRACK', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(98, 125, 152); // Muted grey
      doc.text('Personal Finance & Expense Ledger', 14, 25);
      
      doc.setFontSize(11);
      doc.setTextColor(11, 26, 48);
      doc.text(`STATEMENT PERIOD: ${data.range.start} to ${data.range.end}`, 14, 34);
      doc.text(`GENERATED ON: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 39);

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 43, 196, 43);

      // Section 1: Executive Summary Card Shape
      doc.setFontSize(14);
      doc.text('1. Executive Statement Summary', 14, 52);

      const summaryTableData = [
        ['Metric Description', 'Amount Balance'],
        ['Total Period Incomes', `${currencySymbol}${data.summary.totalIncome.toFixed(2)}`],
        ['Total Period Expenses', `${currencySymbol}${data.summary.totalExpense.toFixed(2)}`],
        ['Net Period Savings Flow', `${currencySymbol}${data.summary.netCashFlow.toFixed(2)}`]
      ];

      (doc as any).autoTable({
        startY: 56,
        head: [summaryTableData[0]],
        body: summaryTableData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [15, 76, 129] } // Dark blue
      });

      // Section 2: Account Balances
      let currentY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(14);
      doc.text('2. Accounts & Balances Statement', 14, currentY);

      const accountsHead = ['Account Name', 'Type', 'Starting', 'Inflows', 'Outflows', 'Ending Balance'];
      const accountsBody = data.accountSummary.map((a: any) => [
        a.name,
        a.type,
        `${currencySymbol}${a.startingBalance.toFixed(2)}`,
        `${currencySymbol}${a.incomeSum.toFixed(2)}`,
        `${currencySymbol}${a.expenseSum.toFixed(2)}`,
        `${currencySymbol}${a.endingBalance.toFixed(2)}`
      ]);

      (doc as any).autoTable({
        startY: currentY + 4,
        head: [accountsHead],
        body: accountsBody,
        theme: 'striped',
        headStyles: { fillColor: [11, 26, 48] }
      });

      // Section 3: Categories Breakdown
      currentY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(14);
      doc.text('3. Category Allocations Breakdown', 14, currentY);

      const categoriesHead = ['Category Name', 'Type', 'Sum Allocated'];
      const categoriesBody = data.categoryBreakdown.map((c: any) => [
        c.name,
        c.type,
        `${currencySymbol}${c.amount.toFixed(2)}`
      ]);

      (doc as any).autoTable({
        startY: currentY + 4,
        head: [categoriesHead],
        body: categoriesBody,
        theme: 'striped',
        headStyles: { fillColor: [15, 76, 129] }
      });

      // Section 4: Transactions Log (Page Break Safe)
      doc.addPage();
      doc.setFontSize(14);
      doc.text('4. Historical Transactions Ledger Log', 14, 20);

      const txHead = ['Date', 'Type', 'Amount', 'Account Source', 'Category', 'Notes'];
      const txBody = data.transactions.map((t: any) => [
        new Date(t.date).toLocaleDateString(),
        t.type,
        `${currencySymbol}${t.amount.toFixed(2)}`,
        t.type === 'TRANSFER' ? `${t.accountName} ➔ ${t.toAccountName}` : (t.accountName || ''),
        t.categoryName || '-',
        t.notes || ''
      ]);

      (doc as any).autoTable({
        startY: 24,
        head: [txHead],
        body: txBody,
        theme: 'striped',
        headStyles: { fillColor: [11, 26, 48] },
        styles: { fontSize: 8.5 }
      });

      doc.save(`fintrack_report_${startOrEndStr()}.pdf`);
      setSuccess('Financial PDF Statement generated and downloaded!');
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const startOrEndStr = () => {
    if (reportType === 'monthly') {
      return `${months[selectedMonth].toLowerCase()}_${selectedYear}`;
    }
    if (reportType === 'yearly') {
      return `year_${selectedYear}`;
    }
    return `custom_${startDate}_to_${endDate}`;
  };

  // Unified downloader trigger
  const handleDownloadReport = (e: React.MouseEvent) => {
    e.preventDefault();
    if (exportFormat === 'pdf') {
      handleExportPDF();
    } else if (exportFormat === 'excel') {
      handleExportExcel();
    } else if (exportFormat === 'csv') {
      handleExportCSV();
    }
  };

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Statement Reports Exporter</h1>
          <p>Configure custom date boundaries and export transaction statements.</p>
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {/* Left Side: Report Filters */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} /> Report Period Details
          </h3>

          {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}
          {success && <div style={{ color: 'var(--success)', marginBottom: '16px', fontSize: '0.85rem' }}>{success}</div>}

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label>Period Range Type</label>
              <select 
                className="input-premium"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
              >
                <option value="monthly">Monthly Period Summary</option>
                <option value="yearly">Yearly Accumulations</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {reportType === 'monthly' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Select Month</label>
                  <select 
                    className="input-premium"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {months.map((m, idx) => (
                      <option key={idx} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Select Year</label>
                  <select 
                    className="input-premium"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {reportType === 'yearly' && (
              <div className="form-group">
                <label>Select Year</label>
                <select 
                  className="input-premium"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              </div>
            )}
          </form>
        </div>

        {/* Right Side: Download Channels Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'space-between' }}>
          <div>
            <h3>Download Statement Report</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px', marginBottom: '24px' }}>
              Select your export document format. FIN TRACK generates files locally in your browser.
            </p>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: '8px' }}>Select Format</label>
              <select 
                className="input-premium" 
                value={exportFormat} 
                onChange={(e) => setExportFormat(e.target.value as any)}
                style={{ width: '100%', padding: '10px 14px' }}
              >
                <option value="pdf">Structured PDF Document (.pdf)</option>
                <option value="excel">Microsoft Excel Spreadsheet (.xlsx)</option>
                <option value="csv">Comma-Separated Values (.csv)</option>
              </select>
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '14px', 
              gap: '10px', 
              fontSize: '1rem',
              fontWeight: 700,
              width: '100%' 
            }}
            onClick={handleDownloadReport}
            disabled={loading}
          >
            <Download size={20} />
            {loading ? 'Compiling Document...' : 'Download Report Statement'}
          </button>
        </div>

      </div>
    </div>
  );
};
