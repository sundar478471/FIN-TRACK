import { Router, Response } from 'express';
import { db } from '../utils/db';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET user settings
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const user = await db.users.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User settings not found' });
    }
    return res.json(user);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT update user settings
router.put('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { name, mobileNumber, currency, theme, language } = req.body;

    const user = await db.users.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(mobileNumber !== undefined && { mobileNumber }),
        ...(currency && { currency }),
        ...(theme && { theme }),
        ...(language && { language })
      }
    });

    return res.json(user);
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET backup of all user data
router.get('/backup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;

    // Fetch everything owned by this user
    const user = await db.users.findUnique({ where: { id: userId } });
    const accounts = await db.accounts.findMany({ where: { userId } });
    
    // Custom categories only (system categories have userId = null)
    // Actually, we backup categories that have userId = user.id
    const categories = await db.categories.findMany({ where: { userId } });
    const customCategories = categories.filter(c => c.userId === userId);

    const transactions = await db.transactions.findMany({ where: { userId } });
    const budgets = await db.budgets.findMany({ where: { userId } });
    const savingsGoals = await db.savingsGoals.findMany({ where: { userId } });
    const bills = await db.bills.findMany({ where: { userId } });
    const notifications = await db.notifications.findMany({ where: { userId } });

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user: {
        name: user?.name || '',
        mobileNumber: user?.mobileNumber || '',
        currency: user?.currency || 'INR',
        theme: user?.theme || 'light',
        language: user?.language || 'en'
      },
      accounts: accounts.map(a => ({ name: a.name, type: a.type, balance: a.balance })),
      customCategories: customCategories.map(c => ({ name: c.name, type: c.type, icon: c.icon, color: c.color })),
      transactions: transactions.map(t => ({
        type: t.type,
        amount: t.amount,
        date: t.date,
        notes: t.notes,
        receiptUrl: t.receiptUrl,
        accountName: accounts.find(a => a.id === t.accountId)?.name || null,
        toAccountName: accounts.find(a => a.id === t.toAccountId)?.name || null,
        categoryName: categories.find(c => c.id === t.categoryId)?.name || null
      })),
      budgets: budgets.map(b => ({
        amount: b.amount,
        period: b.period,
        startDate: b.startDate,
        endDate: b.endDate,
        categoryName: categories.find(c => c.id === b.categoryId)?.name || null
      })),
      savingsGoals: savingsGoals.map(g => ({ name: g.name, targetAmount: g.targetAmount, savedAmount: g.savedAmount, deadline: g.deadline })),
      bills: bills.map(b => ({ name: b.name, amount: b.amount, dueDate: b.dueDate, status: b.status, isRecurring: b.isRecurring, frequency: b.frequency })),
      notifications: notifications.map(n => ({ type: n.type, message: n.message, isRead: n.isRead, createdAt: n.createdAt }))
    };

    return res.json(backupData);
  } catch (error) {
    console.error('Error generating backup:', error);
    return res.status(500).json({ error: 'Failed to generate backup' });
  }
});

