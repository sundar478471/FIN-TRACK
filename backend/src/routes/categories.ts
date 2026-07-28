import { Router, Response } from 'express';
import { db } from '../utils/db';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET all categories (system defaults + user-specific custom ones)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    let categories = await db.categories.findMany({ where: { userId } });
    
    if (categories.length === 0) {
      console.log(`🌱 Seeding default categories for user: ${userId}`);
      const defaultCategories = [
        { name: 'Salary', type: 'INCOME', icon: 'Briefcase', color: '#10b981' },
        { name: 'Business & Freelance', type: 'INCOME', icon: 'TrendingUp', color: '#10b981' },
        { name: 'Investments', type: 'INCOME', icon: 'LineChart', color: '#10b981' },
        { name: 'Gifts & Others', type: 'INCOME', icon: 'Gift', color: '#10b981' },
        { name: 'Food & Dining', type: 'EXPENSE', icon: 'Utensils', color: '#ef4444' },
        { name: 'Rent & Housing', type: 'EXPENSE', icon: 'Home', color: '#ef4444' },
        { name: 'Utilities & Bills', type: 'EXPENSE', icon: 'Zap', color: '#ef4444' },
        { name: 'Transportation', type: 'EXPENSE', icon: 'Car', color: '#ef4444' },
        { name: 'Entertainment & Leisure', type: 'EXPENSE', icon: 'Film', color: '#ef4444' },
        { name: 'Shopping', type: 'EXPENSE', icon: 'ShoppingBag', color: '#ef4444' },
        { name: 'Healthcare & Insurance', type: 'EXPENSE', icon: 'HeartPulse', color: '#ef4444' },
        { name: 'Education', type: 'EXPENSE', icon: 'GraduationCap', color: '#ef4444' }
      ];
      for (const cat of defaultCategories) {
        await db.categories.create({
          data: { ...cat, userId }
        });
      }
      categories = await db.categories.findMany({ where: { userId } });
    }
    return res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST a new custom category
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { name, type, icon, color } = req.body;

    if (!name || !type || !icon || !color) {
      return res.status(400).json({ error: 'Name, type, icon, and color are required' });
    }

    if (type !== 'INCOME' && type !== 'EXPENSE') {
      return res.status(400).json({ error: 'Type must be either INCOME or EXPENSE' });
    }

    const category = await db.categories.create({
      data: {
        name,
        type,
        icon,
        color,
        userId
      }
    });

    return res.status(201).json(category);
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.message && error.message.includes('already exists')) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }
    return res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT update a custom category
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { name, icon, color } = req.body;

    // First make sure the category exists and belongs to the user (system categories cannot be edited)
    const existing = await db.categories.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(403).json({ error: 'Access denied: System categories or missing categories cannot be modified' });
    }

    const category = await db.categories.update({
      where: { id, userId },
      data: {
        ...(name && { name }),
        ...(icon && { icon }),
        ...(color && { color })
      }
    });

    return res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE a custom category
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    // Verify it belongs to the user
    const existing = await db.categories.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(403).json({ error: 'Access denied: System categories or missing categories cannot be deleted' });
    }

    await db.categories.delete({
      where: { id, userId }
    });

    return res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
