import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { Camera } from 'lucide-react';

export const Profile: React.FC = () => {
  const { settings, updateSettings } = useFinance();
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Profile details state
  const [name, setName] = useState(settings?.name || '');
  const [mobileNumber, setMobileNumber] = useState(settings?.mobileNumber || '');
  const [avatar, setAvatar] = useState<string | null>(localStorage.getItem('fintrack_avatar') || null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync state when settings load
  useEffect(() => {
    if (settings) {
      setName(settings.name || '');
      setMobileNumber(settings.mobileNumber || '');
    }
  }, [settings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await updateSettings({ name, mobileNumber });
      setSuccess('Profile details saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setAvatar(base64String);
      localStorage.setItem('fintrack_avatar', base64String);
      setSuccess('Profile photo updated successfully!');
    };
    reader.readAsDataURL(file);
  };

  const getInitials = () => {
    if (name) {
      return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'FT';
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>My Profile</h1>
          <p>Manage your user credentials and identity settings.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '32px 24px', position: 'relative' }}>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
        {success && <div style={{ color: 'var(--success)', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{success}</div>}

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Avatar Profile Photo Section */}
          <div style={{ position: 'relative', marginBottom: '28px' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--bg-tertiary)', 
              border: '3px solid var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              overflow: 'hidden',
              fontSize: '2.5rem',
              fontWeight: 800,
              color: 'var(--primary)'
            }}>
              {avatar ? (
                <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{getInitials()}</span>
              )}
            </div>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)'
              }}
              title="Upload Profile Photo"
            >
              <Camera size={16} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>

          {/* Identity Form Groups */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                className="input-premium" 
                placeholder="Enter your full name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required
              />
            </div>

            <div className="form-group">
              <label>Email ID</label>
              <input 
                type="email" 
                className="input-premium" 
                value={user?.email || ''} 
                disabled 
                style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
              />
            </div>

            <div className="form-group">
              <label>Mobile Number</label>
              <input 
                type="tel" 
                className="input-premium" 
                placeholder="Enter mobile number" 
                value={mobileNumber} 
                onChange={(e) => setMobileNumber(e.target.value)} 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
              {loading ? 'Saving Profile...' : 'Save Profile Details'}
            </button>
          </div>
        </form>


      </div>
    </div>
  );
};
export default Profile;
