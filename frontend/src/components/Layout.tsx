import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { Icon } from './common/Icon';
import { Bell, Menu, X, LogOut } from 'lucide-react';

interface LayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentTab, setCurrentTab, children }) => {
  const { user, logout } = useAuth();
  const { notifications, markNotificationRead, clearNotifications, settings } = useFinance();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement | null>(null);

  const [avatar, setAvatar] = useState<string | null>(localStorage.getItem('fintrack_avatar'));

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setAvatar(localStorage.getItem('fintrack_avatar'));
    };

    window.addEventListener('avatar_updated', handleAvatarUpdate);
    window.addEventListener('storage', handleAvatarUpdate);

    return () => {
      window.removeEventListener('avatar_updated', handleAvatarUpdate);
      window.removeEventListener('storage', handleAvatarUpdate);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Update theme classes on HTML tag
  useEffect(() => {
    if (settings?.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [settings?.theme]);

  const unreadNotifs = notifications.filter(n => !n.isRead);
  const unreadCount = unreadNotifs.length;

  const handleNotifClick = async (n: any) => {
    if (!n.isRead) {
      await markNotificationRead(n.id, true);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'Wallet' },
    { id: 'income', label: 'Incomes', icon: 'ArrowUpRight' },
    { id: 'expense', label: 'Expenses', icon: 'ArrowDownLeft' },
    { id: 'transactions', label: 'Total Transactions', icon: 'History' },
    { id: 'categories', label: 'Categories', icon: 'Tag' },
    { id: 'accounts', label: 'Accounts', icon: 'CreditCard' },
    { id: 'budgets', label: 'Budgets', icon: 'ShieldAlert' },
    { id: 'goals', label: 'Savings Goals', icon: 'Award' },
    { id: 'bills', label: 'Bills', icon: 'FileText' },
    { id: 'calendar', label: 'Calendar', icon: 'Calendar' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' },
    { id: 'profile', label: 'Profile', icon: 'User' }
  ];

  return (
    <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar Panel */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="nav-logo">
          <img 
            src="/logo.jpg" 
            alt="Logo" 
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '6px', 
              objectFit: 'cover',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-color)'
            }} 
          />
          <h2>FIN TRACK</h2>
          <button 
            className="modal-close" 
            style={{ marginLeft: 'auto' }} // Managed via CSS for mobile visibility
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="nav-links">
            {navItems.map(item => (
              <li key={item.id} className={`nav-item ${currentTab === item.id ? 'active' : ''}`} onClick={() => { setCurrentTab(item.id); setIsSidebarOpen(false); }}>
                <button>
                  <Icon name={item.icon} size={20} />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-summary" style={{ paddingBottom: '0px' }}>
            <div className="user-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {avatar ? (
                <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.email?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="user-details">
              <div className="name">Active User</div>
              <div className="email">{user?.email}</div>
            </div>
          </div>
          <button 
            className="btn btn-danger btn-sm" 
            onClick={logout} 
            style={{ 
              width: '100%', 
              marginTop: '16px', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.8rem',
              padding: '8px 12px'
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {/* Mobile Top Bar */}
        <header style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }} className="mobile-header">
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>FIN TRACK</h2>
          <div style={{ position: 'relative' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }} onClick={() => setIsNotifOpen(!isNotifOpen)}>
              <Bell size={22} />
              {unreadCount > 0 && <span className="notification-badge-count">{unreadCount}</span>}
            </button>
          </div>
        </header>

        {/* Desktop Header bar widgets */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px', marginBottom: '32px' }} className="desktop-top-header">
          
          {/* Notifications Center */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ padding: '8px 12px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="notification-badge-count">{unreadCount}</span>}
            </button>

            {isNotifOpen && (
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <h4>Alerts Center</h4>
                  {notifications.length > 0 && (
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      onClick={clearNotifications}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <p style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>
                      No notifications available.
                    </p>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                        onClick={() => handleNotifClick(n)}
                      >
                        <p style={{ margin: 0 }}>{n.message}</p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                          {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div 
            ref={userDropdownRef}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', position: 'relative' }}
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
          >
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden' }}>
              {avatar ? (
                <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.email?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{user?.email}</span>

            {isUserDropdownOpen && (
              <div 
                className="user-dropdown-menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  width: '160px',
                  zIndex: 1000,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <button 
                  onClick={() => setCurrentTab('profile')}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                >
                  <Icon name="User" size={16} />
                  My Profile
                </button>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />
                <button 
                  onClick={logout}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    color: 'var(--danger)',
                    fontSize: '0.85rem'
                  }}
                >
                  <Icon name="LogOut" size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Display Child Page Screen */}
        {children}
      </main>
      
      {/* Dynamic CSS styles for toggling mobile headers */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-top-header {
            display: none !important;
          }
          .mobile-header {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};
