import { Router, Response } from 'express';
import { db } from '../utils/db';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper to check budget limits and trigger warnings
async function checkBudgetLimits(userId: string, categoryId: string | null, dateStr: string, txAmount: number) {
  try {
    const txDate = new Date(dateStr);
    
    // Find all budgets for this user that cover this transaction date
    const budgets = await db.budgets.findMany({ where: { userId } });
    const activeBudgets = budgets.filter(b => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      const matchesPeriod = txDate >= start && txDate <= end;
      
      // Match if overall budget (categoryId is null) or specific category budget
      const matchesCategory = b.categoryId === null || b.categoryId === categoryId;
      
      return matchesPeriod && matchesCategory;
    });

    if (activeBudgets.length === 0) return;

    // Fetch all transactions for this user
    const transactions = await db.transactions.findMany({ where: { userId } });
    
    for (const budget of activeBudgets) {
      const start = new Date(budget.startDate);
      const end = new Date(budget.endDate);
      
      // Sum existing expenses in this budget period
      const relevantExpenses = transactions.filter(t => {
        if (t.type !== 'EXPENSE') return false;
        const d = new Date(t.date);
        const inDateRange = d >= start && d <= end;
        const inCategory = budget.categoryId === null || t.categoryId === budget.categoryId;
        return inDateRange && inCategory;
      });

      const totalExpenseBefore = relevantExpenses.reduce((sum, t) => sum + t.amount, 0);
      const totalExpenseAfter = totalExpenseBefore + txAmount;

      const limit = budget.amount;
      const warningThreshold = limit * 0.8;

      let catName = 'Overall';
      if (budget.categoryId) {
        const cat = await db.categories.findFirst({ where: { id: budget.categoryId } });
        if (cat) catName = cat.name;
      }

      // Check if limit is breached (100%)
      if (totalExpenseAfter >= limit && totalExpenseBefore < limit) {
        await db.notifications.create({
          data: {
            type: 'BUDGET_WARNING',
            message: `🔴 Budget Exceeded: Your total spending of ${totalExpenseAfter.toFixed(2)} on "${catName}" has exceeded your budget of ${limit.toFixed(2)} for the period.`,
            userId
          }
        });
      }
      // Check if warning threshold is breached (80%)
      else if (totalExpenseAfter >= warningThreshold && totalExpenseBefore < warningThreshold) {
        await db.notifications.create({
          data: {
            type: 'BUDGET_WARNING',
            message: `⚠️ Budget Warning: You have spent 80% or more (${totalExpenseAfter.toFixed(2)}) of your "${catName}" budget (${limit.toFixed(2)}) for the period.`,
            userId
          }
        });
      }
    }
  } catch (err) {
    console.error('Error checking budget limits:', err);
  }
}

// GET transactions with search, filter, and sort
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { search, type, categoryId, accountId, startDate, endDate, sortBy, sortOrder } = req.query;

    let txs = await db.transactions.findMany({ where: { userId } });

    // Filter by type
    if (type) {
      txs = txs.filter(t => t.type === type);
    }

    // Filter by category
    if (categoryId) {
      txs = txs.filter(t => t.categoryId === categoryId);
    }

    // Filter by account (as source or destination)
    if (accountId) {
      txs = txs.filter(t => t.accountId === accountId || t.toAccountId === accountId);
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate as string);
      txs = txs.filter(t => new Date(t.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      txs = txs.filter(t => new Date(t.date) <= end);
    }

    // Search in notes or category name
    if (search) {
      const query = (search as string).toLowerCase();
      txs = txs.filter(t => {
        const notesMatch = t.notes ? t.notes.toLowerCase().includes(query) : false;
        const catMatch = t.category ? t.category.name.toLowerCase().includes(query) : false;
        return notesMatch || catMatch;
      });
    }

    // Sort transactions
    const order = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'amount') {
      txs.sort((a, b) => (a.amount - b.amount) * order);
    } else {
      // Default sort by date desc
      txs.sort((a, b) => (new Date(a.date).getTime() - new Date(b.date).getTime()) * order);
    }

    return res.json(txs);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST a new transaction (Income, Expense, Transfer)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { type, amount, date, notes, receiptUrl, accountId, toAccountId, categoryId } = req.body;

    if (!type || !amount || !date) {
      return res.status(400).json({ error: 'Type, amount, and date are required' });
    }

    if (type !== 'INCOME' && type !== 'EXPENSE' && type !== 'TRANSFER') {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const parsedAmount = Number(amount);
    if (parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    // Account validation
    if (type === 'TRANSFER') {
      if (!accountId || !toAccountId) {
        return res.status(400).json({ error: 'Source and destination accounts are required for transfers' });
      }
      if (accountId === toAccountId) {
        return res.status(400).json({ error: 'Source and destination accounts cannot be the same' });
      }
    } else {
      if (!accountId) {
        return res.status(400).json({ error: 'Account is required' });
      }
      if (!categoryId) {
        return res.status(400).json({ error: 'Category is required for income/expense' });
      }
    }

    // Verify account exists
    const acc = await db.accounts.findFirst({ where: { id: accountId, userId } });
    if (!acc) return res.status(404).json({ error: 'Source/primary account not found' });

    if (type === 'TRANSFER') {
      const destAcc = await db.accounts.findFirst({ where: { id: toAccountId!, userId } });
      if (!destAcc) return res.status(404).json({ error: 'Destination account not found' });
      if (acc.balance < parsedAmount) {
        return res.status(400).json({ error: 'Insufficient funds in source account' });
      }
    } else if (type === 'EXPENSE' && acc.balance < parsedAmount) {
      // Allow overdraft but check if balance allows (warning only or let it pass, usually trackers allow overdraft)
    }

    const tx = await db.transactions.create({
      data: {
        type,
        amount: parsedAmount,
        date: new Date(date),
        notes: notes || null,
        receiptUrl: receiptUrl || null,
        accountId,
        toAccountId: type === 'TRANSFER' ? toAccountId : null,
        categoryId: type !== 'TRANSFER' ? categoryId : null,
        userId
      }
    });

    // Check budget warnings if this is an expense
    if (type === 'EXPENSE') {
      await checkBudgetLimits(userId, categoryId, date, parsedAmount);
    }

    return res.status(201).json(tx);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT update a transaction
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { amount, date, notes, receiptUrl, accountId, toAccountId, categoryId } = req.body;

    const tx = await db.transactions.update({
      where: { id, userId },
      data: {
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(date && { date: new Date(date) }),
        notes,
        receiptUrl,
        accountId,
        toAccountId,
        categoryId
      }
    });

    // Check budget limit if it's an expense and amount changed
    if (tx.type === 'EXPENSE' && amount !== undefined) {
      await checkBudgetLimits(userId, tx.categoryId, tx.date.toString(), 0); // Re-run checking
    }

    return res.json(tx);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE transaction
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    await db.transactions.delete({
      where: { id, userId }
    });

    return res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
