import React, { useEffect, useRef, useState } from 'react';
import '../styles/Toast.css';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  isVisible: boolean;
  onClose: () => void;
  duration?: number; // ms, 0 = no auto-dismiss
  action?: ToastAction;
}

const variantConfig: Record<ToastVariant, { color: string; label: string; icon: React.ReactNode }> = {
  success: {
    color: '#34d399',
    label: 'Success',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    color: '#f87171',
    label: 'Error',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  info: {
    color: '#60a5fa',
    label: 'Info',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  warning: {
    color: '#fbbf24',
    label: 'Warning',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'success',
  isVisible,
  onClose,
  duration = 4000,
  action,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const config = variantConfig[variant];

  const onCloseRef = useRef(onClose);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(duration);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  };

  const handleClose = () => {
    clearTimers();
    setIsExiting(true);
    exitTimerRef.current = setTimeout(() => {
      onCloseRef.current();
    }, 200);
  };

  const startTimer = (ms: number) => {
    if (ms <= 0) {
      handleClose();
      return;
    }
    deadlineRef.current = Date.now() + ms;
    timerRef.current = setTimeout(() => {
      handleClose();
    }, ms);
  };

  const pauseTimer = () => {
    if (timerRef.current && deadlineRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      remainingRef.current = Math.max(0, deadlineRef.current - Date.now());
    }
  };

  useEffect(() => {
    clearTimers();
    setIsExiting(false);

    if (!isVisible || duration === 0) return;

    remainingRef.current = duration;
    startTimer(duration);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, message, duration]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!isVisible || duration === 0) return;
      if (document.hidden) {
        pauseTimer();
      } else if (!isPaused) {
        if (remainingRef.current <= 0) {
          handleClose();
        } else {
          startTimer(remainingRef.current);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, duration, isPaused]);

  // Escape key dismisses the active toast — standard behavior for any
  // transient overlay in accessible UI patterns (WAI-ARIA alert dialogs).
  useEffect(() => {
    if (!isVisible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const handleMouseEnter = () => {
    if (duration === 0) return;
    setIsPaused(true);
    pauseTimer();
  };

  const handleMouseLeave = () => {
    if (duration === 0) return;
    setIsPaused(false);
    startTimer(remainingRef.current);
  };

  useEffect(() => clearTimers, []);

  if (!isVisible) return null;

  return (
    <div
      className={`toast-wrap ${isExiting ? 'exiting' : 'entering'}`}
      style={{ ['--toast-color' as any]: config.color }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      // role="status" + aria-live="polite" announce the message to screen
      // readers without stealing focus — "assertive" would be too
      // aggressive for routine success/info toasts.
      role="status"
      aria-live="polite"
    >
      <div className="toast-shell">
        <div className="toast-accent" />

        <div className="toast-body">
          <div className="toast-icon" style={{ color: config.color, background: `color-mix(in srgb, ${config.color} 16%, transparent)` }}>
            {config.icon}
          </div>

          <div className="toast-text">
            <span className="toast-label" style={{ color: config.color }}>{config.label}</span>
            <p className="toast-message">{message}</p>

            {action && (
              <button
                className="toast-action"
                style={{ color: config.color }}
                onClick={() => {
                  action.onClick();
                  handleClose();
                }}
              >
                {action.label}
              </button>
            )}
          </div>

          <button onClick={handleClose} aria-label="Dismiss notification" className="toast-close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {duration > 0 && (
          <div className="toast-progress-track">
            <div
              key={message}
              className={`toast-progress-bar ${isPaused ? 'paused' : ''}`}
              style={{ animationDuration: `${duration}ms`, background: config.color }}
            />
          </div>
        )}
      </div>
    </div>
  );
};