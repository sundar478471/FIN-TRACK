import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import middlewares
import { requireAuth } from './middleware/auth';

// Import routes
import accountsRouter from './routes/accounts';
import categoriesRouter from './routes/categories';
import transactionsRouter from './routes/transactions';
import budgetsRouter from './routes/budgets';
import goalsRouter from './routes/goals';
import billsRouter from './routes/bills';
import notificationsRouter from './routes/notifications';
import settingsRouter from './routes/settings';
import reportsRouter from './routes/reports';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // In production, replace with actual frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Public health check route
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    databaseMode: process.env.DATABASE_URL
      ? (process.env.DATABASE_URL.startsWith('libsql://') || process.env.DATABASE_URL.startsWith('https://') ? 'Turso' : 'SQLite')
      : 'Local JSON File'
  });
});

// Apply requireAuth middleware globally for all secure API endpoints
app.use('/api/accounts', requireAuth, accountsRouter);
app.use('/api/categories', requireAuth, categoriesRouter);
app.use('/api/transactions', requireAuth, transactionsRouter);
app.use('/api/budgets', requireAuth, budgetsRouter);
app.use('/api/goals', requireAuth, goalsRouter);
app.use('/api/bills', requireAuth, billsRouter);
app.use('/api/notifications', requireAuth, notificationsRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/reports', requireAuth, reportsRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start listening
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 FIN TRACK API Server is running on port ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  });
}

export default app;