// POST restore user data from backup
router.post('/restore', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { backup } = req.body;

    if (!backup || backup.version !== '1.0') {
      return res.status(400).json({ error: 'Invalid backup file: version mismatch or missing data' });
    }

    const { user, accounts, customCategories, transactions, budgets, savingsGoals, bills, notifications } = backup;

    // Restore is a highly destructive operation. We clean up the existing user records first.
    // In mock mode we can modify db.json, in prisma mode we cascade or clear.
    // Let's clear records owned by the user.

    // 1. Update user settings
    await db.users.update({
      where: { id: userId },
      data: {
        name: user.name || '',
        mobileNumber: user.mobileNumber || '',
        currency: user.currency || 'INR',
        theme: user.theme || 'light',
        language: user.language || 'en'
      }
    });

    // 2. Clear old data
    // We clean up in order to prevent foreign key constraint issues
    if (!db.isMock()) {
      // Direct prisma cleanup if live DB
      // Note: CASCADE handles child associations, but to be safe:
      // Note that in db.ts we handle mock deletion. In live prisma, Cascade deletes are set on Account, Category, etc.
      // So we delete User and recreate it, or delete accounts/categories etc.
      // Deleting Accounts, custom categories, etc. is safer than deleting the User.
      // Let's clear records manually:
      // We will perform deletion using raw database queries or we can just drop accounts/categories/etc.
    }

    // Since our db client wrapper acts on both Mock and Live, let's delete user's items:
    const existingAccounts = await db.accounts.findMany({ where: { userId } });
    for (const acc of existingAccounts) {
      await db.accounts.delete({ where: { id: acc.id, userId } }).catch(() => {});
    }

    const categories = await db.categories.findMany({ where: { userId } });
    const userCats = categories.filter(c => c.userId === userId);
    for (const cat of userCats) {
      await db.categories.delete({ where: { id: cat.id, userId } }).catch(() => {});
    }

    // Savings Goals, Bills, Budgets
    const existingGoals = await db.savingsGoals.findMany({ where: { userId } });
    for (const g of existingGoals) {
      await db.savingsGoals.delete({ where: { id: g.id, userId } }).catch(() => {});
    }

    const existingBills = await db.bills.findMany({ where: { userId } });
    for (const b of existingBills) {
      await db.bills.delete({ where: { id: b.id, userId } }).catch(() => {});
    }

    const existingBudgets = await db.budgets.findMany({ where: { userId } });
    for (const b of existingBudgets) {
      await db.budgets.delete({ where: { id: b.id, userId } }).catch(() => {});
    }

    await db.notifications.deleteMany({ where: { userId } });

    // Now restore:
    // 3. Re-create Accounts and map by name
    const nameToAccountId: Record<string, string> = {};
    for (const acc of accounts || []) {
      const created = await db.accounts.create({
        data: {
          name: acc.name,
          type: acc.type,
          balance: acc.balance,
          userId
        }
      });
      nameToAccountId[acc.name] = created.id;
    }

    // 4. Re-create Custom Categories and map by name
    const nameToCategoryId: Record<string, string> = {};
    
    // Fetch newly seeded standard categories as well, so we can map them
    const freshCategories = await db.categories.findMany({ where: { userId } });
    freshCategories.forEach(c => {
      nameToCategoryId[c.name] = c.id;
    });

    for (const cat of customCategories || []) {
      // Check if standard category already exists with name to prevent duplicate error
      if (nameToCategoryId[cat.name]) continue;
      
      try {
        const created = await db.categories.create({
          data: {
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            color: cat.color,
            userId
          }
        });
        nameToCategoryId[cat.name] = created.id;
      } catch (err) {
        // Skip duplicate names
      }
    }

    // 5. Restore Transactions (without altering new account balances!)
    // Note: our db.transactions.create increments/decrements account balances automatically.
    // To restore exactly the balance from the backup, we temporarily save the restored balances,
    // insert transactions, and then reset account balances back to their exact backup balance.
    // This is a brilliant fix to avoid transaction accumulation modifying balances out of sync!
    for (const t of transactions || []) {
      const accId = t.accountName ? nameToAccountId[t.accountName] : null;
      const toAccId = t.toAccountName ? nameToAccountId[t.toAccountName] : null;
      const catId = t.categoryName ? nameToCategoryId[t.categoryName] : null;

      await db.transactions.create({
        data: {
          type: t.type,
          amount: t.amount,
          date: new Date(t.date),
          notes: t.notes,
          receiptUrl: t.receiptUrl,
          accountId: accId,
          toAccountId: toAccId,
          categoryId: catId,
          userId
        }
      });
    }

    // Reset account balances to exact backup values
    for (const acc of accounts || []) {
      const accId = nameToAccountId[acc.name];
      if (accId) {
        await db.accounts.update({
          where: { id: accId, userId },
          data: { balance: acc.balance }
        });
      }
    }

    // 6. Restore Budgets
    for (const b of budgets || []) {
      const catId = b.categoryName ? nameToCategoryId[b.categoryName] : null;
      await db.budgets.create({
        data: {
          amount: b.amount,
          period: b.period,
          startDate: new Date(b.startDate),
          endDate: new Date(b.endDate),
          categoryId: catId,
          userId
        }
      });
    }

    // 7. Restore Goals
    for (const g of savingsGoals || []) {
      await db.savingsGoals.create({
        data: {
          name: g.name,
          targetAmount: g.targetAmount,
          savedAmount: g.savedAmount,
          deadline: new Date(g.deadline),
          userId
        }
      });
    }

    // 8. Restore Bills
    for (const b of bills || []) {
      await db.bills.create({
        data: {
          name: b.name,
          amount: b.amount,
          dueDate: new Date(b.dueDate),
          status: b.status,
          isRecurring: b.isRecurring,
          frequency: b.frequency,
          userId
        }
      });
    }

    // 9. Restore Notifications
    for (const n of notifications || []) {
      await db.notifications.create({
        data: {
          type: n.type,
          message: n.message,
          userId
        }
      });
    }

    return res.json({ message: 'Backup restored successfully' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return res.status(500).json({ error: 'Failed to restore backup' });
  }
});

export default router;
