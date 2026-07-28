import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasConfig = !!import.meta.env.VITE_FIREBASE_API_KEY;

let authInstance: any;
let isMock = false;

if (hasConfig) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    authInstance = getAuth(app);
    console.log('🔥 Real Firebase Authentication client initialized.');
  } catch (err) {
    console.error('❌ Failed to initialize Real Firebase SDK. Falling back to Mock Auth.', err);
    isMock = true;
  }
} else {
  console.log('⚠️ VITE_FIREBASE_API_KEY is not defined. Using Mock Authentication.');
  isMock = true;
}

// Mock Firebase User Type
export interface MockUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  getIdToken: () => Promise<string>;
}

// Global mock state
let currentMockUser: MockUser | null = null;
const authListeners: Array<(user: MockUser | null) => void> = [];

const triggerAuthChange = () => {
  authListeners.forEach(listener => listener(currentMockUser));
};

// Create a highly robust mock auth implementation
const mockAuth = {
  currentUser: null as MockUser | null,
  onAuthStateChanged: (callback: (user: any | null) => void) => {
    authListeners.push(callback);
    // Trigger immediately with current state
    setTimeout(() => callback(currentMockUser), 0);
    return () => {
      const idx = authListeners.indexOf(callback);
      if (idx !== -1) authListeners.splice(idx, 1);
    };
  },
  signInWithEmailAndPassword: async (email: string) => {
    // Generate a valid mock token structure: mock_<email_prefix>
    const prefix = email.split('@')[0] || 'user';
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '');
    const uid = `mock_${cleanPrefix}`;
    
    currentMockUser = {
      uid,
      email,
      emailVerified: true,
      getIdToken: async () => `mock_${uid}`
    };
    mockAuth.currentUser = currentMockUser;
    triggerAuthChange();
    return { user: currentMockUser };
  },
  createUserWithEmailAndPassword: async (email: string) => {
    const prefix = email.split('@')[0] || 'user';
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '');
    const uid = `mock_${cleanPrefix}`;

    currentMockUser = {
      uid,
      email,
      emailVerified: false, // Email verification required simulation
      getIdToken: async () => `mock_${uid}`
    };
    mockAuth.currentUser = currentMockUser;
    triggerAuthChange();
    return { user: currentMockUser };
  },
  sendPasswordResetEmail: async () => {
    // Simulated action
    return Promise.resolve();
  },
  sendEmailVerification: async () => {
    if (currentMockUser) {
      currentMockUser.emailVerified = true;
      triggerAuthChange();
    }
    return Promise.resolve();
  },
  signOut: async () => {
    currentMockUser = null;
    mockAuth.currentUser = null;
    triggerAuthChange();
    return Promise.resolve();
  }
};

export const isMockAuth = isMock;
export const auth = isMock ? mockAuth : authInstance;

export { 
  signInWithEmailAndPassword as fbSignIn,
  createUserWithEmailAndPassword as fbSignUp,
  signOut as fbSignOut,
  sendPasswordResetEmail as fbResetPassword,
  onAuthStateChanged as fbOnAuthChange
};
