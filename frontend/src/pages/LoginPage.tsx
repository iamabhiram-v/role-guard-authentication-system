import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login, verifyOtp, clearError, clearPendingOtp } from '../store/slices/authSlice';
import { AppDispatch, RootState } from '../store';
import '../styles/auth.css';

interface FormErrors {
  email?: string;
  password?: string;
}

export const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated, pendingOtpEmail } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearPendingOtp());
    };
  }, [dispatch]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await dispatch(login(formData)).unwrap();
    } catch {
      // Error handled by Redux
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingOtpEmail || otpCode.length !== 6) return;
    try {
      await dispatch(verifyOtp({ email: pendingOtpEmail, code: otpCode })).unwrap();
      navigate('/dashboard');
    } catch {
      // Error handled by Redux
    }
  };

  const handleResend = async () => {
    if (!formData.email || !formData.password) return;
    dispatch(clearError());
    await dispatch(login(formData));
  };

  const handleBackToLogin = () => {
    dispatch(clearPendingOtp());
    dispatch(clearError());
    setOtpCode('');
  };

  const EyeIcon = ({ isOpen }: { isOpen: boolean }) => (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {isOpen ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );

  return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <div className="brand-top">
          <div className="brand-logo">
            <div className="brand-logo-icon">R</div>
            <div className="brand-logo-text">RoleGuard</div>
          </div>
        </div>
        <div className="brand-content">
          <div className="brand-chart">
            <div className="chart-bar"></div>
            <div className="chart-bar"></div>
            <div className="chart-bar"></div>
            <div className="chart-bar"></div>
            <div className="chart-bar"></div>
          </div>
        </div>
        <div className="brand-footer">RoleGuard &copy; 2026</div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-container">
          {!pendingOtpEmail ? (
            <>
              <div className="auth-eyebrow">Welcome Back</div>
              <h1 className="auth-title">Sign In</h1>
              <p className="auth-subtitle"></p>

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    disabled={isLoading}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className={`form-input ${errors.password ? 'error' : ''}`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <EyeIcon isOpen={showPassword} />
                    </button>
                  </div>
                  {errors.password && <span className="error-text">{errors.password}</span>}
                </div>

                {error && <div className="error-alert">{error}</div>}

                <button type="submit" className="btn-submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="form-divider">or continue with</div>

              <a
                href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'}/api/auth/oauth/google`}
                className="btn-google"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  width: '100%',
                  padding: '0.7rem',
                  borderRadius: '0.55rem',
                  background: '#fff',
                  color: '#1f2937',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  border: '1px solid #e5e7eb',
                  marginBottom: '1rem',
                  boxSizing: 'border-box',
                  transition: 'background 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f3f4f6'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.8 20-21 0-1.3-.2-2.7-.5-4z"/>
                  <path fill="#34A853" d="M6.3 14.7l7 5.1C15.5 16 19.4 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.8 0-14.5 4.4-17.7 10.7z" transform="translate(0,0)"/>
                  <path fill="#FBBC05" d="M24 45c5.5 0 10.5-1.9 14.4-5l-6.6-5.4C29.8 36.2 27 37 24 37c-6 0-11-3.9-12.8-9.4L4 33c3.1 6.5 9.8 11 20 12z" transform="translate(0,0)"/>
                  <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.8 2.9-2.8 5.4-5.5 7.1l6.6 5.4C41.7 37.7 45 31.4 45 24c0-1.3-.2-2.7-.5-4z" transform="translate(0,0)"/>
                </svg>
                Sign in with Google
              </a>

              <p className="auth-footer">
                Don&apos;t have an account? <Link to="/register">Create one now</Link>
              </p>

              <a href="#" className="forgot-link">
                Forgot your password?
              </a>
            </>
          ) : (
            <>
              <div className="auth-eyebrow">Verify It&apos;s You</div>
              <h1 className="auth-title">Enter Code</h1>
              <p className="auth-subtitle">
                We sent a 6-digit code to <strong>{pendingOtpEmail}</strong>. It expires in 5 minutes.
              </p>

              <form onSubmit={handleOtpSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="form-input"
                    disabled={isLoading}
                    autoFocus
                    style={{ letterSpacing: '0.5em', fontSize: '1.3rem', textAlign: 'center' }}
                  />
                </div>

                {error && <div className="error-alert">{error}</div>}

                <button type="submit" className="btn-submit" disabled={isLoading || otpCode.length !== 6}>
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Verifying...
                    </>
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>
              </form>

              <p className="auth-footer">
                Didn&apos;t get a code?{' '}
                <a href="#" onClick={(e: React.MouseEvent) => { e.preventDefault(); handleResend(); }}>
                  Resend
                </a>
              </p>

              <a
                href="#"
                className="forgot-link"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  handleBackToLogin();
                }}
              >
                &larr; Back to sign in
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
};