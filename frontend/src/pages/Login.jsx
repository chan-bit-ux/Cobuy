import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ShieldAlert, CheckCircle, ChevronDown, Store, Users, Clock, Copy, Check } from 'lucide-react';
import axios from 'axios';
import Logo from '../components/Logo';

const API_BASE = 'http://localhost:5000/api';

// ── Pending Activation Overlay ────────────────────────────────────────────────
export const PendingActivation = ({ onBackToLogin }) => (
  <div style={{
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
    backgroundImage: 'radial-gradient(ellipse at 50% -20%, rgba(245, 245, 245, 0.015) 0%, transparent 60%)'
  }}>
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="card"
      style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2.5rem',
        margin: '1.5rem',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.7), inset 1px 1px 0px 0px rgba(245,245,245,0.05)'
      }}
    >
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem'
      }}>
        <Clock size={28} style={{ color: '#f59e0b' }} />
      </div>

      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '1.4rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: '0.75rem'
      }}>
        Awaiting Invitation
      </h2>

      <p style={{
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
        lineHeight: 1.6,
        marginBottom: '1.5rem'
      }}>
        Your account has been created and is <strong style={{ color: '#f59e0b' }}>pending activation</strong>.
        Ask your Shop Administrator to invite you — you'll receive a <strong style={{ color: 'var(--text-main)' }}>🔔 bell notification</strong> when they do.
      </p>

      <div style={{
        background: 'rgba(59,130,246,0.06)',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: '8px',
        padding: '0.875rem 1rem',
        marginBottom: '1rem',
        fontSize: '0.83rem',
        color: '#3b82f6',
        lineHeight: 1.5,
        textAlign: 'left'
      }}>
        <strong>Two ways to accept:</strong>
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span>🔔 Log in and click the bell icon at the top right</span>
          <span>📧 Open the invite link from your email</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.06)',
        border: '1px solid rgba(245, 158, 11, 0.15)',
        borderRadius: '8px',
        padding: '0.875rem 1rem',
        marginBottom: '2rem',
        fontSize: '0.83rem',
        color: '#f59e0b',
        lineHeight: 1.5
      }}>
        💡 The invite link expires after <strong>48 hours</strong>. Ask your admin to re-send if it expires.
      </div>

      <button
        onClick={onBackToLogin}
        className="btn btn-primary"
        style={{ width: '100%', height: '44px' }}
      >
        Sign In to Check Notifications
      </button>
    </motion.div>
  </div>
);

