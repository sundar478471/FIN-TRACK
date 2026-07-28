import { Router, Response } from 'express';
import { db } from '../utils/db';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET all bills
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const bills = await db.bills.findMany({ where: { userId } });
    return res.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    return res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// POST a new bill
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { name, amount, dueDate, isRecurring, frequency } = req.body;

    if (!name || !amount || !dueDate) {
      return res.status(400).json({ error: 'Name, amount, and dueDate are required' });
    }

    const bill = await db.bills.create({
      data: {
        name,
        amount: Number(amount),
        dueDate: new Date(dueDate),
        isRecurring: !!isRecurring,
        frequency: isRecurring ? (frequency || 'MONTHLY') : null,
        status: 'UNPAID',
        userId
      }
    });

    return res.status(201).json(bill);
  } catch (error) {
    console.error('Error creating bill:', error);
    return res.status(500).json({ error: 'Failed to create bill' });
  }
});

// PUT update/pay a bill
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { name, amount, dueDate, isRecurring, frequency, status, accountId, categoryId } = req.body;

    const bills = await db.bills.findMany({ where: { userId } });
    const originalBill = bills.find(b => b.id === id);
    if (!originalBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    let updatedStatus = status || originalBill.status;
    let nextDueDate = dueDate ? new Date(dueDate) : new Date(originalBill.dueDate);

    // If bill status changes to PAID and it was UNPAID
    if (status === 'PAID' && originalBill.status === 'UNPAID') {
      // 1. If accountId is provided, record a matching Expense transaction
      if (accountId) {
        // Find or use default 'Bills' category
        let finalCategoryId = categoryId;
        if (!finalCategoryId) {
          const categories = await db.categories.findMany({ where: { userId } });
          const billCat = categories.find(c => c.name.toLowerCase() === 'bills' && c.type === 'EXPENSE');
          finalCategoryId = billCat ? billCat.id : undefined;
        }

        await db.transactions.create({
          data: {
            type: 'EXPENSE',
            amount: amount !== undefined ? Number(amount) : originalBill.amount,
            date: new Date(), // Paid today
            notes: `Paid Bill: ${name || originalBill.name}`,
            accountId,
            categoryId: finalCategoryId || null,
            userId
          }
        });
      }

      // 2. Handle recurrence
      if (isRecurring || (isRecurring === undefined && originalBill.isRecurring)) {
        const freq = frequency || originalBill.frequency || 'MONTHLY';
        const currentDueDate = new Date(originalBill.dueDate);

        // Advance the due date
        if (freq === 'WEEKLY') {
          currentDueDate.setDate(currentDueDate.getDate() + 7);
        } else if (freq === 'YEARLY') {
          currentDueDate.setFullYear(currentDueDate.getFullYear() + 1);
        } else {
          // Default: MONTHLY
          currentDueDate.setMonth(currentDueDate.getMonth() + 1);
        }

        nextDueDate = currentDueDate;
        updatedStatus = 'UNPAID'; // Reset to unpaid for the next cycle
      }
    }

    const updatedBill = await db.bills.update({
      where: { id, userId },
      data: {
        ...(name && { name }),
        ...(amount !== undefined && { amount: Number(amount) }),
        dueDate: nextDueDate,
        isRecurring: isRecurring !== undefined ? !!isRecurring : originalBill.isRecurring,
        frequency: isRecurring ? (frequency || originalBill.frequency || 'MONTHLY') : (isRecurring === false ? null : originalBill.frequency),
        status: updatedStatus
      }
    });

    return res.json(updatedBill);
  } catch (error) {
    console.error('Error updating bill:', error);
    return res.status(500).json({ error: 'Failed to update bill' });
  }
});

// DELETE a bill
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    await db.bills.delete({
      where: { id, userId }
    });

    return res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return res.status(500).json({ error: 'Failed to delete bill' });
  }
});

export default router;
