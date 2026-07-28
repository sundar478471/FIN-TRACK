import { Router, Response } from 'express';
import { db } from '../utils/db';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET all goals
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const goals = await db.savingsGoals.findMany({ where: { userId } });
    return res.json(goals);
  } catch (error) {
    console.error('Error fetching savings goals:', error);
    return res.status(500).json({ error: 'Failed to fetch savings goals' });
  }
});

// POST a new goal
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { name, targetAmount, savedAmount, deadline } = req.body;

    if (!name || !targetAmount || !deadline) {
      return res.status(400).json({ error: 'Name, targetAmount, and deadline are required' });
    }

    const goal = await db.savingsGoals.create({
      data: {
        name,
        targetAmount: Number(targetAmount),
        savedAmount: Number(savedAmount) || 0.0,
        deadline: new Date(deadline),
        userId
      }
    });

    return res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating savings goal:', error);
    return res.status(500).json({ error: 'Failed to create savings goal' });
  }
});

// PUT update a goal
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { name, targetAmount, savedAmount, deadline } = req.body;

    const existing = await db.savingsGoals.findMany({ where: { userId } });
    const originalGoal = existing.find(g => g.id === id);
    if (!originalGoal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    const updated = await db.savingsGoals.update({
      where: { id, userId },
      data: {
        ...(name && { name }),
        ...(targetAmount !== undefined && { targetAmount: Number(targetAmount) }),
        ...(savedAmount !== undefined && { savedAmount: Number(savedAmount) }),
        ...(deadline && { deadline: new Date(deadline) })
      }
    });

    // If goal just reached completion status
    if (updated.savedAmount >= updated.targetAmount && originalGoal.savedAmount < originalGoal.targetAmount) {
      await db.notifications.create({
        data: {
          type: 'GOAL_REMINDER',
          message: `🎉 Goal Achieved! Congratulations! You have fully funded your savings goal: "${updated.name}" (${updated.savedAmount.toFixed(2)} / ${updated.targetAmount.toFixed(2)}).`,
          userId
        }
      });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Error updating savings goal:', error);
    return res.status(500).json({ error: 'Failed to update savings goal' });
  }
});

// DELETE a goal
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    await db.savingsGoals.delete({
      where: { id, userId }
    });

    return res.json({ message: 'Savings goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting savings goal:', error);
    return res.status(500).json({ error: 'Failed to delete savings goal' });
  }
});

export default router;