// ── Join Page (invite token acceptance) ───────────────────────────────────────
export const JoinPage = ({ token, onLogin, onGoToLogin }) => {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error | needs_login
  const [message, setMessage] = useState('');
  const [storeInfo, setStoreInfo] = useState(null);

  const handleAccept = async () => {
    setStatus('loading');
    try {
      // We still use the legacy /accept alias here because pre-login
      // it returns requires_login state (with store name info).
      // The new /consume strictly requires a logged in user.
      const res = await axios.post(`${API_BASE}/invitations/accept`, { token: token });
      if (res.data.requires_login) {
        setStoreInfo(res.data);
        setStatus('needs_login');
      } else {
        onLogin(res.data.token, res.data.user);
        setStatus('success');
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to accept invitation.');
      setStatus('error');
    }
  };

  React.useEffect(() => {
    if (token) handleAccept();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', display: 'flex',
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: '#050505'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card"
        style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', margin: '1.5rem', textAlign: 'center' }}
      >
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size="md" showSubtitle={false} />
        </div>

        {status === 'loading' && (
          <div>
            <div className="spin" style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '3px solid var(--border-color)',
              borderTopColor: 'var(--primary-color)',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Validating your invitation…</p>
          </div>
        )}

        {status === 'needs_login' && storeInfo && (
          <div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Store size={24} style={{ color: 'var(--primary-color)' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              You're invited to join
            </h3>
            <p style={{ color: 'var(--primary-color)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
              {storeInfo.store_name}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Please sign in with <strong style={{ color: 'var(--text-main)' }}>{storeInfo.invited_email}</strong> to complete activation.
            </p>
            <button onClick={onGoToLogin} className="btn btn-primary" style={{ width: '100%', height: '44px' }}>
              Sign In to Accept
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <ShieldAlert size={24} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '0.5rem', color: '#ef4444' }}>Invitation Error</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>{message}</p>
            <button onClick={onGoToLogin} className="btn btn-primary" style={{ width: '100%', height: '44px' }}>
              Back to Sign In
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ── Main Login Component ──────────────────────────────────────────────────────
const Login = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('admin'); // 'admin' | 'member'
  const [storeName, setStoreName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (isRegister && !name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    if (isRegister && accountType === 'admin' && !storeName.trim()) {
      setError('Please enter your store name.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      if (isRegister) {
        const payload = { email, password, name, account_type: accountType };
        if (accountType === 'admin') payload.store_name = storeName;
        const response = await axios.post(`${API_BASE}/register`, payload);

        setSuccess('Account created successfully! Logging you in…');
        setTimeout(() => {
          onLogin(response.data.token, response.data.user);
        }, 1200);
      } else {
        const response = await axios.post(`${API_BASE}/login`, { email, password });
        onLogin(response.data.token, response.data.user);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#050505',
      backgroundImage: 'radial-gradient(ellipse at 50% -20%, rgba(245, 245, 245, 0.015) 0%, transparent 60%)'
    }}>
      {/* Autofill and Scrollbar CSS Overrides Tag */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #141414 inset !important;
          -webkit-text-fill-color: var(--text-main) !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        .login-scroll-container::-webkit-scrollbar { width: 5px; }
        .login-scroll-container::-webkit-scrollbar-track { background: transparent; }
        .login-scroll-container::-webkit-scrollbar-thumb { background: rgba(245,245,245,0.08); border-radius: 10px; }
        .login-scroll-container::-webkit-scrollbar-thumb:hover { background: rgba(245,245,245,0.15); }
        .account-type-card { cursor: pointer; border-radius: 10px; padding: 0.875rem 1rem; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02); transition: all 0.2s ease; display: flex; align-items: flex-start; gap: 0.75rem; }
        .account-type-card:hover { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.04); }
        .account-type-card.selected { border-color: rgba(59,130,246,0.5); background: rgba(59,130,246,0.08); }
        .login-card .input, .login-card .select { background: rgba(255,255,255,0.06) !important; border-color: rgba(255,255,255,0.1); }
        .login-card .input:focus, .login-card .select:focus { background: rgba(255,255,255,0.09) !important; border-color: rgba(59,130,246,0.7); }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="card login-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem',
          zIndex: 10,
          margin: '1.5rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), inset 1px 1px 0px 0px rgba(245, 245, 245, 0.05)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.25rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size="lg" showSubtitle={true} />
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          background: 'rgba(245, 245, 245, 0.02)',
          border: '1px solid rgba(245, 245, 245, 0.05)',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '2rem',
          position: 'relative',
          cursor: 'pointer'
        }}>
          <div
            onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
            style={{
              flex: 1, padding: '0.625rem 0', textAlign: 'center',
              fontSize: '0.9rem', fontWeight: '600', zIndex: 2,
              color: !isRegister ? 'var(--text-main)' : 'var(--text-dim)',
              transition: 'color 0.25s ease'
            }}
          >
            Sign In
          </div>
          <div
            onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
            style={{
              flex: 1, padding: '0.625rem 0', textAlign: 'center',
              fontSize: '0.9rem', fontWeight: '600', zIndex: 2,
              color: isRegister ? 'var(--text-main)' : 'var(--text-dim)',
              transition: 'color 0.25s ease'
            }}
          >
            Register
          </div>
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{
              position: 'absolute', top: '4px',
              left: isRegister ? '50%' : '4px',
              right: isRegister ? '4px' : '50%',
              bottom: '4px',
              backgroundColor: 'rgba(245, 245, 245, 0.08)',
              border: '1px solid rgba(245, 245, 245, 0.05)',
              borderRadius: '6px', zIndex: 1
            }}
          />
        </div>

        {/* Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                padding: '0.75rem 1rem', borderRadius: '8px',
                marginBottom: '1.25rem', color: '#ef4444',
                fontSize: '0.85rem', overflow: 'hidden'
              }}
            >
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                padding: '0.75rem 1rem', borderRadius: '8px',
                marginBottom: '1.25rem', color: '#10b981',
                fontSize: '0.85rem', overflow: 'hidden'
              }}
            >
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            className="login-scroll-container"
            style={{
              maxHeight: isRegister ? '380px' : '200px',
              overflowY: 'auto',
              paddingRight: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              transition: 'max-height 0.3s ease'
            }}
          >
            <AnimatePresence mode="popLayout">
              {isRegister && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="form-group"
                  style={{ marginBottom: 0 }}
                >
                  <label className="label">Full Name</label>
                  <input
                    type="text"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="input"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', color: 'var(--text-dim)',
                    cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Account Type Picker (Register only) */}
            <AnimatePresence mode="popLayout">
              {isRegister && (
                <motion.div
                  key="account-type-picker"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  style={{ marginBottom: 0 }}
                >
                  <label className="label" style={{ marginBottom: '0.625rem', display: 'block' }}>I am a…</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div
                      className={`account-type-card ${accountType === 'admin' ? 'selected' : ''}`}
                      onClick={() => setAccountType('admin')}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
                        background: accountType === 'admin' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid ' + (accountType === 'admin' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'),
                        transition: 'all 0.2s ease'
                      }}>
                        <Store size={16} style={{ color: accountType === 'admin' ? 'var(--primary-color)' : 'var(--text-dim)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.15rem' }}>Shop Administrator</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>Owns a store, can invite team members</div>
                      </div>
                    </div>
                    <div
                      className={`account-type-card ${accountType === 'member' ? 'selected' : ''}`}
                      onClick={() => setAccountType('member')}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
                        background: accountType === 'member' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid ' + (accountType === 'member' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'),
                        transition: 'all 0.2s ease'
                      }}>
                        <Users size={16} style={{ color: accountType === 'member' ? '#10b981' : 'var(--text-dim)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.15rem' }}>Team Member</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>Joins via an invitation link from an admin</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Store Name (admin only) */}
            <AnimatePresence mode="popLayout">
              {isRegister && accountType === 'admin' && (
                <motion.div
                  key="store-name-field"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="form-group"
                  style={{ marginBottom: 0 }}
                >
                  <label className="label">Store Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Brew & Co. Coffee Shop"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="input"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Team member hint */}
            <AnimatePresence mode="popLayout">
              {isRegister && accountType === 'member' && (
                <motion.div
                  key="member-hint"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <div style={{
                    background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                    borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.82rem',
                    color: '#10b981', lineHeight: 1.5
                  }}>
                    💬 After registering, your admin will send you an invitation link to activate your account.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem', height: '46px' }}
          >
            {isLoading ? (
              <div className="spin" style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: '2px solid var(--bg-color)', borderTopColor: 'transparent'
              }} />
            ) : (
              isRegister ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
