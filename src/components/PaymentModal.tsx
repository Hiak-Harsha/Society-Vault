'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { formatCurrency } from '@/lib/utils';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useWorkspace } from '@/context/WorkspaceContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  purpose: string;
  onPaymentSuccess: (details: { paymentMethod: string; referenceNumber: string; razorpayOrderId?: string; razorpaySignature?: string }) => void;
}

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = (publishableKey: string) => {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  purpose,
  onPaymentSuccess,
}) => {
  const { currentUser } = useWorkspace();
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isMock, setIsMock] = useState(true);
  const [clientSecret, setClientSecret] = useState('');
  const [pubKey, setPubKey] = useState('');

  const [gateway, setGateway] = useState<'stripe' | 'razorpay' | 'mock'>('mock');
  const [rzpOrderId, setRzpOrderId] = useState('');
  const [rzpKeyId, setRzpKeyId] = useState('');

  // Original Mock state
  const [method, setMethod] = useState<'UPI' | 'BANK_TRANSFER' | 'CARDS'>('UPI');
  const [status, setStatus] = useState<'idle' | 'processing' | 'verifying' | 'success'>('idle');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [progressText, setProgressText] = useState('Initiating secure channel...');

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStatus('idle');
        setCardNumber('');
        setExpiry('');
        setCvv('');
        setUpiId('');
        setBankAccount('');
      }, 0);
      return () => clearTimeout(timer);
    }

    const fetchConfig = async () => {
      setLoadingConfig(true);
      try {
        const res = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, purpose }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.isMock) {
            setIsMock(true);
            setGateway('mock');
          } else if (data.gateway === 'razorpay') {
            setIsMock(false);
            setGateway('razorpay');
            setRzpOrderId(data.orderId);
            setRzpKeyId(data.keyId);
          } else {
            setIsMock(false);
            setGateway('stripe');
            setClientSecret(data.clientSecret);
            setPubKey(data.publishableKey);
          }
        } else {
          setIsMock(true);
          setGateway('mock');
        }
      } catch (err) {
        console.error('Failed to initialize payment gateway, falling back to mock simulator:', err);
        setIsMock(true);
        setGateway('mock');
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [isOpen, amount, purpose]);

  const handlePayMock = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('processing');
    setProgressText('Connecting to organization lending vault...');

    // Simulate payment processing steps
    setTimeout(() => {
      setProgressText('Verifying digital certificate & signatures...');
      setStatus('verifying');
      
      setTimeout(() => {
        setStatus('success');
        const refNumber = `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        
        setTimeout(() => {
          onPaymentSuccess({
            paymentMethod: method,
            referenceNumber: refNumber,
          });
          onClose();
        }, 1500);
      }, 1500);
    }, 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => status === 'idle' && onClose()}
      title="Secure Lending Gateway"
      size="md"
    >
      {loadingConfig ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 0',
          gap: '16px'
        }}>
          <svg className="spin" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" stroke="var(--border-color)" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Securing transaction tunnel...</span>
        </div>
      ) : isMock ? (
        // RENDER MOCK FORM
        <>
          {status === 'idle' && (
            <form onSubmit={handlePayMock} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: 'var(--warning)',
                  padding: '2px 8px',
                  borderRadius: '0 0 0 8px',
                  fontSize: '10px',
                  fontWeight: 600
                }}>
                  Sandbox Simulation
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount to Process</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                  {formatCurrency(amount)}
                </h2>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{purpose}</p>
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px dashed rgba(245, 158, 11, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                color: 'var(--warning)',
                lineHeight: '1.5',
                textAlign: 'left'
              }}>
                <strong>💡 Live Gateway Activation:</strong> To bypass sandbox simulation and accept real money flows, configure <code>RAZORPAY_KEY_ID</code> &amp; <code>RAZORPAY_KEY_SECRET</code> (or <code>STRIPE_SECRET_KEY</code> &amp; <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>) inside your project&apos;s <code>.env</code> file.
              </div>

              <div className="form-group">
                <label className="form-label">Payment Channel</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {(['UPI', 'BANK_TRANSFER', 'CARDS'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className="btn"
                      style={{
                        background: method === m ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        border: `1px solid ${method === m ? 'var(--accent-secondary)' : 'var(--border-color)'}`,
                        color: method === m ? 'var(--accent-secondary)' : 'var(--text-primary)',
                        padding: '12px 6px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      {m === 'UPI' ? 'UPI / QR Code' : m === 'BANK_TRANSFER' ? 'NEFT / RTGS' : 'Card Payment'}
                    </button>
                  ))}
                </div>
              </div>

              {method === 'UPI' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
                  <div style={{
                    background: '#ffffff',
                    padding: '12px',
                    borderRadius: '8px',
                    width: '160px',
                    height: '160px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 16px rgba(16, 185, 129, 0.2)'
                  }}>
                    <svg width="130" height="130" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.5">
                      <rect x="2" y="2" width="6" height="6" />
                      <rect x="16" y="2" width="6" height="6" />
                      <rect x="2" y="16" width="6" height="6" />
                      <rect x="5" y="5" width="0.01" height="0.01" strokeWidth="3" />
                      <rect x="19" y="5" width="0.01" height="0.01" strokeWidth="3" />
                      <rect x="5" y="19" width="0.01" height="0.01" strokeWidth="3" />
                      <path d="M12 2v4M12 12h4M12 16v6M16 12v6M2 12h6M16 20h4" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Scan QR code using UPI app or enter Virtual Payment ID:</span>
                  <input
                    type="text"
                    className="input"
                    placeholder="username@bank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                    style={{ textAlign: 'center', maxWidth: '240px' }}
                  />
                </div>
              )}

              {method === 'BANK_TRANSFER' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pay-acc">Settlement Account Number</label>
                    <input
                      id="pay-acc"
                      type="text"
                      className="input"
                      placeholder="e.g. 501002938475"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      required
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Funds will be processed immediately via secure inter-bank clearing networks.
                  </span>
                </div>
              )}

              {method === 'CARDS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pay-card">Card Number</label>
                    <input
                      id="pay-card"
                      type="text"
                      className="input"
                      placeholder="4000 1234 5678 9010"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pay-exp">Expiry Date</label>
                      <input
                        id="pay-exp"
                        type="text"
                        className="input"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pay-cvv">CVV</label>
                      <input
                        id="pay-cvv"
                        type="password"
                        className="input"
                        placeholder="•••"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Authorize Payment (Mock)
                </button>
              </div>
            </form>
          )}

          {status !== 'idle' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 0',
              gap: '24px',
              textAlign: 'center'
            }}>
              {status === 'success' ? (
                <div className="vault-icon fade-in" style={{
                  background: 'var(--accent-primary)',
                  borderRadius: '50%',
                  padding: '16px',
                  color: '#0a0e1a',
                  boxShadow: '0 0 24px rgba(16, 185, 129, 0.4)'
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : (
                <svg className="spin" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" stroke="var(--border-color)" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                  {status === 'success' ? 'Transaction Authorized' : 'Processing Payment'}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {status === 'success' ? 'Lending ledger entry confirmed.' : progressText}
                </p>
              </div>
            </div>
          )}
        </>
      ) : gateway === 'razorpay' ? (
        <RazorpayCheckoutForm
          orderId={rzpOrderId}
          keyId={rzpKeyId}
          amount={amount}
          purpose={purpose}
          onPaymentSuccess={onPaymentSuccess}
          onClose={onClose}
          currentUser={currentUser}
        />
      ) : (
        // RENDER STRIPE ELEMENTS FORM
        <Elements stripe={getStripe(pubKey)} options={{ clientSecret }}>
          <StripeCheckoutForm
            clientSecret={clientSecret}
            amount={amount}
            purpose={purpose}
            onPaymentSuccess={onPaymentSuccess}
            onClose={onClose}
          />
        </Elements>
      )}
    </Modal>
  );
};

interface StripeCheckoutFormProps {
  clientSecret: string;
  amount: number;
  purpose: string;
  onPaymentSuccess: (details: { paymentMethod: string; referenceNumber: string }) => void;
  onClose: () => void;
}

const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({
  clientSecret,
  amount,
  purpose,
  onPaymentSuccess,
  onClose,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setStripeError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setStripeError('Card element not loaded');
      setIsProcessing(false);
      return;
    }

    try {
      const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        setStripeError(error.message || 'Payment confirmation failed');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setSuccess(true);
        setTimeout(() => {
          onPaymentSuccess({
            paymentMethod: 'STRIPE_CARD',
            referenceNumber: paymentIntent.id,
          });
          onClose();
        }, 1500);
      } else {
        setStripeError('Payment in an unexpected status: ' + paymentIntent?.status);
        setIsProcessing(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during transaction processing';
      setStripeError(errorMessage);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div style={{
        background: 'rgba(255,255,255,0.01)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: 'rgba(16, 185, 129, 0.12)',
          color: '#10b981',
          padding: '2px 8px',
          borderRadius: '0 0 0 8px',
          fontSize: '10px',
          fontWeight: 600
        }}>
          Stripe Real Gateway
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount to Process</span>
        <h2 style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '800', color: 'var(--accent-primary)' }}>
          {formatCurrency(amount)}
        </h2>
        <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{purpose}</p>
      </div>

      {!success && (
        <>
          <div className="form-group">
            <label className="form-label">Credit or Debit Card</label>
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '16px',
              minHeight: '48px'
            }}>
              <CardElement
                options={{
                  style: {
                    base: {
                      color: '#f1f5f9',
                      fontFamily: "'Inter', sans-serif",
                      fontSmoothing: 'antialiased',
                      fontSize: '14px',
                      '::placeholder': {
                        color: '#64748b',
                      },
                    },
                    invalid: {
                      color: '#ef4444',
                      iconColor: '#ef4444',
                    },
                  },
                }}
              />
            </div>
          </div>

          {stripeError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
              color: 'var(--accent-danger)'
            }}>
              {stripeError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} disabled={isProcessing} className="btn btn-ghost" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={isProcessing || !stripe} className="btn btn-primary" style={{ flex: 2 }}>
              {isProcessing ? (
                <>
                  <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Processing...
                </>
              ) : 'Authorize Stripe Payment'}
            </button>
          </div>
        </>
      )}

      {success && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 0',
          gap: '16px',
          textAlign: 'center'
        }}>
          <div className="vault-icon fade-in" style={{
            background: 'var(--accent-primary)',
            borderRadius: '50%',
            padding: '16px',
            color: '#0a0e1a',
            boxShadow: '0 0 24px rgba(16, 185, 129, 0.4)'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Stripe Transaction Verified</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Ledger balance has been credited/debited.</p>
          </div>
        </div>
      )}
    </form>
  );
};

interface RazorpayCheckoutFormProps {
  orderId: string;
  keyId: string;
  amount: number;
  purpose: string;
  onPaymentSuccess: (details: { paymentMethod: string; referenceNumber: string; razorpayOrderId?: string; razorpaySignature?: string }) => void;
  onClose: () => void;
  currentUser: import('@/context/WorkspaceContext').UserProfile | null;
}

const RazorpayCheckoutForm: React.FC<RazorpayCheckoutFormProps> = ({
  orderId,
  keyId,
  amount,
  purpose,
  onPaymentSuccess,
  onClose,
  currentUser,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const loadScript = (src: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePay = async () => {
    setIsProcessing(true);
    setError('');

    const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    if (!loaded) {
      setError('Failed to load Razorpay SDK. Please check your internet connection.');
      setIsProcessing(false);
      return;
    }

    try {
      const options = {
        key: keyId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: 'SocietyVault',
        description: purpose,
        order_id: orderId,
        handler: function (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
          setSuccess(true);
          setTimeout(() => {
            onPaymentSuccess({
              paymentMethod: 'RAZORPAY',
              referenceNumber: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            onClose();
          }, 1500);
        },
        prefill: {
          name: currentUser?.name || '',
          email: currentUser?.email || '',
        },
        theme: {
          color: '#10b981',
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch {
      setError('An error occurred while opening the payment gateway.');
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        background: 'rgba(255,255,255,0.01)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: 'rgba(16, 185, 129, 0.12)',
          color: '#10b981',
          padding: '2px 8px',
          borderRadius: '0 0 0 8px',
          fontSize: '10px',
          fontWeight: 600
        }}>
          Razorpay Real Gateway
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount to Process</span>
        <h2 style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '800', color: 'var(--accent-primary)' }}>
          {formatCurrency(amount)}
        </h2>
        <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{purpose}</p>
      </div>

      {success ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 0',
          gap: '16px',
          textAlign: 'center'
        }}>
          <div className="vault-icon fade-in" style={{
            background: 'var(--accent-primary)',
            borderRadius: '50%',
            padding: '16px',
            color: '#0a0e1a',
            boxShadow: '0 0 24px rgba(16, 185, 129, 0.4)'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Payment Successful</h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Processing lending ledger entries...</p>
        </div>
      ) : (
        <>
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            border: '1px dashed var(--border-color)',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.01)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Complete transaction securely via Razorpay payment gateway
            </span>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
              color: 'var(--accent-danger)'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} disabled={isProcessing} className="btn btn-ghost" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePay}
              disabled={isProcessing}
              className="btn btn-primary"
              style={{ flex: 2 }}
            >
              {isProcessing ? (
                <>
                  <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                'Pay with Razorpay'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
