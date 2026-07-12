import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ShieldAlert, CheckCircle, ChevronDown } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const Login = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Data Analyst');
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
        const response = await axios.post(`${API_BASE}/register`, {
          email,
          password,
          name,
          role
        });
        setSuccess('Account created successfully! Logging you in...');
        setTimeout(() => {
          onLogin(response.data.token, response.data.user);
        }, 1500);
      } else {
        const response = await axios.post(`${API_BASE}/login`, {
          email,
          password
        });
        onLogin(response.data.token, response.data.user);
      }
    } catch (err) {
      console.error('Auth error:', err);
      const errMsg = err.response?.data?.error || 'Something went wrong. Please try again.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    'Lead Data Scientist',
    'Data Analyst',
    'Retail Specialist',
    'Business Manager'
  ];

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
        .login-scroll-container::-webkit-scrollbar {
          width: 5px;
        }
        .login-scroll-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .login-scroll-container::-webkit-scrollbar-thumb {
          background: rgba(245, 245, 245, 0.08);
          border-radius: 10px;
        }
        .login-scroll-container::-webkit-scrollbar-thumb:hover {
          background: rgba(245, 245, 245, 0.15);
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2.5rem',
          zIndex: 10,
          margin: '1.5rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), inset 1px 1px 0px 0px rgba(245, 245, 245, 0.05)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <span style={{
            fontWeight: '800',
            fontSize: '2rem',
            color: 'var(--text-main)',
            letterSpacing: '-0.03em',
            display: 'block',
            marginBottom: '0.5rem'
          }}>
          </span>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            fontWeight: '500'
          }}>
            Association Rule Mining Platform
          </p>
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
            onClick={() => {
              setIsRegister(false);
              setError('');
              setSuccess('');
            }}
            style={{
              flex: 1,
              padding: '0.625rem 0',
              textAlign: 'center',
              fontSize: '0.9rem',
              fontWeight: '600',
              zIndex: 2,
              color: !isRegister ? 'var(--text-main)' : 'var(--text-dim)',
              transition: 'color 0.25s ease'
            }}
          >
            Sign In
          </div>
          <div
            onClick={() => {
              setIsRegister(true);
              setError('');
              setSuccess('');
            }}
            style={{
              flex: 1,
              padding: '0.625rem 0',
              textAlign: 'center',
              fontSize: '0.9rem',
              fontWeight: '600',
              zIndex: 2,
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
              position: 'absolute',
              top: '4px',
              left: isRegister ? '50%' : '4px',
              right: isRegister ? '4px' : '50%',
              bottom: '4px',
              backgroundColor: 'rgba(245, 245, 245, 0.08)',
              border: '1px solid rgba(245, 245, 245, 0.05)',
              borderRadius: '6px',
              zIndex: 1
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                color: '#ef4444',
                fontSize: '0.85rem',
                overflow: 'hidden'
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                color: '#10b981',
                fontSize: '0.85rem',
                overflow: 'hidden'
              }}
            >
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Scrollable Fields Wrapper */}
          <div
            className="login-scroll-container"
            style={{
              maxHeight: '260px',
              height: '260px',
              overflowY: 'auto',
              paddingRight: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            <AnimatePresence mode="popLayout">
              {isRegister && (
                <motion.div
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
                    placeholder="John Doe"
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
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="form-group"
                  style={{ marginBottom: 0 }}
                >
                  <label className="label">Role</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="select"
                      style={{ appearance: 'none', paddingRight: '44px' }}
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-dim)',
                      pointerEvents: 'none'
                    }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button (Fixed at bottom) */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: '0.75rem',
              height: '46px'
            }}
          >
            {isLoading ? (
              <div className="spin" style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '2px solid var(--bg-color)',
                borderTopColor: 'transparent'
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
