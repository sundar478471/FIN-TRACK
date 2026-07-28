import { Router, Response } from 'express';
import { db } from '../utils/db';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET all accounts for the user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const accounts = await db.accounts.findMany({ where: { userId } });
    return res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// POST a new account
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { name, type, balance } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const account = await db.accounts.create({
      data: {
        name,
        type,
        balance: Number(balance) || 0.0,
        userId
      }
    });

    return res.status(201).json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    return res.status(500).json({ error: 'Failed to create account' });
  }
});

// PUT update an account
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { name, type, balance } = req.body;

    const account = await db.accounts.update({
      where: { id, userId },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(balance !== undefined && { balance: Number(balance) })
      }
    });

    return res.json(account);
  } catch (error) {
    console.error('Error updating account:', error);
    return res.status(500).json({ error: 'Failed to update account' });
  }
});

// DELETE an account
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    await db.accounts.delete({
      where: { id, userId }
    });

    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

// POST transfer funds between accounts
router.post('/transfer', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { fromAccountId, toAccountId, amount, notes, date } = req.body;

    if (!fromAccountId || !toAccountId || !amount) {
      return res.status(400).json({ error: 'Source, destination accounts and amount are required' });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({ error: 'Source and destination accounts cannot be the same' });
    }

    const parsedAmount = Number(amount);
    if (parsedAmount <= 0) {
      return res.status(400).json({ error: 'Transfer amount must be greater than zero' });
    }

    // Verify both accounts exist and belong to the user
    const srcAccount = await db.accounts.findFirst({ where: { id: fromAccountId, userId } });
    const dstAccount = await db.accounts.findFirst({ where: { id: toAccountId, userId } });

    if (!srcAccount || !dstAccount) {
      return res.status(404).json({ error: 'One or both accounts not found' });
    }

    if (srcAccount.balance < parsedAmount) {
      return res.status(400).json({ error: 'Insufficient balance in source account' });
    }

    // Create transfer transaction - our db client helper handles the balance updates inside its `transactions.create` logic!
    const transaction = await db.transactions.create({
      data: {
        type: 'TRANSFER',
        amount: parsedAmount,
        date: date ? new Date(date) : new Date(),
        notes: notes || `Transfer from ${srcAccount.name} to ${dstAccount.name}`,
        accountId: fromAccountId,
        toAccountId: toAccountId,
        userId
      }
    });

    return res.status(201).json({
      message: 'Transfer completed successfully',
      transaction
    });
  } catch (error) {
    console.error('Error processing transfer:', error);
    return res.status(500).json({ error: 'Failed to complete transfer' });
  }
});

export default router;
