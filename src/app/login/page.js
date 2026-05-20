'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (verified === 'true') {
      setSuccess('Email successfully verified! Your account is now pending administrator approval.');
    }
  }, [verified]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');
    if (verified !== 'true') setSuccess('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Login successful! Redirecting...');
        // Refresh layout session and push to dashboard
        router.refresh();
        setTimeout(() => {
          if (data.user.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/profile');
          }
        }, 1000);
      } else {
        setError(data.error || 'Invalid credentials');
        if (data.unverified && data.email) {
          setTimeout(() => {
            router.push(`/register/verify?email=${encodeURIComponent(data.email)}`);
          }, 2500);
        }
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card glass-panel">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img src="/logo.png" alt="Malathala Logo" width="80" height="80" style={{ borderRadius: '50%', border: '2px solid var(--color-gold)', boxShadow: 'var(--shadow-gold-glow)', marginBottom: '16px' }} />
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Sign in to manage your visual arts portfolio</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: '32px' }}>
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
        Don't have an account?{' '}
        <Link href="/register" style={{ color: 'var(--color-gold)', fontWeight: '500' }}>
          Apply as Artist
        </Link>
      </p>
    </div>
  );
}

export default function Login() {
  return (
    <div className="container auth-wrapper fade-in">
      <Suspense fallback={
        <div className="auth-card glass-panel" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading authentication context...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
