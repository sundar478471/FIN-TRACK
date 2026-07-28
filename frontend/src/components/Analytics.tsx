import React, { useEffect, useRef } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Chart, registerables } from 'chart.js/auto';
import { BarChart3, TrendingUp, DollarSign } from 'lucide-react';

Chart.register(...registerables);

export const Analytics: React.FC = () => {
  const { transactions, categories } = useFinance();
  
  const currencySymbol = '₹';

  // Chart canvas refs
  const incExpRef = useRef<HTMLCanvasElement | null>(null);
  const catBreakRef = useRef<HTMLCanvasElement | null>(null);
  const monthlySpendRef = useRef<HTMLCanvasElement | null>(null);
  const cashFlowRef = useRef<HTMLCanvasElement | null>(null);
  const savingsRef = useRef<HTMLCanvasElement | null>(null);
  const weeklyRef = useRef<HTMLCanvasElement | null>(null);

  // Instantiated chart instances stored in refs to destroy on cleanup
  const chartInstances = useRef<Record<string, Chart | null>>({});

  useEffect(() => {
    // Helper to destroy existing chart to avoid canvas reuse errors
    const destroyChart = (key: string) => {
      if (chartInstances.current[key]) {
        chartInstances.current[key]?.destroy();
        chartInstances.current[key] = null;
      }
    };

    // Calculate aggregations
    // 1. Income vs Expense
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(t => {
      if (t.type === 'INCOME') totalIncome += t.amount;
      if (t.type === 'EXPENSE') totalExpense += t.amount;
    });

    // 2. Category Breakdown (Expenses only)
    const expenseCategoriesMap: Record<string, { name: string; amount: number; color: string }> = {};
    transactions.forEach(t => {
      if (t.type !== 'EXPENSE' || !t.categoryId) return;
      const cat = categories.find(c => c.id === t.categoryId);
      if (!cat) return;

      if (!expenseCategoriesMap[t.categoryId]) {
        expenseCategoriesMap[t.categoryId] = {
          name: cat.name,
          amount: 0,
          color: cat.color || '#64748b'
        };
      }
      expenseCategoriesMap[t.categoryId].amount += t.amount;
    });

    const categoryNames = Object.values(expenseCategoriesMap).map(c => c.name);
    const categoryAmounts = Object.values(expenseCategoriesMap).map(c => c.amount);
    const categoryColors = Object.values(expenseCategoriesMap).map(c => c.color);

    // 3. Monthly Spending (Last 6 Months)
    const last6Months: Array<{ name: string; income: number; expense: number; key: string }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      last6Months.push({
        name: label,
        income: 0,
        expense: 0,
        key: `${d.getFullYear()}-${d.getMonth()}`
      });
    }

    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = last6Months.find(m => m.key === key);
      if (bucket) {
        if (t.type === 'INCOME') bucket.income += t.amount;
        if (t.type === 'EXPENSE') bucket.expense += t.amount;
      }
    });

    // 4. Weekly Spending (Last 7 Days)
    const last7Days: Array<{ label: string; dateStr: string; amount: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      last7Days.push({
        label,
        dateStr: d.toISOString().split('T')[0],
        amount: 0
      });
    }

    transactions.forEach(t => {
      const txDateStr = t.date.split('T')[0];
      const bucket = last7Days.find(day => day.dateStr === txDateStr);
      if (bucket && t.type === 'EXPENSE') {
        bucket.amount += t.amount;
      }
    });

    // 5. Savings Trend (Cumulative Income - Expense over Last 6 Months)
    let cumulativeSavings = 0;
    // Walk through all transactions to calculate cumulative savings up to month start
    // For simplicity, we calculate cumulative starting from the first month in last6Months
    const firstMonthDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    transactions.forEach(t => {
      if (new Date(t.date) < firstMonthDate) {
        if (t.type === 'INCOME') cumulativeSavings += t.amount;
        if (t.type === 'EXPENSE') cumulativeSavings -= t.amount;
      }
    });

    const savingsHistoryData = last6Months.map(m => {
      cumulativeSavings += (m.income - m.expense);
      return cumulativeSavings;
    });

    // CHART RENDERING CODE
    
    // Chart 1: Income vs Expense Pie Chart
    if (incExpRef.current) {
      destroyChart('incExp');
      chartInstances.current['incExp'] = new Chart(incExpRef.current, {
        type: 'pie',
        data: {
          labels: ['Income', 'Expense'],
          datasets: [{
            data: [totalIncome, totalExpense],
            backgroundColor: ['#10b981', '#ef4444'],
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // Chart 2: Category Breakdown Donut Chart
    if (catBreakRef.current && categoryNames.length > 0) {
      destroyChart('catBreak');
      chartInstances.current['catBreak'] = new Chart(catBreakRef.current, {
        type: 'doughnut',
        data: {
          labels: categoryNames,
          datasets: [{
            data: categoryAmounts,
            backgroundColor: categoryColors,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // Chart 3: Monthly Spending Bar Chart
    if (monthlySpendRef.current) {
      destroyChart('monthlySpend');
      chartInstances.current['monthlySpend'] = new Chart(monthlySpendRef.current, {
        type: 'bar',
        data: {
          labels: last6Months.map(m => m.name),
          datasets: [{
            label: 'Expenses',
            data: last6Months.map(m => m.expense),
            backgroundColor: '#ef4444'
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // Chart 4: Cash Flow Line Chart (Income vs Expense)
    if (cashFlowRef.current) {
      destroyChart('cashFlow');
      chartInstances.current['cashFlow'] = new Chart(cashFlowRef.current, {
        type: 'line',
        data: {
          labels: last6Months.map(m => m.name),
          datasets: [
            {
              label: 'Income',
              data: last6Months.map(m => m.income),
              borderColor: '#10b981',
              tension: 0.1,
              fill: false
            },
            {
              label: 'Expense',
              data: last6Months.map(m => m.expense),
              borderColor: '#ef4444',
              tension: 0.1,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // Chart 5: Savings Trend Line Chart
    if (savingsRef.current) {
      destroyChart('savings');
      chartInstances.current['savings'] = new Chart(savingsRef.current, {
        type: 'line',
        data: {
          labels: last6Months.map(m => m.name),
          datasets: [{
            label: 'Net Savings Balance',
            data: savingsHistoryData,
            borderColor: '#0f4c81',
            backgroundColor: 'rgba(15, 76, 129, 0.05)',
            tension: 0.15,
            fill: true
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // Chart 6: Weekly Spending Bar Chart
    if (weeklyRef.current) {
      destroyChart('weekly');
      chartInstances.current['weekly'] = new Chart(weeklyRef.current, {
        type: 'bar',
        data: {
          labels: last7Days.map(d => d.label),
          datasets: [{
            label: 'Expense',
            data: last7Days.map(d => d.amount),
            backgroundColor: '#f59e0b'
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // Cleanup on unmount
    return () => {
      destroyChart('incExp');
      destroyChart('catBreak');
      destroyChart('monthlySpend');
      destroyChart('cashFlow');
      destroyChart('savings');
      destroyChart('weekly');
    };
  }, [transactions, categories]);

  // Aggregate numbers
  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  const formatMoneyText = (val: number) => {
    return `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Analytics & Insights</h1>
          <p>Visual reports based strictly on your historical entries.</p>
        </div>
      </div>

      {/* Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>CUMULATIVE INCOME</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>{formatMoneyText(totalIncome)}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>CUMULATIVE EXPENSE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>{formatMoneyText(totalExpense)}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>CUMULATIVE SAVINGS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{formatMoneyText(netSavings)}</div>
          </div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No Data Available for Charts</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Add some transaction entries to generate mathematical analytics maps.
          </p>
        </div>
      ) : (
        /* Charts Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          
          {/* Income vs Expense Pie Chart */}
          <div className="card">
            <h3>Income vs Expense Ratio</h3>
            <div style={{ position: 'relative', height: '260px', display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <canvas ref={incExpRef}></canvas>
            </div>
          </div>

          {/* Category Breakdown Donut Chart */}
          <div className="card">
            <h3>Category Spending Breakdown</h3>
            <div style={{ position: 'relative', height: '260px', display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              {transactions.filter(t => t.type === 'EXPENSE').length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', alignSelf: 'center' }}>No expense categories recorded yet.</p>
              ) : (
                <canvas ref={catBreakRef}></canvas>
              )}
            </div>
          </div>

          {/* Monthly Spending Bar Chart */}
          <div className="card">
            <h3>Monthly Spending (6-Month Range)</h3>
            <div style={{ position: 'relative', height: '260px', marginTop: '16px' }}>
              <canvas ref={monthlySpendRef}></canvas>
            </div>
          </div>

          {/* Cash Flow Line Chart */}
          <div className="card">
            <h3>Cash Flow Trend (Income vs Expense)</h3>
            <div style={{ position: 'relative', height: '260px', marginTop: '16px' }}>
              <canvas ref={cashFlowRef}></canvas>
            </div>
          </div>

          {/* Savings Balance Trend Line Chart */}
          <div className="card">
            <h3>Savings Net Balance Growth</h3>
            <div style={{ position: 'relative', height: '260px', marginTop: '16px' }}>
              <canvas ref={savingsRef}></canvas>
            </div>
          </div>

          {/* Weekly Spending Bar Chart */}
          <div className="card">
            <h3>Weekly Spending (Last 7 Days)</h3>
            <div style={{ position: 'relative', height: '260px', marginTop: '16px' }}>
              <canvas ref={weeklyRef}></canvas>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
