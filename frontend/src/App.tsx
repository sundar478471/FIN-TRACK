import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Categories } from './components/Categories';
import { Accounts } from './components/Accounts';
import { Budgets } from './components/Budgets';
import { SavingsGoals } from './components/Goals';
import { Bills } from './components/Bills';
import { CalendarView } from './components/CalendarView';
import { Analytics } from './components/Analytics';
import { Reports } from './components/Reports';
import { Profile } from './components/Profile';
import { Loader2 } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--primary)',
        gap: '16px'
      }}>
        <Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} />
        <h3 style={{ fontWeight: 600 }}>Loading Session...</h3>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If not logged in, show Auth component
  if (!user) {
    return <Auth />;
  }

  // Render correct tab view
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'income':
        return <Transactions defaultType="INCOME" />;
      case 'expense':
        return <Transactions defaultType="EXPENSE" />;
      case 'transactions':
        return <Transactions />;
      case 'categories':
        return <Categories />;
      case 'accounts':
        return <Accounts />;
      case 'budgets':
        return <Budgets />;
      case 'goals':
        return <SavingsGoals />;
      case 'bills':
        return <Bills defaultView="list" />;
      case 'calendar':
        return <CalendarView />;
      case 'analytics':
        return <Analytics />;
      case 'reports':
        return <Reports />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {renderTabContent()}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <FinanceProvider>
        <MainAppContent />
      </FinanceProvider>
    </AuthProvider>
  );
};

export default App;
