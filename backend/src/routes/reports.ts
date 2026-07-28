import { Router, Response } from 'express';
import { db } from '../utils/db';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET reports dataset based on date range
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate query parameters are required' });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Fetch all records for the user
    const transactions = await db.transactions.findMany({ where: { userId } });
    const categories = await db.categories.findMany({ where: { userId } });
    const accounts = await db.accounts.findMany({ where: { userId } });

    // Filter transactions in date range
    const periodTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    // 1. Calculate General Summary
    let totalIncome = 0;
    let totalExpense = 0;
    periodTxs.forEach(t => {
      if (t.type === 'INCOME') totalIncome += t.amount;
      if (t.type === 'EXPENSE') totalExpense += t.amount;
    });
    const netCashFlow = totalIncome - totalExpense;

    // 2. Calculate Category Breakdown
    const categoryBreakdownMap: Record<string, { id: string; name: string; type: string; icon: string; color: string; amount: number }> = {};
    
    periodTxs.forEach(t => {
      if (t.type === 'TRANSFER' || !t.categoryId) return;
      const cat = categories.find(c => c.id === t.categoryId);
      if (!cat) return;

      if (!categoryBreakdownMap[t.categoryId]) {
        categoryBreakdownMap[t.categoryId] = {
          id: cat.id,
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          amount: 0
        };
      }
      categoryBreakdownMap[t.categoryId].amount += t.amount;
    });

    const categoryBreakdown = Object.values(categoryBreakdownMap).sort((a, b) => b.amount - a.amount);

    // 3. Calculate Account Summary for the period
    const accountSummary = accounts.map(acc => {
      // Find transactions affecting this account during the period
      const accTxs = periodTxs.filter(t => t.accountId === acc.id || t.toAccountId === acc.id);
      
      let incomeSum = 0;
      let expenseSum = 0;

      accTxs.forEach(t => {
        if (t.type === 'INCOME' && t.accountId === acc.id) {
          incomeSum += t.amount;
        } else if (t.type === 'EXPENSE' && t.accountId === acc.id) {
          expenseSum += t.amount;
        } else if (t.type === 'TRANSFER') {
          if (t.accountId === acc.id) {
            expenseSum += t.amount; // Outflow
          } else if (t.toAccountId === acc.id) {
            incomeSum += t.amount; // Inflow
          }
        }
      });

      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        startingBalance: acc.balance - (incomeSum - expenseSum), // Derived previous balance before period
        incomeSum,
        expenseSum,
        endingBalance: acc.balance
      };
    });

    // 4. Enrich Transactions list for display in the report
    const enrichedTxs = periodTxs.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      date: t.date,
      notes: t.notes,
      receiptUrl: t.receiptUrl,
      accountName: accounts.find(a => a.id === t.accountId)?.name || null,
      toAccountName: accounts.find(a => a.id === t.toAccountId)?.name || null,
      categoryName: categories.find(c => c.id === t.categoryId)?.name || null,
      categoryColor: categories.find(c => c.id === t.categoryId)?.color || null
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({
      range: { start: startDate, end: endDate },
      summary: {
        totalIncome,
        totalExpense,
        netCashFlow
      },
      categoryBreakdown,
      accountSummary,
      transactions: enrichedTxs
    });
  } catch (error) {
    console.error('Error generating report data:', error);
    return res.status(500).json({ error: 'Failed to generate report data' });
  }
});

export default router;
