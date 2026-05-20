'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerificationFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      router.push('/register');
    }
  }, [email, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setTimeout(() => {
          router.push('/login?verified=true');
        }, 3500);
      } else {
        setError(data.error || 'Invalid verification code. Please check and try again.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card glass-panel fade-in">
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <span style={{ fontSize: '40px' }}>📬</span>
        <h1 style={{ fontSize: '28px', marginTop: '16px', fontFamily: 'var(--font-display)' }}>Verify Email</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
          We sent a 6-digit security code to <strong style={{ color: 'var(--color-gold)' }}>{email}</strong>.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(231,76,60,0.1)', border: '1px solid #E74C3C', color: '#E74C3C', borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '24px' }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '16px', background: 'rgba(46,204,113,0.1)', border: '1px solid #2ECC71', color: '#2ECC71', borderRadius: 'var(--radius-sm)', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
          🎉 {success} <br/>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Redirecting you to login...</span>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ textAlign: 'center' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '16px' }}>
              Enter Security Code
            </label>
            <input
              type="text"
              maxLength="6"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setCode(val);
              }}
              placeholder="000000"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--color-gold)',
                fontSize: '36px',
                fontWeight: '700',
                letterSpacing: '0.25em',
                textAlign: 'center',
                padding: '12px',
                borderRadius: '8px',
                width: '100%',
                maxWidth: '240px',
                margin: '0 auto',
                display: 'block',
                fontFamily: 'monospace',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
              }}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ marginTop: '24px' }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      )}

      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px' }}>
        <span style={{ color: 'var(--text-muted)' }}>Didn't receive the email? </span>
        <Link href="/register" style={{ color: 'var(--color-gold)', textDecoration: 'none', fontWeight: '500' }}>
          Restart Registration
        </Link>
      </div>
    </div>
  );
}

export default function VerificationForm() {
  return (
    <Suspense fallback={
      <div className="login-card glass-panel" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading verification context...</p>
      </div>
    }>
      <VerificationFormContent />
    </Suspense>
  );
}
