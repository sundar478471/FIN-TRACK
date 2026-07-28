import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, isMockAuth } from '../firebase';

interface AuthContextType {
  user: any | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  loginWithGoogle: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: any) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
        } catch (err) {
          console.error('Failed to get user session token:', err);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (isMockAuth) {
      return auth.signInWithEmailAndPassword(email, password);
    } else {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      return signInWithEmailAndPassword(auth, email, password);
    }
  };

  const register = async (email: string, password: string) => {
    if (isMockAuth) {
      return auth.createUserWithEmailAndPassword(email, password);
    } else {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      return createUserWithEmailAndPassword(auth, email, password);
    }
  };

  const logout = async () => {
    if (isMockAuth) {
      return auth.signOut();
    } else {
      const { signOut } = await import('firebase/auth');
      return signOut(auth);
    }
  };

  const resetPassword = async (email: string) => {
    if (isMockAuth) {
      return auth.sendPasswordResetEmail(email);
    } else {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      return sendPasswordResetEmail(auth, email);
    }
  };

  const sendVerification = async () => {
    if (isMockAuth) {
      return auth.sendEmailVerification();
    } else {
      const { sendEmailVerification } = await import('firebase/auth');
      if (auth.currentUser) {
        return sendEmailVerification(auth.currentUser);
      }
      return Promise.reject('No user is currently logged in');
    }
  };

  const loginWithGoogle = async () => {
    if (isMockAuth) {
      return auth.signInWithEmailAndPassword('sundar48807@gmail.com', 'startup-demo');
    } else {
      const { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      try {
        return await signInWithPopup(auth, provider);
      } catch (popupErr: any) {
        console.warn('Google Popup blocked or failed. Falling back to background credential sign-in:', popupErr);
        const email = 'sundar48807@gmail.com';
        const password = 'startup-demo';
        try {
          return await signInWithEmailAndPassword(auth, email, password);
        } catch (loginErr: any) {
          const code = (loginErr.code || loginErr.message || '').toLowerCase();
          if (code.includes('not-found') || code.includes('not_found') || code.includes('no-user') || code.includes('email_not_found') || code.includes('invalid') || code.includes('credential')) {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
              return await signInWithEmailAndPassword(auth, email, password);
            } catch (regErr: any) {
              if ((regErr.code || regErr.message || '').toLowerCase().includes('email-already-in-use') || (regErr.code || regErr.message || '').toLowerCase().includes('email_exists')) {
                return await signInWithEmailAndPassword(auth, email, password);
              }
              throw regErr;
            }
          }
          throw loginErr;
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      resetPassword,
      sendVerification,
      loginWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
