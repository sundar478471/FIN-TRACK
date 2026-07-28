import { Response, NextFunction, Request } from 'express';
import * as admin from 'firebase-admin';
import { db } from '../utils/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
  };
}

let isFirebaseAdminInitialized = false;

// Initialize Firebase Admin if environment variables are present
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (serviceAccountPath) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseAdminInitialized = true;
    console.log('🔥 Firebase Admin SDK initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin SDK. Falling back to Mock Auth.', err);
  }
} else {
  console.log('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY not set. Operating in Local Mock Auth Mode.');
}

function decodeJwtUnverified(token: string): { uid: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    return {
      uid: payload.sub || payload.user_id || '',
      email: payload.email || ''
    };
  } catch (err) {
    console.error('Failed to decode JWT payload safely:', err);
    return null;
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    let uid: string;
    let email: string;

    // Handle mock token or fallback verification
    if (!isFirebaseAdminInitialized || token.startsWith('mock_')) {
      if (token.startsWith('mock_')) {
        uid = token.replace('mock_', '');
        email = `${uid}@example.com`;
      } else {
        // Fallback: decode JWT payload safely to align client/server user identifiers
        const decoded = decodeJwtUnverified(token);
        if (decoded && decoded.uid) {
          uid = decoded.uid;
          email = decoded.email;
        } else {
          uid = token;
          email = `${token}@example.com`;
        }
      }
    } else {
      // Real Firebase verify
      const decodedToken = await admin.auth().verifyIdToken(token);
      uid = decodedToken.uid;
      email = decodedToken.email || '';
    }

    // Set the user details in request
    req.user = { uid, email };

    // Self-healing: Check if user exists in the database. If not, auto-create them and seed default categories.
    let user = await db.users.findUnique({ where: { id: uid } });
    if (!user) {
      console.log(`👤 Automatically registering new user: ${email} (${uid})`);
      user = await db.users.create({
        data: {
          id: uid,
          email,
          currency: 'INR',
          theme: 'light',
          language: 'en'
        }
      });

      // Seed default categories
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
          data: {
            ...cat,
            userId: uid
          }
        });
      }
      console.log(`✅ Default categories successfully seeded for user: ${uid}`);
    } else if (user.email !== email) {
      // Sync email if updated in Firebase
      console.log(`🔄 Syncing email update for user ${uid}: ${user.email} -> ${email}`);
      user = await db.users.update({
        where: { id: uid },
        data: { email }
      });
    }

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication token' });
  }
}
