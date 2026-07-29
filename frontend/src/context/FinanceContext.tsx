import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface FinanceContextType {
  accounts: any[];
  categories: any[];
  transactions: any[];
  budgets: any[];
  goals: any[];
  bills: any[];
  notifications: any[];
  settings: any | null;
  loading: boolean;
  
  // Refetches
  refreshAll: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchBudgets: () => Promise<void>;
  fetchGoals: () => Promise<void>;
  fetchBills: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchSettings: () => Promise<void>;

  // Mutators
  addAccount: (name: string, type: string, balance: number) => Promise<void>;
  updateAccount: (id: string, data: any) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  transferFunds: (fromAccountId: string, toAccountId: string, amount: number, notes?: string, date?: string) => Promise<void>;

  addCategory: (name: string, type: string, icon: string, color: string) => Promise<void>;
  updateCategory: (id: string, data: any) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addTransaction: (txData: { type: string; amount: number; date: string; notes?: string; receiptUrl?: string; accountId?: string; toAccountId?: string; categoryId?: string }) => Promise<void>;
  updateTransaction: (id: string, txData: any) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addBudget: (amount: number, period: string, categoryId: string | null, startDate: string, endDate: string) => Promise<void>;
  updateBudget: (id: string, data: any) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  addGoal: (name: string, targetAmount: number, savedAmount: number, deadline: string) => Promise<void>;
  updateGoal: (id: string, data: any) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  addBill: (name: string, amount: number, dueDate: string, isRecurring: boolean, frequency?: string) => Promise<void>;
  updateBill: (id: string, data: any) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;

  markNotificationRead: (id: string, isRead: boolean) => Promise<void>;
  clearNotifications: () => Promise<void>;

  updateSettings: (data: { currency?: string; theme?: string; language?: string; name?: string; mobileNumber?: string }) => Promise<void>;
  exportBackup: () => Promise<any>;
  importBackup: (backupData: any) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [settings, setSettings] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(false);

  // Helper for authorized API headers
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // FETCHERS
  const fetchAccounts = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/accounts`, { headers: getHeaders() });
    if (res.ok) setAccounts(await res.json());
  };

  const fetchCategories = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/categories`, { headers: getHeaders() });
    if (res.ok) setCategories(await res.json());
  };

  const fetchTransactions = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/transactions`, { headers: getHeaders() });
    if (res.ok) setTransactions(await res.json());
  };

  const fetchBudgets = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/budgets`, { headers: getHeaders() });
    if (res.ok) setBudgets(await res.json());
  };

  const fetchGoals = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/goals`, { headers: getHeaders() });
    if (res.ok) setGoals(await res.json());
  };

  const fetchBills = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/bills`, { headers: getHeaders() });
    if (res.ok) setBills(await res.json());
  };

  const fetchNotifications = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/notifications`, { headers: getHeaders() });
    if (res.ok) setNotifications(await res.json());
  };

  const fetchSettings = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/settings`, { headers: getHeaders() });
    if (res.ok) setSettings(await res.json());
  };

  const refreshAll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchSettings(),
        fetchAccounts(),
        fetchCategories(),
        fetchTransactions(),
        fetchBudgets(),
        fetchGoals(),
        fetchBills(),
        fetchNotifications()
      ]);
    } catch (err) {
      console.error('Error fetching dashboard finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const silentRefreshAll = async () => {
    if (!token) return;
    try {
      const [resSettings, resAccounts, resCategories, resTransactions, resBudgets, resGoals, resBills, resNotifications] = await Promise.all([
        fetch(`${API_BASE_URL}/settings`, { headers: getHeaders() }),
        fetch(`${API_BASE_URL}/accounts`, { headers: getHeaders() }),
        fetch(`${API_BASE_URL}/categories`, { headers: getHeaders() }),
        fetch(`${API_BASE_URL}/transactions`, { headers: getHeaders() }),
        fetch(`${API_BASE_URL}/budgets`, { headers: getHeaders() }),
        fetch(`${API_BASE_URL}/goals`, { headers: getHeaders() }),
        fetch(`${API_BASE_URL}/bills`, { headers: getHeaders() }),
        fetch(`${API_BASE_URL}/notifications`, { headers: getHeaders() })
      ]);

      if (resSettings.ok) setSettings(await resSettings.json());
      if (resAccounts.ok) setAccounts(await resAccounts.json());
      if (resCategories.ok) setCategories(await resCategories.json());
      if (resTransactions.ok) setTransactions(await resTransactions.json());
      if (resBudgets.ok) setBudgets(await resBudgets.json());
      if (resGoals.ok) setGoals(await resGoals.json());
      if (resBills.ok) setBills(await resBills.json());
      if (resNotifications.ok) setNotifications(await resNotifications.json());
    } catch (err) {
      console.error('Silent refresh failed:', err);
    }
  };

  // Trigger refetches when authorization token becomes valid
  useEffect(() => {
    if (token) {
      refreshAll();
    } else {
      // Reset state if logged out
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setBills([]);
      setNotifications([]);
      setSettings(null);
    }
  }, [token]);

  // MUTATORS
  
  // Accounts
  const addAccount = async (name: string, type: string, balance: number) => {
    const res = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, type, balance })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to add account');
    await fetchAccounts();
  };

  const updateAccount = async (id: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update account');
    await fetchAccounts();
    await fetchTransactions(); // Account change might affect transactions list
  };

  const deleteAccount = async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete account');
    await fetchAccounts();
    await fetchTransactions(); // Cascaded deletions
  };

  const transferFunds = async (fromAccountId: string, toAccountId: string, amount: number, notes?: string, date?: string) => {
    const backupTransactions = [...transactions];
    const backupAccounts = [...accounts];

    const tempId = 'temp_' + Math.random().toString(36).substring(2, 9);
    const sourceAcc = accounts.find(a => a.id === fromAccountId);
    const destAcc = accounts.find(a => a.id === toAccountId);

    const optimisticTx = {
      id: tempId,
      type: 'TRANSFER',
      amount,
      date: date || new Date().toISOString(),
      notes: notes || 'Funds Transfer',
      accountId: fromAccountId,
      toAccountId,
      categoryId: null,
      account: sourceAcc || null,
      toAccount: destAcc || null,
      category: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTransactions(prev => [optimisticTx, ...prev]);

    setAccounts(prev => prev.map(acc => {
      if (acc.id === fromAccountId) return { ...acc, balance: acc.balance - amount };
      if (acc.id === toAccountId) return { ...acc, balance: acc.balance + amount };
      return acc;
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/accounts/transfer`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ fromAccountId, toAccountId, amount, notes, date })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to transfer funds');
      silentRefreshAll();
    } catch (err) {
      setTransactions(backupTransactions);
      setAccounts(backupAccounts);
      throw err;
    }
  };

  // Categories
  const addCategory = async (name: string, type: string, icon: string, color: string) => {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, type, icon, color })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to add category');
    await fetchCategories();
  };

  const updateCategory = async (id: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update category');
    await fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete category');
    await fetchCategories();
    await fetchTransactions(); // Category references set to null
  };

  // Transactions
  const addTransaction = async (txData: any) => {
    const backupTransactions = [...transactions];
    const backupAccounts = [...accounts];

    // Build optimistic transaction
    const tempId = 'temp_' + Math.random().toString(36).substring(2, 9);
    const targetAccount = accounts.find(a => a.id === txData.accountId);
    const targetCategory = categories.find(c => c.id === txData.categoryId);

    const optimisticTx = {
      id: tempId,
      type: txData.type,
      amount: txData.amount,
      date: txData.date || new Date().toISOString(),
      notes: txData.notes || '',
      receiptUrl: txData.receiptUrl || null,
      accountId: txData.accountId || null,
      toAccountId: txData.toAccountId || null,
      categoryId: txData.categoryId || null,
      account: targetAccount || null,
      toAccount: txData.toAccountId ? accounts.find(a => a.id === txData.toAccountId) : null,
      category: targetCategory || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTransactions(prev => [optimisticTx, ...prev]);

    setAccounts(prev => prev.map(acc => {
      if (txData.type === 'INCOME' && acc.id === txData.accountId) {
        return { ...acc, balance: acc.balance + txData.amount };
      }
      if (txData.type === 'EXPENSE' && acc.id === txData.accountId) {
        return { ...acc, balance: acc.balance - txData.amount };
      }
      if (txData.type === 'TRANSFER') {
        if (acc.id === txData.accountId) return { ...acc, balance: acc.balance - txData.amount };
        if (acc.id === txData.toAccountId) return { ...acc, balance: acc.balance + txData.amount };
      }
      return acc;
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(txData)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add transaction');
      silentRefreshAll();
    } catch (err) {
      setTransactions(backupTransactions);
      setAccounts(backupAccounts);
      throw err;
    }
  };

  const updateTransaction = async (id: string, txData: any) => {
    const backupTransactions = [...transactions];
    const backupAccounts = [...accounts];

    const origTx = transactions.find(t => t.id === id);
    if (!origTx) return;

    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          ...txData,
          account: txData.accountId ? accounts.find(a => a.id === txData.accountId) : t.account,
          toAccount: txData.toAccountId ? accounts.find(a => a.id === txData.toAccountId) : t.toAccount,
          category: txData.categoryId ? categories.find(c => c.id === txData.categoryId) : t.category,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));

    setAccounts(prev => prev.map(acc => {
      let balance = acc.balance;

      if (origTx.type === 'INCOME' && acc.id === origTx.accountId) {
        balance -= origTx.amount;
      } else if (origTx.type === 'EXPENSE' && acc.id === origTx.accountId) {
        balance += origTx.amount;
      } else if (origTx.type === 'TRANSFER') {
        if (acc.id === origTx.accountId) balance += origTx.amount;
        if (acc.id === origTx.toAccountId) balance -= origTx.amount;
      }

      const newType = txData.type || origTx.type;
      const newAmount = txData.amount !== undefined ? txData.amount : origTx.amount;
      const newAccountId = txData.accountId !== undefined ? txData.accountId : origTx.accountId;
      const newToAccountId = txData.toAccountId !== undefined ? txData.toAccountId : origTx.toAccountId;

      if (newType === 'INCOME' && acc.id === newAccountId) {
        balance += newAmount;
      } else if (newType === 'EXPENSE' && acc.id === newAccountId) {
        balance -= newAmount;
      } else if (newType === 'TRANSFER') {
        if (acc.id === newAccountId) balance -= newAmount;
        if (acc.id === newToAccountId) balance += newAmount;
      }

      return { ...acc, balance };
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(txData)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update transaction');
      silentRefreshAll();
    } catch (err) {
      setTransactions(backupTransactions);
      setAccounts(backupAccounts);
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    const backupTransactions = [...transactions];
    const backupAccounts = [...accounts];

    const origTx = transactions.find(t => t.id === id);
    if (!origTx) return;

    setTransactions(prev => prev.filter(t => t.id !== id));

    setAccounts(prev => prev.map(acc => {
      let balance = acc.balance;
      if (origTx.type === 'INCOME' && acc.id === origTx.accountId) {
        balance -= origTx.amount;
      } else if (origTx.type === 'EXPENSE' && acc.id === origTx.accountId) {
        balance += origTx.amount;
      } else if (origTx.type === 'TRANSFER') {
        if (acc.id === origTx.accountId) balance += origTx.amount;
        if (acc.id === origTx.toAccountId) balance -= origTx.amount;
      }
      return { ...acc, balance };
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete transaction');
      silentRefreshAll();
    } catch (err) {
      setTransactions(backupTransactions);
      setAccounts(backupAccounts);
      throw err;
    }
  };

  // Budgets
  const addBudget = async (amount: number, period: string, categoryId: string | null, startDate: string, endDate: string) => {
    const res = await fetch(`${API_BASE_URL}/budgets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ amount, period, categoryId, startDate, endDate })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to set budget');
    await fetchBudgets();
  };

  const updateBudget = async (id: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}/budgets/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update budget');
    await fetchBudgets();
  };

  const deleteBudget = async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/budgets/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete budget');
    await fetchBudgets();
  };

  // Goals
  const addGoal = async (name: string, targetAmount: number, savedAmount: number, deadline: string) => {
    const res = await fetch(`${API_BASE_URL}/goals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, targetAmount, savedAmount, deadline })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to add goal');
    await fetchGoals();
  };

  const updateGoal = async (id: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update goal');
    await refreshAll(); // Updates goals and possibly notifications
  };

  const deleteGoal = async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete goal');
    await fetchGoals();
  };

  // Bills
  const addBill = async (name: string, amount: number, dueDate: string, isRecurring: boolean, frequency?: string) => {
    const res = await fetch(`${API_BASE_URL}/bills`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, amount, dueDate, isRecurring, frequency })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to add bill');
    await fetchBills();
  };

  const updateBill = async (id: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}/bills/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update bill');
    await refreshAll(); // Mark-as-paid creates a transaction and refetches notifications
  };

  const deleteBill = async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/bills/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete bill');
    await fetchBills();
  };

  // Notifications
  const markNotificationRead = async (id: string, isRead: boolean) => {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ isRead })
    });
    if (res.ok) await fetchNotifications();
  };

  const clearNotifications = async () => {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) await fetchNotifications();
  };

  // User preference settings
  const updateSettings = async (data: { currency?: string; theme?: string; language?: string; name?: string; mobileNumber?: string }) => {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    await fetchSettings();
  };

  const exportBackup = async () => {
    const res = await fetch(`${API_BASE_URL}/settings/backup`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to download backup');
    return res.json();
  };

  const importBackup = async (backupData: any) => {
    const res = await fetch(`${API_BASE_URL}/settings/restore`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ backup: backupData })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to restore backup');
    await refreshAll();
  };

  return (
    <FinanceContext.Provider value={{
      accounts,
      categories,
      transactions,
      budgets,
      goals,
      bills,
      notifications,
      settings,
      loading,
      refreshAll,
      fetchAccounts,
      fetchCategories,
      fetchTransactions,
      fetchBudgets,
      fetchGoals,
      fetchBills,
      fetchNotifications,
      fetchSettings,
      addAccount,
      updateAccount,
      deleteAccount,
      transferFunds,
      addCategory,
      updateCategory,
      deleteCategory,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addBudget,
      updateBudget,
      deleteBudget,
      addGoal,
      updateGoal,
      deleteGoal,
      addBill,
      updateBill,
      deleteBill,
      markNotificationRead,
      clearNotifications,
      updateSettings,
      exportBackup,
      importBackup
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
