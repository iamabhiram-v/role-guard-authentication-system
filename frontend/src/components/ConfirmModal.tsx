// src/components/ConfirmModal.tsx
import React, { useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const accentColor = variant === 'danger' ? '#ef4444' : '#7c3aed';

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,5,10,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '400px',
          margin: '0 1rem',
          background: '#15151f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          animation: 'scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '3px', background: accentColor }} />
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', marginBottom: '0.9rem' }}>
            {variant === 'danger' && (
              <div
                style={{
                  flexShrink: 0,
                  width: '2.2rem',
                  height: '2.2rem',
                  borderRadius: '50%',
                  background: 'rgba(239,68,68,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            )}
            <div>
              <h3 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, margin: 0, marginBottom: '0.35rem' }}>
                {title}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                {message}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.4rem' }}>
            <button
              onClick={onCancel}
              disabled={isLoading}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '0.6rem',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: variant === 'danger' ? '#ef4444' : 'linear-gradient(135deg,#7c3aed,#3b82f6)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {isLoading ? 'Deleting...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};