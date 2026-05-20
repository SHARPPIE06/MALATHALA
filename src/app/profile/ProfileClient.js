'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileClient() {
  const router = useRouter();
  
  // States
  const [user, setUser] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Profile edit states
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPic, setEditPic] = useState(null);
  const [editPicPreview, setEditPicPreview] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Artwork upload states
  const [artTitle, setArtTitle] = useState('');
  const [artDescription, setArtDescription] = useState('');
  const [artCategory, setArtCategory] = useState('Drawing');
  const [artPrice, setArtPrice] = useState('');
  const [artImage, setArtImage] = useState(null);
  const [artImagePreview, setArtImagePreview] = useState(null);
  const [artError, setArtError] = useState('');
  const [artSuccess, setArtSuccess] = useState('');
  const [artLoading, setArtLoading] = useState(false);

  const categories = [
    'Drawing',
    'Painting',
    'Digital Arts',
    'Photography',
    'Video and Films',
    'Sculpture',
    'Others'
  ];

  // Fetch profile and artworks
  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) {
          router.push('/login');
          return;
        }

        const data = await res.json();
        setUser(data.user);
        
        // Populate edit fields
        setEditName(data.user.fullName);
        setEditCategory(data.user.category);
        setEditBio(data.user.bio || '');
        setEditPicPreview(data.user.profilePicture || '/default-profile.png');

        // Fetch artworks for this artist
        const artRes = await fetch(`/api/artworks?artistId=${data.user.id}`);
        if (artRes.ok) {
          const artData = await artRes.json();
          setArtworks(artData.artworks);
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  // Handle profile image file change
  const handleProfileFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditPic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle profile update submit
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!editName || !editCategory) {
      setProfileError('Name and category are required.');
      return;
    }

    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const formData = new FormData();
      formData.append('fullName', editName);
      formData.append('category', editCategory);
      formData.append('bio', editBio);
      if (editPic) {
        formData.append('profilePicture', editPic);
      }

      const res = await fetch('/api/profile', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setProfileSuccess('Profile updated successfully!');
        setUser(data.user);
        setEditMode(false);
        router.refresh();
      } else {
        setProfileError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileError('An error occurred.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle artwork image file change
  const handleArtFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArtImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setArtImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle artwork upload submit
  const handleArtUpload = async (e) => {
    e.preventDefault();
    if (!artTitle || !artCategory || !artImage) {
      setArtError('Title, category, and artwork image are required.');
      return;
    }

    setArtLoading(true);
    setArtError('');
    setArtSuccess('');

    try {
      const formData = new FormData();
      formData.append('title', artTitle);
      formData.append('description', artDescription);
      formData.append('category', artCategory);
      if (artPrice) {
        formData.append('price', artPrice);
      }
      formData.append('image', artImage);

      const res = await fetch('/api/artworks', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setArtSuccess('Artwork uploaded successfully!');
        setArtTitle('');
        setArtDescription('');
        setArtPrice('');
        setArtImage(null);
        setArtImagePreview(null);
        
        // Add new artwork to local state
        setArtworks(prev => [data.artwork, ...prev]);
      } else {
        setArtError(data.error || 'Failed to upload artwork.');
      }
    } catch (err) {
      console.error('Error uploading artwork:', err);
      setArtError('An error occurred.');
    } finally {
      setArtLoading(false);
    }
  };

  // Handle artwork deletion
  const handleArtDelete = async (artworkId) => {
    if (!confirm('Are you sure you want to delete this artwork? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/artworks?id=${artworkId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        // Remove from local list
        setArtworks(prev => prev.filter(art => art.id !== artworkId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete artwork.');
      }
    } catch (err) {
      console.error('Error deleting artwork:', err);
      alert('An error occurred.');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '120px 0', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '32px' }}>⏳</div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container fade-in">
      <div className="dashboard-grid">
        {/* Sidebar: Profile Overview / Editing */}
        <aside className="profile-sidebar glass-panel">
          {!editMode ? (
            <div className="profile-header-card">
              <img src={user.profilePicture || '/default-profile.png'} alt={user.fullName} className="profile-avatar-large" />
              <h2 className="profile-name">{user.fullName}</h2>
              <div className="profile-cat">{user.category}</div>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                <span className="badge badge-approved" style={{ fontSize: '9px' }}>{user.role}</span>
                <span className="badge badge-approved" style={{ fontSize: '9px' }}>{user.status}</span>
              </div>

              <p className="profile-bio">{user.bio || 'Add a bio to tell visitors about your artistic philosophy.'}</p>
              
              <button onClick={() => setEditMode(true)} className="btn btn-secondary btn-small" style={{ width: '100%' }}>
                Edit Profile
              </button>
            </div>
          ) : (
            <div className="profile-edit-form">
              <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--color-gold)' }}>Edit Profile</h3>
              
              {profileError && <div className="alert alert-error btn-small" style={{ fontSize: '12px', padding: '8px' }}>{profileError}</div>}
              {profileSuccess && <div className="alert alert-success btn-small" style={{ fontSize: '12px', padding: '8px' }}>{profileSuccess}</div>}

              <form onSubmit={handleProfileUpdate}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
                  <img src={editPicPreview} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-gold)' }} />
                  <div className="file-upload-wrapper">
                    <button type="button" className="file-upload-btn btn-small" style={{ padding: '6px 12px', fontSize: '12px' }}>Change Image</button>
                    <input type="file" className="file-upload-input" accept="image/*" onChange={handleProfileFileChange} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11px' }}>Full Name</label>
                  <input type="text" className="form-control" style={{ padding: '8px 12px', fontSize: '13px' }} value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11px' }}>Art Category</label>
                  <select className="form-control select-control" style={{ padding: '8px 12px', fontSize: '13px' }} value={editCategory} onChange={(e) => setEditCategory(e.target.value)} required>
                    {categories.map((cat) => (
                      <option key={cat} value={cat} style={{ background: 'var(--bg-secondary)', color: 'white' }}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Bio</label>
                  <textarea className="form-control" style={{ padding: '8px 12px', fontSize: '13px', minHeight: '80px' }} value={editBio} onChange={(e) => setEditBio(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary btn-small" style={{ flexGrow: 1 }} disabled={profileLoading}>
                    {profileLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => { setEditMode(false); setEditPicPreview(user.profilePicture); }} className="btn btn-secondary btn-small" style={{ flexGrow: 1 }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </aside>

        {/* Workspace: Upload form and My artworks grid */}
        <section className="dashboard-workspace">
          {/* Section 1: Upload New Artwork */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 className="dashboard-section-title">Upload Artwork</h2>
            
            {artError && <div className="alert alert-error" style={{ marginTop: '16px' }}>{artError}</div>}
            {artSuccess && <div className="alert alert-success" style={{ marginTop: '16px' }}>{artSuccess}</div>}

            <form onSubmit={handleArtUpload} style={{ marginTop: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
                <div>
                  <div className="form-group">
                    <label className="form-label">Artwork Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Whispers of Rizal"
                      value={artTitle}
                      onChange={(e) => setArtTitle(e.target.value)}
                      disabled={artLoading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Artwork Description</label>
                    <textarea
                      className="form-control"
                      placeholder="Describe your creation process, techniques, mediums, or inspirations..."
                      value={artDescription}
                      onChange={(e) => setArtDescription(e.target.value)}
                      disabled={artLoading}
                      style={{ minHeight: '110px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '0' }}>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Category *</label>
                      <select
                        className="form-control select-control"
                        value={artCategory}
                        onChange={(e) => setArtCategory(e.target.value)}
                        disabled={artLoading}
                        required
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat} style={{ background: 'var(--bg-secondary)', color: 'white' }}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Price (Optional, ₱)</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="NFS (Not for Sale)"
                        value={artPrice}
                        onChange={(e) => setArtPrice(e.target.value)}
                        disabled={artLoading}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(245, 176, 65, 0.3)', borderRadius: 'var(--radius-md)', padding: '24px', position: 'relative' }}>
                  {artImagePreview ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <img src={artImagePreview} alt="Artwork Preview" style={{ width: '100%', height: '150px', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
                      <button type="button" onClick={() => { setArtImage(null); setArtImagePreview(null); }} className="btn btn-secondary btn-small" style={{ fontSize: '11px', padding: '4px 8px' }}>Change Image</button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '32px', color: 'var(--color-gold)', marginBottom: '8px' }}>🖼</div>
                      <div className="file-upload-wrapper" style={{ justifyContent: 'center' }}>
                        <button type="button" className="file-upload-btn btn-small">Choose Art File</button>
                        <input
                          type="file"
                          className="file-upload-input"
                          accept="image/*"
                          onChange={handleArtFileChange}
                          disabled={artLoading}
                          required
                        />
                      </div>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Max size 5MB. JPEG, PNG, WEBP.</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" disabled={artLoading}>
                  {artLoading ? 'Uploading Art...' : 'Publish Artwork'}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Manage Artworks */}
          <div>
            <h2 className="dashboard-section-title">My Showcase Portfolios ({artworks.length})</h2>
            
            {artworks.length > 0 ? (
              <div className="manage-art-list" style={{ marginTop: '24px' }}>
                {artworks.map((art) => (
                  <div key={art.id} className="manage-art-card glass-panel">
                    <div className="manage-art-img-wrapper">
                      <img src={art.imagePath} alt={art.title} className="art-img" />
                      <div className="manage-art-actions">
                        <button 
                          onClick={() => handleArtDelete(art.id)} 
                          className="btn btn-danger btn-small"
                          style={{ padding: '6px', borderRadius: '50%', width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', lineHeight: '1' }}
                          title="Delete Artwork"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="manage-art-info">
                      <div className="art-category" style={{ fontSize: '9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{art.category}</span>
                        <span style={{ color: 'var(--color-gold)', fontWeight: '600' }}>
                          {art.price ? `₱${Number(art.price).toLocaleString()}` : 'NFS'}
                        </span>
                      </div>
                      <h4 className="manage-art-title" title={art.title}>{art.title}</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <span>♥ {art.likes || 0} likes</span>
                        <span>{new Date(art.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state glass-panel" style={{ padding: '40px', marginTop: '24px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎨</div>
                <h4>Your Gallery is Empty</h4>
                <p>Upload your first artwork using the form above to showcase it in the home gallery!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
