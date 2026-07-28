import { Router, Response } from 'express';
import { db } from '../utils/db';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET all notifications
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const notifications = await db.notifications.findMany({ where: { userId } });
    return res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT mark notification as read
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { isRead } = req.body;

    const notification = await db.notifications.update({
      where: { id, userId },
      data: { isRead: !!isRead }
    });

    return res.json(notification);
  } catch (error) {
    console.error('Error updating notification:', error);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

// DELETE clear all notifications for the user
router.delete('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    await db.notifications.deleteMany({ where: { userId } });
    return res.json({ message: 'All notifications cleared successfully' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export default router;
