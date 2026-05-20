'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar({ session }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (session?.role !== 'admin') return;

    const fetchPendingCount = async () => {
      try {
        const res = await fetch('/api/admin/pending-count');
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.count);
        }
      } catch (err) {
        console.error('Error fetching pending counts:', err);
      }
    };

    fetchPendingCount();
    // Poll every 10 seconds for real-time notification updates
    const interval = setInterval(fetchPendingCount, 10000);
    return () => clearInterval(interval);
  }, [session]);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/';
      } else {
        alert('Failed to log out. Please try again.');
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link href="/" className="logo-wrapper">
          <img src="/logo.png" alt="Malathala Logo" width="45" height="45" className="logo-img" />
          <div>
            <div className="logo-text">MALATHALA</div>
          </div>
        </Link>

        <ul className="nav-links">
          <li>
            <Link href="/" className="nav-link">
              Gallery
            </Link>
          </li>
          
          {session ? (
            <>
              {session.role === 'admin' ? (
                <li>
                  <Link href="/admin" className="nav-link" style={{ display: 'flex', alignItems: 'center' }}>
                    Admin Panel
                    {pendingCount > 0 && (
                      <span className="admin-badge">{pendingCount}</span>
                    )}
                  </Link>
                </li>
              ) : (
                <li>
                  <Link href="/profile" className="nav-link">
                    My Profile
                  </Link>
                </li>
              )}
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img 
                  src={session.profilePicture || '/default-profile.png'} 
                  alt="Profile" 
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-gold)' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  {session.fullName.split(' ')[0]}
                </span>
              </li>
              <li>
                <button 
                  onClick={handleLogout} 
                  disabled={loading}
                  className="btn btn-secondary btn-small"
                  style={{ cursor: 'pointer' }}
                >
                  {loading ? 'Logging out...' : 'Logout'}
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link href="/login" className="nav-link">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="btn btn-primary btn-small">
                  Join as Artist
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
