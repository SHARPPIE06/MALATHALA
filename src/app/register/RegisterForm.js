'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState('Drawing');
  const [bio, setBio] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState('/default-profile.png');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkLoggedIn() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            if (data.user.role === 'admin') {
              router.push('/admin');
            } else {
              router.push('/profile');
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }
    checkLoggedIn();
  }, [router]);

  const categories = [
    'Drawing',
    'Painting',
    'Digital Arts',
    'Photography',
    'Video and Films',
    'Sculpture',
    'Others'
  ];

  // Handle profile image file change and generate preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !fullName || !category) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('fullName', fullName);
      formData.append('category', category);
      formData.append('bio', bio);
      if (profilePic) {
        formData.append('profilePicture', profilePic);
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/pending-approval');
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch (err) {
      console.error('Registration submit error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-wrapper fade-in">
      <div className="auth-card glass-panel" style={{ maxWidth: '600px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 className="auth-title">Join MALATHALA</h2>
          <p className="auth-subtitle">Apply as a visual artist to showcase your portfolio</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
            <img src={profilePicPreview} alt="Profile Preview" className="file-upload-preview" />
            <div className="file-upload-wrapper">
              <button type="button" className="file-upload-btn">Upload Profile Picture</button>
              <input
                type="file"
                className="file-upload-input"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Max size 5MB. JPEG, PNG, GIF, or WebP.</span>
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input
                type="text"
                className="form-control"
                placeholder="artist_name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Juan Dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-control"
              placeholder="juan@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="At least 6 chars"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Primary Art Field *</label>
              <select
                className="form-control select-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} style={{ background: 'var(--bg-secondary)', color: 'white' }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label">Artist Biography</label>
            <textarea
              className="form-control"
              placeholder="Tell us about yourself, your artistic journey, and inspirations..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Submitting Application...' : 'Apply for Artist Account'}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--color-gold)', fontWeight: '500' }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
