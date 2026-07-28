import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ShieldAlert, User, Phone } from 'lucide-react';

export const Auth: React.FC = () => {
  const { login, register, resetPassword, user, sendVerification, logout } = useAuth();
  
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileNum, setMobileNum] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (isRegister && password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      if (isForgot) {
        await resetPassword(email);
        setMessage('Password reset email sent. Please check your inbox.');
      } else if (isRegister) {
        const fullMobile = `${countryCode} ${mobileNum}`.trim();
        
        // 1. Create User in Firebase Auth
        const userCredential = await register(email, password);
        const firebaseUser = userCredential.user;
        
        // 2. Self-Heal Database & Update Profile settings in Backend
        if (firebaseUser) {
          const idToken = await firebaseUser.getIdToken();
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          await fetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ name, mobileNumber: fullMobile })
          });
        }
        
        setMessage('Account created successfully! Please verify your email.');
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error('Auth action failed:', err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerification = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await sendVerification();
      setMessage('Verification email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email.');
    } finally {
      setLoading(false);
    }
  };

  // Block screen with Verification action if email is unverified
  if (user && !user.emailVerified) {
    return (
      <div className="modal-overlay" style={{ background: 'var(--bg-primary)' }}>
        <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--warning)' }}>
            <ShieldAlert size={48} />
          </div>
          <h2 style={{ marginBottom: '12px' }}>Verify Your Email</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
            We've sent a verification link to <strong>{user.email}</strong>. Please click the link in that email to activate your account.
          </p>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}
          {message && <div style={{ color: 'var(--success)', marginBottom: '16px', fontSize: '0.85rem' }}>{message}</div>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleSendVerification} disabled={loading}>
              {loading ? 'Sending...' : 'Resend Verification Email'}
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              I Have Verified (Reload App)
            </button>
            <button className="btn btn-danger btn-sm" onClick={logout} style={{ marginTop: '12px' }}>
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '390px',
        padding: '28px 24px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        border: '1px solid var(--border-color)',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch'
      }}>
        
        {/* Mockup Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img 
            src="/logo.jpg" 
            alt="FIN TRACK" 
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '10px', 
              objectFit: 'cover',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-color)'
            }} 
          />
        </div>

        {/* Mockup Headers */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {isForgot ? 'Reset Password' : (isRegister ? 'Sign Up for FIN TRACK' : 'Sign In to FIN TRACK')}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {isForgot 
              ? 'Enter your registered email to receive a password reset link.' 
              : (isRegister 
                ? 'Create a new personal budget ledger account to get started.' 
                : 'Welcome back! Please enter credentials to access your financial dashboards.')}
          </p>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'var(--danger-light)', 
            color: 'var(--danger)', 
            padding: '12px', 
            borderRadius: 'var(--radius-sm)', 
            marginBottom: '20px',
            fontSize: '0.8rem',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ 
            backgroundColor: 'var(--success-light)', 
            color: 'var(--success)', 
            padding: '12px', 
            borderRadius: 'var(--radius-sm)', 
            marginBottom: '20px',
            fontSize: '0.8rem',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Full Name block (Only shown on Register) */}
          {isRegister && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="name" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  id="name" 
                  className="input-premium" 
                  placeholder="Enter your name" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', paddingLeft: '44px', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          )}

          {/* Mobile Number with Country Code (Only shown on Register) */}
          {isRegister && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="mobile" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Mobile Number
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  className="input-premium"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{ width: '100px', fontSize: '0.85rem', padding: '0 8px', textAlign: 'center', cursor: 'pointer' }}
                >
                  <option value="+91">+91 (IN)</option>
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+971">+971 (AE)</option>
                  <option value="+65">+65 (SG)</option>
                  <option value="+61">+61 (AU)</option>
                </select>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Phone size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                  <input 
                    type="tel" 
                    id="mobile" 
                    className="input-premium" 
                    placeholder="10-digit number" 
                    required
                    pattern="[0-9]{10}"
                    title="Please enter a valid 10-digit mobile number"
                    value={mobileNum}
                    onChange={(e) => setMobileNum(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ width: '100%', paddingLeft: '44px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Email Address block */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="email" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Email ID
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                id="email" 
                className="input-premium" 
                placeholder="you@domain.com" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', paddingLeft: '44px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Password block with embedded Forgot password trigger */}
          {!isForgot && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="password" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Password
                </label>
                {!isRegister && (
                  <button 
                    type="button" 
                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                    onClick={() => setIsForgot(true)}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  id="password" 
                  className="input-premium" 
                  placeholder="••••••••" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: '44px', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          )}

          {/* Confirm Password block (sign up only) */}
          {isRegister && !isForgot && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="confirmPassword" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Re-enter Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  id="confirmPassword" 
                  className="input-premium" 
                  placeholder="••••••••" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: '44px', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          )}

          {/* Remember Me selection checkbox */}
          {!isForgot && !isRegister && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
              <input 
                type="checkbox" 
                id="remember" 
                style={{ width: '16px', height: '16px', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }} 
              />
              <label htmlFor="remember" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', userSelect: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Remember Me
              </label>
            </div>
          )}

          {/* Action Button */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              padding: '14px', 
              backgroundColor: '#2563eb', 
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              marginTop: '6px'
            }} 
            disabled={loading}
          >
            {loading ? 'Processing...' : (isForgot ? 'Send Password Reset Link' : (isRegister ? 'Register Account ➔' : 'Sign In with Email ➔'))}
          </button>
        </form>

        {/* Auth Mode Switch links */}
        <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {isForgot ? (
            <button 
              type="button"
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 700 }}
              onClick={() => { setIsForgot(false); setIsRegister(false); }}
            >
              Back to Sign In
            </button>
          ) : (
            isRegister ? (
              <span>
                Already have an account?{' '}
                <button 
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => setIsRegister(false)}
                >
                  Log In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button 
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => setIsRegister(true)}
                >
                  Register for Free
                </button>
              </span>
            )
          )}
        </div>

      </div>
    </div>
  );
};
export default Auth;
