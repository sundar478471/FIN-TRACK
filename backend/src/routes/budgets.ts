import { Router, Response } from 'express';
import { db } from '../utils/db';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET all budgets and calculate progress (amount used, remaining)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const budgets = await db.budgets.findMany({ where: { userId } });
    const transactions = await db.transactions.findMany({ where: { userId } });

    // Calculate details for each budget
    const budgetsWithProgress = budgets.map(budget => {
      const start = new Date(budget.startDate);
      const end = new Date(budget.endDate);

      // Filter transactions matching this budget
      const relevantExpenses = transactions.filter(t => {
        if (t.type !== 'EXPENSE') return false;
        const d = new Date(t.date);
        const inDateRange = d >= start && d <= end;
        const inCategory = budget.categoryId === null || t.categoryId === budget.categoryId;
        return inDateRange && inCategory;
      });

      const used = relevantExpenses.reduce((sum, t) => sum + t.amount, 0);
      const remaining = budget.amount - used;
      const percentUsed = budget.amount > 0 ? (used / budget.amount) * 100 : 0;

      return {
        ...budget,
        used,
        remaining,
        percentUsed
      };
    });

    return res.json(budgetsWithProgress);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// POST a new budget
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { amount, period, categoryId, startDate, endDate } = req.body;

    if (!amount || !period || !startDate || !endDate) {
      return res.status(400).json({ error: 'Amount, period, startDate, and endDate are required' });
    }

    if (period !== 'WEEKLY' && period !== 'MONTHLY') {
      return res.status(400).json({ error: 'Period must be either WEEKLY or MONTHLY' });
    }

    const budget = await db.budgets.create({
      data: {
        amount: Number(amount),
        period,
        categoryId: categoryId || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        userId
      }
    });

    return res.status(201).json(budget);
  } catch (error) {
    console.error('Error creating budget:', error);
    return res.status(500).json({ error: 'Failed to create budget' });
  }
});

// PUT update a budget
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { amount, period, categoryId, startDate, endDate } = req.body;

    const budget = await db.budgets.update({
      where: { id, userId },
      data: {
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(period && { period }),
        categoryId: categoryId === undefined ? undefined : (categoryId || null),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) })
      }
    });

    return res.json(budget);
  } catch (error) {
    console.error('Error updating budget:', error);
    return res.status(500).json({ error: 'Failed to update budget' });
  }
});

// DELETE a budget
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    await db.budgets.delete({
      where: { id, userId }
    });

    return res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    return res.status(500).json({ error: 'Failed to delete budget' });
  }
});

export default router;
