import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

// Define the default system categories
export const DEFAULT_CATEGORIES = [
  // Income Categories
  { name: 'Salary', type: 'INCOME', icon: 'Briefcase', color: '#10B981' },
  { name: 'Business', type: 'INCOME', icon: 'Building', color: '#0D9488' },
  { name: 'Freelance', type: 'INCOME', icon: 'Laptop', color: '#059669' },
  { name: 'Investments', type: 'INCOME', icon: 'TrendingUp', color: '#4F46E5' },
  { name: 'Interest', type: 'INCOME', icon: 'Percent', color: '#2563EB' },
  { name: 'Gift', type: 'INCOME', icon: 'Gift', color: '#7C3AED' },
  { name: 'Rental Income', type: 'INCOME', icon: 'Home', color: '#3B82F6' },
  { name: 'Dividend', type: 'INCOME', icon: 'TrendingUp', color: '#10B981' },
  { name: 'Refund / Tax Return', type: 'INCOME', icon: 'Receipt', color: '#06B6D4' },
  { name: 'Grants / Subsidies', type: 'INCOME', icon: 'Award', color: '#EAB308' },
  { name: 'Other', type: 'INCOME', icon: 'MoreHorizontal', color: '#4B5563' },
  
  // Expense Categories
  { name: 'Food', type: 'EXPENSE', icon: 'Utensils', color: '#EF4444' },
  { name: 'Shopping', type: 'EXPENSE', icon: 'ShoppingBag', color: '#EC4899' },
  { name: 'Fuel', type: 'EXPENSE', icon: 'Fuel', color: '#F97316' },
  { name: 'Transport', type: 'EXPENSE', icon: 'Car', color: '#D97706' },
  { name: 'Rent', type: 'EXPENSE', icon: 'Home', color: '#475569' },
  { name: 'Bills', type: 'EXPENSE', icon: 'Receipt', color: '#0EA5E9' },
  { name: 'Healthcare', type: 'EXPENSE', icon: 'HeartPulse', color: '#F43F5E' },
  { name: 'Education', type: 'EXPENSE', icon: 'GraduationCap', color: '#8B5CF6' },
  { name: 'Entertainment', type: 'EXPENSE', icon: 'Gamepad2', color: '#D946EF' },
  { name: 'Travel', type: 'EXPENSE', icon: 'Plane', color: '#06B6D4' },
  { name: 'Grocery', type: 'EXPENSE', icon: 'ShoppingCart', color: '#84CC16' },
  { name: 'Subscription', type: 'EXPENSE', icon: 'Youtube', color: '#6366F1' },
  { name: 'Insurance', type: 'EXPENSE', icon: 'ShieldCheck', color: '#64748B' },
  { name: 'Taxes', type: 'EXPENSE', icon: 'Scale', color: '#EF4444' },
  { name: 'EMI / Loan', type: 'EXPENSE', icon: 'Landmark', color: '#EF4444' },
  { name: 'Charity / Donation', type: 'EXPENSE', icon: 'Heart', color: '#EC4899' },
  { name: 'Business Expense', type: 'EXPENSE', icon: 'Briefcase', color: '#0B2240' },
  { name: 'Others', type: 'EXPENSE', icon: 'HelpCircle', color: '#1E3A8A' }
];

const hasDbUrl = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('postgresql://username:password@');
let prisma: PrismaClient | null = null;

if (hasDbUrl) {
  try {
    const dbUrl = process.env.DATABASE_URL!;
    if (dbUrl.startsWith('libsql://') || dbUrl.startsWith('https://')) {
      const libsql = createClient({
        url: dbUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN || '',
      });
      const adapter = new PrismaLibSQL(libsql);
      prisma = new PrismaClient({ adapter });
      console.log('⚡ Turso/LibSQL Prisma Client initialized.');
    } else {
      prisma = new PrismaClient();
      console.log('⚡ SQLite Prisma Client initialized.');
    }
  } catch (err) {
    console.error('❌ Failed to initialize Prisma Client, falling back to Local JSON DB.', err);
    prisma = null;
  }
} else {
  console.log('⚠️ DATABASE_URL not set or default placeholder detected. Operating in Local JSON Mock Mode.');
}

