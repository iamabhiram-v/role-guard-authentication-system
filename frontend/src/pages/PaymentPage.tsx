import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { Layout } from '../components/Layout';
import { createOrder, verifyPayment, resetPayment } from '../store/slices/paymentSlice';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const PaymentPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { order, isCreatingOrder, isVerifying, verified, paymentId, error } = useSelector(
    (state: RootState) => state.payment
  );
  const { user } = useSelector((state: RootState) => state.auth);

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [scriptError, setScriptError] = useState('');

  const handleCreateOrder = async () => {
    const parsed = parseInt(amount, 10);
    if (!amount || isNaN(parsed) || parsed < 1) {
      setAmountError('Enter a valid amount (min ₹1)');
      return;
    }
    setAmountError('');
    dispatch(createOrder({ amountInPaise: parsed * 100, receipt: `rcpt_${Date.now()}` }));
  };

  const handleCheckout = async () => {
    if (!order) return;

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setScriptError('Failed to load Razorpay SDK. Check your connection.');
      return;
    }
    setScriptError('');

    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

    const rzp = new window.Razorpay({
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: 'RoleGuard',
      description: 'Sandbox payment',
      prefill: { email: user?.email || '' },
      theme: { color: '#3b82f6' },
      handler: (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        dispatch(
          verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
        );
      },
    });

    rzp.open();
  };

  const handleReset = () => {
    dispatch(resetPayment());
    setAmount('');
  };

  return (
    <Layout title="Payment (Sandbox)">
      <div style={{ maxWidth: '480px', margin: '2rem auto', padding: '0 1rem' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            padding: '2rem',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '99px',
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.3)',
              color: '#fbbf24',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              marginBottom: '1.25rem',
            }}
          >
            SANDBOX MODE
          </div>

          <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
            Razorpay Integration
          </h2>
          <p style={{ margin: '0 0 1.75rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            Test the payment flow end-to-end. No real charges are made.
          </p>

          {verified ? (
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem',
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: '0.75rem',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✓</div>
              <div style={{ fontWeight: 700, color: '#22c55e', marginBottom: '0.4rem' }}>
                Payment verified
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', wordBreak: 'break-all' }}>
                Payment ID: {paymentId}
              </div>
              <button
                onClick={handleReset}
                style={{
                  marginTop: '1.25rem',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                Try another payment
              </button>
            </div>
          ) : !order ? (
            <>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.4rem' }}>
                Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: amountError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none',
                  marginBottom: amountError ? '0.35rem' : '1.25rem',
                }}
              />
              {amountError && (
                <div style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '1rem' }}>{amountError}</div>
              )}

              {error && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={handleCreateOrder}
                disabled={isCreatingOrder}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.6rem',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: isCreatingOrder ? 'not-allowed' : 'pointer',
                  opacity: isCreatingOrder ? 0.65 : 1,
                }}
              >
                {isCreatingOrder ? 'Creating order...' : 'Create order'}
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '0.6rem',
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.2rem' }}>Order created</div>
                <div style={{ fontSize: '0.88rem', color: '#93c5fd', wordBreak: 'break-all' }}>{order.id}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '0.4rem' }}>
                  ₹{(order.amount / 100).toFixed(2)} {order.currency}
                </div>
              </div>

              {scriptError && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  {scriptError}
                </div>
              )}

              {error && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handleCheckout}
                  disabled={isVerifying}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.6rem',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: isVerifying ? 'not-allowed' : 'pointer',
                    opacity: isVerifying ? 0.65 : 1,
                  }}
                >
                  {isVerifying ? 'Verifying...' : 'Pay now'}
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.6rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.65)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)', marginTop: '1rem' }}>
          Use Razorpay test cards. No real money is charged.
        </p>
      </div>
    </Layout>
  );
};