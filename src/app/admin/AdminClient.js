'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminClient() {
  const router = useRouter();

  // States
  const [users, setUsers] = useState([]);
  const [artworksCount, setArtworksCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [actionLoading, setActionLoading] = useState({});
  const [newUserNotification, setNewUserNotification] = useState(null);
  const [session, setSession] = useState(null);

  const usersRef = useRef([]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // Load and refresh admin data
  const loadAdminData = async (isPoll = false) => {
    try {
      // Fetch users list
      const usersRes = await fetch('/api/admin/users');
      if (!usersRes.ok) {
        if (!isPoll) router.push('/');
        return;
      }
      const usersData = await usersRes.json();
      
      // If polling, check for new pending user requests to notify
      if (isPoll && usersRef.current.length > 0) {
        const currentPendingIds = usersRef.current.filter(u => u.status === 'pending').map(u => u.id);
        const newPendingUsers = usersData.users.filter(
          nu => nu.status === 'pending' && !currentPendingIds.includes(nu.id)
        );

        if (newPendingUsers.length > 0) {
          // Play a gentle notification sound chime
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav');
            audio.volume = 0.4;
            audio.play();
          } catch (soundError) {
            // Ignore browsers blocking audio autoplay
          }
          // Set notification toast
          setNewUserNotification(newPendingUsers[0]);
          // Clear after 8 seconds
          setTimeout(() => setNewUserNotification(null), 8000);
        }
      }

      setUsers(usersData.users);

      // Fetch artworks count
      const artRes = await fetch('/api/artworks');
      if (artRes.ok) {
        const artData = await artRes.json();
        setArtworksCount(artData.artworks.length);
      }

    } catch (err) {
      console.error('Failed to reload admin dashboard data:', err);
      if (!isPoll) router.push('/login');
    }
  };

  useEffect(() => {
    async function initDashboard() {
      try {
        // Fetch current profile to verify admin status
        const profRes = await fetch('/api/profile');
        if (!profRes.ok) {
          router.push('/login');
          return;
        }
        
        const profData = await profRes.json();
        if (profData.user.role !== 'admin') {
          alert('Access Denied. Administrator role required.');
          router.push('/');
          return;
        }

        setSession(profData.user);
        await loadAdminData(false);
      } catch (err) {
        console.error(err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    initDashboard();

    // Start polling every 10 seconds for real-time notification capability
    const interval = setInterval(() => loadAdminData(true), 10000);
    return () => clearInterval(interval);
  }, [router]);

  // Handle status update
  const handleStatusChange = async (userId, newStatus) => {
    if (actionLoading[userId]) return;

    setActionLoading(prev => ({ ...prev, [userId]: true }));

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.autoLogin) {
          alert('Account approved! Logging in and redirecting to the artist profile dashboard.');
          window.location.assign('/profile');
          return;
        }
        // Update user status in local state
        setUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, status: newStatus } : u))
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user status.');
      }
    } catch (err) {
      console.error('Status change error:', err);
      alert('An error occurred.');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };  // Handle role update (promoting/demoting admins)
  const handleRoleChange = async (userId, newRole) => {
    if (actionLoading[userId]) return;

    setActionLoading(prev => ({ ...prev, [userId]: true }));

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      });

      if (res.ok) {
        // Update user role in local state
        setUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user role.');
      }
    } catch (err) {
      console.error('Role change error:', err);
      alert('An error occurred.');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Compute stats
  const totalUsers = users.length;
  const pendingCount = users.filter(u => u.status === 'pending' && (!session || u.id !== session.userId)).length;
  const approvedCount = users.filter(u => u.status === 'approved' && (!session || u.id !== session.userId)).length;
  const declinedCount = users.filter(u => u.status === 'declined' && (!session || u.id !== session.userId)).length;

  // Filter users for display
  const displayedUsers = users.filter(u => {
    if (session && u.id === session.userId) return false; // Hide current admin from list
    if (filterStatus === 'All') return true;
    return u.status === filterStatus.toLowerCase();
  });
  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '120px 0', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '32px' }}>🔒</div>
        <p>Loading administrative dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container fade-in admin-panel-container">
      <h1 style={{ fontSize: '36px', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Admin Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Manage user account requests, view statistics, and moderate galleries.</p>

      {/* Stats Cards Grid */}
      <section className="admin-stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon">👥</div>
          <div>
            <div className="stat-num">{totalUsers - 1}</div>
            <div className="stat-label">Total Artists</div>
          </div>
        </div>

        <div className="stat-card glass-panel" style={{ borderLeft: '3px solid var(--color-gold)' }}>
          <div className="stat-icon" style={{ color: 'var(--color-gold)', background: 'rgba(245,176,65,0.1)' }}>⏳</div>
          <div>
            <div className="stat-num">{pendingCount}</div>
            <div className="stat-label">Pending Reviews</div>
          </div>
        </div>

        <div className="stat-card glass-panel" style={{ borderLeft: '3px solid #2ECC71' }}>
          <div className="stat-icon" style={{ color: '#2ECC71', background: 'rgba(46,204,113,0.1)' }}>✓</div>
          <div>
            <div className="stat-num">{approvedCount}</div>
            <div className="stat-label">Approved Accounts</div>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon">🖼</div>
          <div>
            <div className="stat-num">{artworksCount}</div>
            <div className="stat-label">Published Artworks</div>
          </div>
        </div>
      </section>

      {/* User Management Section */}
      <section className="glass-panel dashboard-card-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ fontSize: '20px' }}>Artist Application List</h2>
          
          {/* List Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['All', 'Pending', 'Approved', 'Declined'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`filter-tab btn-small ${filterStatus === tab ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        {displayedUsers.length > 0 ? (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Artist / User Info</th>
                  <th>Email</th>
                  <th>Primary Field</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <img 
                          src={u.profilePicture || '/default-profile.png'} 
                          alt={u.fullName} 
                          className="user-cell-avatar"
                          onError={(e) => { e.target.src = '/default-profile.png'; }}
                        />
                        <div>
                          <div className="user-cell-name">{u.fullName}</div>
                          <div className="user-cell-username">
                            @{u.username}
                            {u.role === 'admin' && (
                              <span className="badge badge-approved" style={{ fontSize: '9px', marginLeft: '6px', padding: '2px 6px', background: 'rgba(245, 176, 65, 0.15)', color: 'var(--color-gold)', borderColor: 'rgba(245, 176, 65, 0.3)' }}>
                                admin
                              </span>
                            )}
                          </div>                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.category}</td>
                    <td>
                      <span className={`badge badge-${u.status}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      {new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
                        {u.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(u.id, 'approved')}
                              disabled={actionLoading[u.id]}
                              className="btn btn-primary btn-small"
                              style={{ background: '#2ECC71', color: 'white', border: 'none', boxShadow: 'none' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(u.id, 'declined')}
                              disabled={actionLoading[u.id]}
                              className="btn btn-danger btn-small"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {u.status === 'approved' && (
                          <>
                            {u.role === 'artist' ? (
                              <button
                                onClick={() => handleRoleChange(u.id, 'admin')}
                                disabled={actionLoading[u.id]}
                                className="btn btn-secondary btn-small"
                                style={{ background: 'transparent', border: '1px solid var(--color-gold)', color: 'var(--color-gold)', fontSize: '11px', marginRight: '6px' }}
                              >
                                Make Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRoleChange(u.id, 'artist')}
                                disabled={actionLoading[u.id]}
                                className="btn btn-secondary btn-small"
                                style={{ background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', fontSize: '11px', marginRight: '6px' }}
                              >
                                Remove Admin
                              </button>
                            )}
                            <button
                              onClick={() => handleStatusChange(u.id, 'declined')}
                              disabled={actionLoading[u.id]}
                              className="btn btn-danger btn-small"
                              style={{ background: 'transparent', border: '1px solid #E74C3C', color: '#E74C3C', fontSize: '11px' }}
                            >
                              Block / Decline
                            </button>
                          </>
                        )}
                        {u.status === 'declined' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(u.id, 'approved')}
                              disabled={actionLoading[u.id]}
                              className="btn btn-primary btn-small"
                              style={{ background: '#2ECC71', color: 'white', border: 'none', boxShadow: 'none' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(u.id, 'pending')}
                              disabled={actionLoading[u.id]}
                              className="btn btn-secondary btn-small"
                              style={{ fontSize: '11px' }}
                            >
                              Set Pending
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <p>No user accounts found matching status: <strong>{filterStatus}</strong></p>
          </div>
        )}
      </section>

      {/* Floating Real-Time notification Toast */}
      {newUserNotification && (
        <div className="realtime-toast">
          <div className="toast-icon">🔔</div>
          <div className="toast-body">
            <div className="toast-title">New Artist Registration</div>
            <div className="toast-text">
              <strong>{newUserNotification.fullName}</strong> has applied as a <strong>{newUserNotification.category}</strong> artist.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => {
                handleStatusChange(newUserNotification.id, 'approved');
                setNewUserNotification(null);
              }}
              className="btn btn-primary btn-small"
              style={{ background: '#2ECC71', color: 'white', border: 'none', boxShadow: 'none', padding: '6px 12px' }}
            >
              Approve
            </button>
            <button 
              className="toast-close"
              onClick={() => setNewUserNotification(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