const JSON_DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'db.json')
  : path.join(__dirname, '../../db.json');

// Interface for local database storage
interface LocalDbSchema {
  users: any[];
  accounts: any[];
  categories: any[];
  transactions: any[];
  budgets: any[];
  savingsGoals: any[];
  bills: any[];
  notifications: any[];
}

function initJsonDb() {
  if (!fs.existsSync(JSON_DB_PATH)) {
    let initialData: LocalDbSchema = {
      users: [],
      accounts: [],
      categories: [],
      transactions: [],
      budgets: [],
      savingsGoals: [],
      bills: [],
      notifications: []
    };

    if (process.env.VERCEL) {
      const bundleDbPath = path.join(__dirname, '../../db.json');
      if (fs.existsSync(bundleDbPath)) {
        try {
          initialData = JSON.parse(fs.readFileSync(bundleDbPath, 'utf-8'));
        } catch (err) {
          console.error('Error reading bundle DB:', err);
        }
      }
    }

    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readJsonDb(): LocalDbSchema {
  initJsonDb();
  try {
    const raw = fs.readFileSync(JSON_DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading JSON DB, resetting.', err);
    return {
      users: [],
      accounts: [],
      categories: [],
      transactions: [],
      budgets: [],
      savingsGoals: [],
      bills: [],
      notifications: []
    };
  }
}

function writeJsonDb(data: LocalDbSchema) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export const db = {
  isMock: () => prisma === null,

  users: {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
      if (prisma) return prisma.user.findUnique({ where: where as any });
      const data = readJsonDb();
      return data.users.find(u => 
        (where.id && u.id === where.id) || (where.email && u.email === where.email)
      ) || null;
    },
    create: async ({ data }: { data: { id: string; email: string; name?: string; mobileNumber?: string; currency?: string; theme?: string; language?: string } }) => {
      if (prisma) {
        const user = await prisma.user.create({ data: data as any });
        // Automatically seed categories for the user in real DB
        for (const cat of DEFAULT_CATEGORIES) {
          await prisma.category.create({
            data: {
              name: cat.name,
              type: cat.type,
              icon: cat.icon,
              color: cat.color,
              userId: user.id
            }
          }).catch(() => {}); // Ignore duplicate warnings
        }
        return user;
      }
      const dbData = readJsonDb();
      const newUser = {
        id: data.id,
        email: data.email,
        name: data.name || '',
        mobileNumber: data.mobileNumber || '',
        currency: data.currency || 'INR',
        theme: data.theme || 'light',
        language: data.language || 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dbData.users.push(newUser);
      
      // Auto seed default categories for mock user
      DEFAULT_CATEGORIES.forEach(cat => {
        dbData.categories.push({
          id: Math.random().toString(36).substring(2, 11),
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          userId: newUser.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      
      writeJsonDb(dbData);
      return newUser;
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      if (prisma) return prisma.user.update({ where, data });
      const dbData = readJsonDb();
      const userIdx = dbData.users.findIndex(u => u.id === where.id);
      if (userIdx === -1) throw new Error('User not found');
      dbData.users[userIdx] = { ...dbData.users[userIdx], ...data, updatedAt: new Date().toISOString() };
      writeJsonDb(dbData);
      return dbData.users[userIdx];
    }
  },

  accounts: {
    findMany: async ({ where }: { where: { userId: string } }) => {
      if (prisma) return prisma.account.findMany({ where });
      const data = readJsonDb();
      return data.accounts.filter(a => a.userId === where.userId);
    },
    findFirst: async ({ where }: { where: { id: string; userId: string } }) => {
      if (prisma) return prisma.account.findFirst({ where });
      const data = readJsonDb();
      return data.accounts.find(a => a.id === where.id && a.userId === where.userId) || null;
    },
    create: async ({ data }: { data: { name: string; type: string; balance: number; userId: string } }) => {
      if (prisma) return prisma.account.create({ data });
      const dbData = readJsonDb();
      const newAcc = {
        id: Math.random().toString(36).substring(2, 11),
        name: data.name,
        type: data.type,
        balance: data.balance,
        userId: data.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dbData.accounts.push(newAcc);
      writeJsonDb(dbData);
      return newAcc;
    },
    update: async ({ where, data }: { where: { id: string; userId?: string }; data: any }) => {
      if (prisma) return prisma.account.update({ where, data });
      const dbData = readJsonDb();
      const idx = dbData.accounts.findIndex(a => a.id === where.id && (!where.userId || a.userId === where.userId));
      if (idx === -1) throw new Error('Account not found');
      dbData.accounts[idx] = { ...dbData.accounts[idx], ...data, updatedAt: new Date().toISOString() };
      writeJsonDb(dbData);
      return dbData.accounts[idx];
    },
    delete: async ({ where }: { where: { id: string; userId?: string } }) => {
      if (prisma) return prisma.account.delete({ where });
      const dbData = readJsonDb();
      const idx = dbData.accounts.findIndex(a => a.id === where.id && (!where.userId || a.userId === where.userId));
      if (idx === -1) throw new Error('Account not found');
      const removed = dbData.accounts.splice(idx, 1)[0];
      // Also delete related transactions
      dbData.transactions = dbData.transactions.filter(t => t.accountId !== where.id && t.toAccountId !== where.id);
      writeJsonDb(dbData);
      return removed;
    }
  },

  categories: {
    findMany: async ({ where }: { where: { userId: string } }) => {
      if (prisma) return prisma.category.findMany({ where });
      const data = readJsonDb();
      return data.categories.filter(c => c.userId === where.userId || c.userId === null);
    },
    findFirst: async ({ where }: { where: { id: string; userId?: string } }) => {
      if (prisma) return prisma.category.findFirst({ where });
      const data = readJsonDb();
      return data.categories.find(c => c.id === where.id && (!where.userId || c.userId === where.userId || c.userId === null)) || null;
    },
    create: async ({ data }: { data: { name: string; type: string; icon: string; color: string; userId: string } }) => {
      if (prisma) return prisma.category.create({ data });
      const dbData = readJsonDb();
      // Enforce unique name per user
      const exists = dbData.categories.some(c => c.name.toLowerCase() === data.name.toLowerCase() && c.userId === data.userId);
      if (exists) throw new Error('Category already exists');
      const newCat = {
        id: Math.random().toString(36).substring(2, 11),
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        userId: data.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dbData.categories.push(newCat);
      writeJsonDb(dbData);
      return newCat;
    },
    update: async ({ where, data }: { where: { id: string; userId?: string }; data: any }) => {
      if (prisma) return prisma.category.update({ where, data });
      const dbData = readJsonDb();
      const idx = dbData.categories.findIndex(c => c.id === where.id && (!where.userId || c.userId === where.userId));
      if (idx === -1) throw new Error('Category not found or not customizable');
      dbData.categories[idx] = { ...dbData.categories[idx], ...data, updatedAt: new Date().toISOString() };
      writeJsonDb(dbData);
      return dbData.categories[idx];
    },
    delete: async ({ where }: { where: { id: string; userId?: string } }) => {
      if (prisma) return prisma.category.delete({ where });
      const dbData = readJsonDb();
      const idx = dbData.categories.findIndex(c => c.id === where.id && (!where.userId || c.userId === where.userId));
      if (idx === -1) throw new Error('Category not found or system category');
      const removed = dbData.categories.splice(idx, 1)[0];
      // Set transaction category IDs to null
      dbData.transactions.forEach(t => {
        if (t.categoryId === where.id) t.categoryId = null;
      });
      writeJsonDb(dbData);
      return removed;
    }
  },

  transactions: {
    findMany: async ({ where }: { where: { userId: string } }) => {
      if (prisma) return prisma.transaction.findMany({ where, include: { account: true, toAccount: true, category: true } });
      const data = readJsonDb();
      const userTx = data.transactions.filter(t => t.userId === where.userId);
      // Enrich with objects to match Prisma includes
      return userTx.map(t => ({
        ...t,
        account: data.accounts.find(a => a.id === t.accountId) || null,
        toAccount: data.accounts.find(a => a.id === t.toAccountId) || null,
        category: data.categories.find(c => c.id === t.categoryId) || null
      }));
    },
    create: async ({ data }: { data: { type: string; amount: number; date: Date | string; notes?: string | null; receiptUrl?: string | null; accountId?: string | null; toAccountId?: string | null; categoryId?: string | null; userId: string } }) => {
      if (prisma) {
        const tx = await prisma.transaction.create({ data });
        // Auto-update account balances
        if (tx.type === 'INCOME' && tx.accountId) {
          await prisma.account.update({ where: { id: tx.accountId }, data: { balance: { increment: tx.amount } } });
        } else if (tx.type === 'EXPENSE' && tx.accountId) {
          await prisma.account.update({ where: { id: tx.accountId }, data: { balance: { decrement: tx.amount } } });
        } else if (tx.type === 'TRANSFER' && tx.accountId && tx.toAccountId) {
          await prisma.account.update({ where: { id: tx.accountId }, data: { balance: { decrement: tx.amount } } });
          await prisma.account.update({ where: { id: tx.toAccountId }, data: { balance: { increment: tx.amount } } });
        }
        return tx;
      }
      const dbData = readJsonDb();
      const newTx = {
        id: Math.random().toString(36).substring(2, 11),
        type: data.type,
        amount: data.amount,
        date: new Date(data.date).toISOString(),
        notes: data.notes || null,
        receiptUrl: data.receiptUrl || null,
        accountId: data.accountId || null,
        toAccountId: data.toAccountId || null,
        categoryId: data.categoryId || null,
        userId: data.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Adjust mock balances
      if (newTx.type === 'INCOME' && newTx.accountId) {
        const acc = dbData.accounts.find(a => a.id === newTx.accountId);
        if (acc) acc.balance += newTx.amount;
      } else if (newTx.type === 'EXPENSE' && newTx.accountId) {
        const acc = dbData.accounts.find(a => a.id === newTx.accountId);
        if (acc) acc.balance -= newTx.amount;
      } else if (newTx.type === 'TRANSFER' && newTx.accountId && newTx.toAccountId) {
        const src = dbData.accounts.find(a => a.id === newTx.accountId);
        const dst = dbData.accounts.find(a => a.id === newTx.toAccountId);
        if (src) src.balance -= newTx.amount;
        if (dst) dst.balance += newTx.amount;
      }

      dbData.transactions.push(newTx);
      writeJsonDb(dbData);
      return newTx;
    },
    update: async ({ where, data }: { where: { id: string; userId?: string }; data: any }) => {
      // For updates, we first reverse original balance impact, modify tx, then apply new balance impact.
      if (prisma) {
        const origTx = await prisma.transaction.findUnique({ where: { id: where.id } });
        if (origTx) {
          // Reverse original impact
          if (origTx.type === 'INCOME' && origTx.accountId) {
            await prisma.account.update({ where: { id: origTx.accountId }, data: { balance: { decrement: origTx.amount } } });
          } else if (origTx.type === 'EXPENSE' && origTx.accountId) {
            await prisma.account.update({ where: { id: origTx.accountId }, data: { balance: { increment: origTx.amount } } });
          } else if (origTx.type === 'TRANSFER' && origTx.accountId && origTx.toAccountId) {
            await prisma.account.update({ where: { id: origTx.accountId }, data: { balance: { increment: origTx.amount } } });
            await prisma.account.update({ where: { id: origTx.toAccountId }, data: { balance: { decrement: origTx.amount } } });
          }
        }
        
        // Update transaction
        const updated = await prisma.transaction.update({ where, data });

        // Apply new impact
        if (updated.type === 'INCOME' && updated.accountId) {
          await prisma.account.update({ where: { id: updated.accountId }, data: { balance: { increment: updated.amount } } });
        } else if (updated.type === 'EXPENSE' && updated.accountId) {
          await prisma.account.update({ where: { id: updated.accountId }, data: { balance: { decrement: updated.amount } } });
        } else if (updated.type === 'TRANSFER' && updated.accountId && updated.toAccountId) {
          await prisma.account.update({ where: { id: updated.accountId }, data: { balance: { decrement: updated.amount } } });
          await prisma.account.update({ where: { id: updated.toAccountId }, data: { balance: { increment: updated.amount } } });
        }
        return updated;
      }
      
      const dbData = readJsonDb();
      const idx = dbData.transactions.findIndex(t => t.id === where.id && (!where.userId || t.userId === where.userId));
      if (idx === -1) throw new Error('Transaction not found');
      
      const origTx = dbData.transactions[idx];
      // Reverse balance
      if (origTx.type === 'INCOME' && origTx.accountId) {
        const a = dbData.accounts.find(x => x.id === origTx.accountId);
        if (a) a.balance -= origTx.amount;
      } else if (origTx.type === 'EXPENSE' && origTx.accountId) {
        const a = dbData.accounts.find(x => x.id === origTx.accountId);
        if (a) a.balance += origTx.amount;
      } else if (origTx.type === 'TRANSFER' && origTx.accountId && origTx.toAccountId) {
        const src = dbData.accounts.find(x => x.id === origTx.accountId);
        const dst = dbData.accounts.find(x => x.id === origTx.toAccountId);
        if (src) src.balance += origTx.amount;
        if (dst) dst.balance -= origTx.amount;
      }

      // Apply changes
      const merged = { ...origTx, ...data, date: data.date ? new Date(data.date).toISOString() : origTx.date, updatedAt: new Date().toISOString() };
      dbData.transactions[idx] = merged;

      // Apply new balance
      if (merged.type === 'INCOME' && merged.accountId) {
        const a = dbData.accounts.find(x => x.id === merged.accountId);
        if (a) a.balance += merged.amount;
      } else if (merged.type === 'EXPENSE' && merged.accountId) {
        const a = dbData.accounts.find(x => x.id === merged.accountId);
        if (a) a.balance -= merged.amount;
      } else if (merged.type === 'TRANSFER' && merged.accountId && merged.toAccountId) {
        const src = dbData.accounts.find(x => x.id === merged.accountId);
        const dst = dbData.accounts.find(x => x.id === merged.toAccountId);
        if (src) src.balance -= merged.amount;
        if (dst) dst.balance += merged.amount;
      }

      writeJsonDb(dbData);
      return merged;
    },
    delete: async ({ where }: { where: { id: string; userId?: string } }) => {
      if (prisma) {
        const origTx = await prisma.transaction.findUnique({ where: { id: where.id } });
        if (origTx) {
          // Reverse balance
          if (origTx.type === 'INCOME' && origTx.accountId) {
            await prisma.account.update({ where: { id: origTx.accountId }, data: { balance: { decrement: origTx.amount } } });
          } else if (origTx.type === 'EXPENSE' && origTx.accountId) {
            await prisma.account.update({ where: { id: origTx.accountId }, data: { balance: { increment: origTx.amount } } });
          } else if (origTx.type === 'TRANSFER' && origTx.accountId && origTx.toAccountId) {
            await prisma.account.update({ where: { id: origTx.accountId }, data: { balance: { increment: origTx.amount } } });
            await prisma.account.update({ where: { id: origTx.toAccountId }, data: { balance: { decrement: origTx.amount } } });
          }
        }
        return prisma.transaction.delete({ where });
      }

      const dbData = readJsonDb();
      const idx = dbData.transactions.findIndex(t => t.id === where.id && (!where.userId || t.userId === where.userId));
      if (idx === -1) throw new Error('Transaction not found');
      
      const origTx = dbData.transactions.splice(idx, 1)[0];
      // Reverse balance
      if (origTx.type === 'INCOME' && origTx.accountId) {
        const a = dbData.accounts.find(x => x.id === origTx.accountId);
        if (a) a.balance -= origTx.amount;
      } else if (origTx.type === 'EXPENSE' && origTx.accountId) {
        const a = dbData.accounts.find(x => x.id === origTx.accountId);
        if (a) a.balance += origTx.amount;
      } else if (origTx.type === 'TRANSFER' && origTx.accountId && origTx.toAccountId) {
        const src = dbData.accounts.find(x => x.id === origTx.accountId);
        const dst = dbData.accounts.find(x => x.id === origTx.toAccountId);
        if (src) src.balance += origTx.amount;
        if (dst) dst.balance -= origTx.amount;
      }

      writeJsonDb(dbData);
      return origTx;
    }
  },

  budgets: {
    findMany: async ({ where }: { where: { userId: string } }) => {
      if (prisma) return prisma.budget.findMany({ where, include: { category: true } });
      const data = readJsonDb();
      return data.budgets.filter(b => b.userId === where.userId).map(b => ({
        ...b,
        category: data.categories.find(c => c.id === b.categoryId) || null
      }));
    },
    create: async ({ data }: { data: { amount: number; period: string; categoryId?: string | null; startDate: Date | string; endDate: Date | string; userId: string } }) => {
      if (prisma) return prisma.budget.create({ data });
      const dbData = readJsonDb();
      const newBudget = {
        id: Math.random().toString(36).substring(2, 11),
        amount: data.amount,
        period: data.period,
        categoryId: data.categoryId || null,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        userId: data.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dbData.budgets.push(newBudget);
      writeJsonDb(dbData);
      return newBudget;
    },
    update: async ({ where, data }: { where: { id: string; userId?: string }; data: any }) => {
      if (prisma) return prisma.budget.update({ where, data });
      const dbData = readJsonDb();
      const idx = dbData.budgets.findIndex(b => b.id === where.id && (!where.userId || b.userId === where.userId));
      if (idx === -1) throw new Error('Budget not found');
      dbData.budgets[idx] = { 
        ...dbData.budgets[idx], 
        ...data, 
        startDate: data.startDate ? new Date(data.startDate).toISOString() : dbData.budgets[idx].startDate,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : dbData.budgets[idx].endDate,
        updatedAt: new Date().toISOString() 
      };
      writeJsonDb(dbData);
      return dbData.budgets[idx];
    },
    delete: async ({ where }: { where: { id: string; userId?: string } }) => {
      if (prisma) return prisma.budget.delete({ where });
      const dbData = readJsonDb();
      const idx = dbData.budgets.findIndex(b => b.id === where.id && (!where.userId || b.userId === where.userId));
      if (idx === -1) throw new Error('Budget not found');
      const removed = dbData.budgets.splice(idx, 1)[0];
      writeJsonDb(dbData);
      return removed;
    }
  },

  savingsGoals: {
    findMany: async ({ where }: { where: { userId: string } }) => {
      if (prisma) return prisma.savingsGoal.findMany({ where });
      const data = readJsonDb();
      return data.savingsGoals.filter(g => g.userId === where.userId);
    },
    create: async ({ data }: { data: { name: string; targetAmount: number; savedAmount?: number; deadline: Date | string; userId: string } }) => {
      if (prisma) return prisma.savingsGoal.create({ data });
      const dbData = readJsonDb();
      const newGoal = {
        id: Math.random().toString(36).substring(2, 11),
        name: data.name,
        targetAmount: data.targetAmount,
        savedAmount: data.savedAmount || 0.0,
        deadline: new Date(data.deadline).toISOString(),
        userId: data.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dbData.savingsGoals.push(newGoal);
      writeJsonDb(dbData);
      return newGoal;
    },
    update: async ({ where, data }: { where: { id: string; userId?: string }; data: any }) => {
      if (prisma) return prisma.savingsGoal.update({ where, data });
      const dbData = readJsonDb();
      const idx = dbData.savingsGoals.findIndex(g => g.id === where.id && (!where.userId || g.userId === where.userId));
      if (idx === -1) throw new Error('Goal not found');
      dbData.savingsGoals[idx] = { 
        ...dbData.savingsGoals[idx], 
        ...data, 
        deadline: data.deadline ? new Date(data.deadline).toISOString() : dbData.savingsGoals[idx].deadline,
        updatedAt: new Date().toISOString() 
      };
      writeJsonDb(dbData);
      return dbData.savingsGoals[idx];
    },
    delete: async ({ where }: { where: { id: string; userId?: string } }) => {
      if (prisma) return prisma.savingsGoal.delete({ where });
      const dbData = readJsonDb();
      const idx = dbData.savingsGoals.findIndex(g => g.id === where.id && (!where.userId || g.userId === where.userId));
      if (idx === -1) throw new Error('Goal not found');
      const removed = dbData.savingsGoals.splice(idx, 1)[0];
      writeJsonDb(dbData);
      return removed;
    }
  },

  bills: {
    findMany: async ({ where }: { where: { userId: string } }) => {
      if (prisma) return prisma.bill.findMany({ where });
      const data = readJsonDb();
      return data.bills.filter(b => b.userId === where.userId);
    },
    create: async ({ data }: { data: { name: string; amount: number; dueDate: Date | string; status?: string; isRecurring?: boolean; frequency?: string | null; userId: string } }) => {
      if (prisma) return prisma.bill.create({ data });
      const dbData = readJsonDb();
      const newBill = {
        id: Math.random().toString(36).substring(2, 11),
        name: data.name,
        amount: data.amount,
        dueDate: new Date(data.dueDate).toISOString(),
        status: data.status || 'UNPAID',
        isRecurring: data.isRecurring || false,
        frequency: data.frequency || null,
        userId: data.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dbData.bills.push(newBill);
      writeJsonDb(dbData);
      return newBill;
    },
    update: async ({ where, data }: { where: { id: string; userId?: string }; data: any }) => {
      if (prisma) return prisma.bill.update({ where, data });
      const dbData = readJsonDb();
      const idx = dbData.bills.findIndex(b => b.id === where.id && (!where.userId || b.userId === where.userId));
      if (idx === -1) throw new Error('Bill not found');
      dbData.bills[idx] = { 
        ...dbData.bills[idx], 
        ...data, 
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : dbData.bills[idx].dueDate,
        updatedAt: new Date().toISOString() 
      };
      writeJsonDb(dbData);
      return dbData.bills[idx];
    },
    delete: async ({ where }: { where: { id: string; userId?: string } }) => {
      if (prisma) return prisma.bill.delete({ where });
      const dbData = readJsonDb();
      const idx = dbData.bills.findIndex(b => b.id === where.id && (!where.userId || b.userId === where.userId));
      if (idx === -1) throw new Error('Bill not found');
      const removed = dbData.bills.splice(idx, 1)[0];
      writeJsonDb(dbData);
      return removed;
    }
  },

  notifications: {
    findMany: async ({ where }: { where: { userId: string } }) => {
      if (prisma) return prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' } });
      const data = readJsonDb();
      return data.notifications
        .filter(n => n.userId === where.userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    create: async ({ data }: { data: { type: string; message: string; userId: string } }) => {
      if (prisma) return prisma.notification.create({ data });
      const dbData = readJsonDb();
      const newNotif = {
        id: Math.random().toString(36).substring(2, 11),
        type: data.type,
        message: data.message,
        isRead: false,
        userId: data.userId,
        createdAt: new Date().toISOString()
      };
      dbData.notifications.push(newNotif);
      writeJsonDb(dbData);
      return newNotif;
    },
    update: async ({ where, data }: { where: { id: string; userId?: string }; data: any }) => {
      if (prisma) return prisma.notification.update({ where, data });
      const dbData = readJsonDb();
      const idx = dbData.notifications.findIndex(n => n.id === where.id && (!where.userId || n.userId === where.userId));
      if (idx === -1) throw new Error('Notification not found');
      dbData.notifications[idx] = { ...dbData.notifications[idx], ...data };
      writeJsonDb(dbData);
      return dbData.notifications[idx];
    },
    deleteMany: async ({ where }: { where: { userId: string; isRead?: boolean } }) => {
      if (prisma) return prisma.notification.deleteMany({ where });
      const dbData = readJsonDb();
      const count = dbData.notifications.length;
      dbData.notifications = dbData.notifications.filter(n => 
        n.userId !== where.userId || (where.isRead !== undefined && n.isRead !== where.isRead)
      );
      writeJsonDb(dbData);
      return { count: count - dbData.notifications.length };
    }
  }
};
