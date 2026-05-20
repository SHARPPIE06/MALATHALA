'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [session, setSession] = useState(null);
  const [lightboxArt, setLightboxArt] = useState(null);
  const [likeLoading, setLikeLoading] = useState({});

  const categories = [
    'All',
    'Drawing',
    'Painting',
    'Digital Arts',
    'Photography',
    'Video and Films',
    'Sculpture',
    'Others'
  ];

  // Fetch session and artworks
  useEffect(() => {
    async function initPage() {
      try {
        // Fetch session
        const sessionRes = await fetch('/api/profile');
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setSession(sessionData.user);
        }
      } catch (err) {
        console.error('Session fetch failed:', err);
      }

      try {
        // Fetch artworks
        const artRes = await fetch('/api/artworks');
        if (artRes.ok) {
          const artData = await artRes.json();
          setArtworks(artData.artworks);
        }
      } catch (err) {
        console.error('Artworks fetch failed:', err);
      } finally {
        setLoading(false);
      }
    }

    initPage();
  }, []);

  // Handle artwork like toggle
  const handleLike = async (artworkId, e) => {
    if (e) e.stopPropagation(); // Prevent opening lightbox when clicking like
    
    if (!session) {
      alert('You must be logged in to like artworks. Redirecting to login page...');
      router.push('/login');
      return;
    }

    if (likeLoading[artworkId]) return;

    setLikeLoading(prev => ({ ...prev, [artworkId]: true }));

    try {
      const res = await fetch('/api/artworks/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Update local artworks state
        setArtworks(prev => 
          prev.map(art => {
            if (art.id === artworkId) {
              const likedBy = [...(art.likedBy || [])];
              if (data.isLiked) {
                likedBy.push(session.id);
              } else {
                const idx = likedBy.indexOf(session.id);
                if (idx !== -1) likedBy.splice(idx, 1);
              }
              return {
                ...art,
                likes: data.likes,
                likedBy
              };
            }
            return art;
          })
        );

        // Update lightbox art if active
        if (lightboxArt && lightboxArt.id === artworkId) {
          setLightboxArt(prev => {
            const likedBy = [...(prev.likedBy || [])];
            if (data.isLiked) {
              likedBy.push(session.id);
            } else {
              const idx = likedBy.indexOf(session.id);
              if (idx !== -1) likedBy.splice(idx, 1);
            }
            return {
              ...prev,
              likes: data.likes,
              likedBy
            };
          });
        }
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    } finally {
      setLikeLoading(prev => ({ ...prev, [artworkId]: false }));
    }
  };

  // Check if artwork is liked by current user
  const isLikedByUser = (artwork) => {
    if (!session || !artwork.likedBy) return false;
    return artwork.likedBy.includes(session.id);
  };

  // Filter artworks in memory for maximum speed/smoothness
  const filteredArtworks = artworks.filter(art => {
    const matchesCategory = category === 'All' || art.category.toLowerCase() === category.toLowerCase();
    const matchesSearch = 
      art.title.toLowerCase().includes(search.toLowerCase()) ||
      art.artistName.toLowerCase().includes(search.toLowerCase()) ||
      (art.description && art.description.toLowerCase().includes(search.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="container fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">
          <span className="gradient-text">MALATHALA</span>
        </h1>
        <p className="hero-description">
          Discover and celebrate the rich visual arts portfolio of artists from the University of Rizal System, Morong Campus.
        </p>

        {/* Search Bar */}
        <div className="search-wrapper">
          <input
            type="text"
            className="form-control"
            placeholder="Search by artwork title, artist, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderRadius: 'var(--radius-full)', padding: '14px 24px', border: 'var(--border-glass)' }}
          />
        </div>

        {/* Category Filters */}
        <div className="filter-bar">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-tab ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Main Art Gallery */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
          <div className="empty-state-icon loader-spin">⏳</div>
          <p>Curating portfolio galleries...</p>
        </div>
      ) : filteredArtworks.length > 0 ? (
        <div className="art-grid">
          {filteredArtworks.map((art) => (
            <article key={art.id} className="art-card glass-panel" onClick={() => setLightboxArt(art)}>
              <div className="art-img-wrapper" style={{ position: 'relative' }}>
                <img src={art.imagePath} alt={art.title} className="art-img" loading="lazy" />
                {art.price && (
                  <div className="art-card-price-tag">
                    ₱{Number(art.price).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="art-info">
                <span className="art-category">{art.category}</span>
                <h3 className="art-title">{art.title}</h3>
                <p className="art-description">{art.description || 'No description provided.'}</p>
                
                <div className="art-meta">
                  <div className="art-artist">
                    <img 
                      src={art.artistAvatar || '/default-profile.png'} 
                      alt={art.artistName} 
                      className="artist-avatar"
                      onError={(e) => { e.target.src = '/default-profile.png'; }}
                    />
                    <span className="artist-name">{art.artistName}</span>
                  </div>
                  
                  <button 
                    className={`art-likes ${isLikedByUser(art) ? 'liked' : ''}`}
                    onClick={(e) => handleLike(art.id, e)}
                  >
                    <span>♥</span> {art.likes || 0}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state glass-panel">
          <div className="empty-state-icon">🎨</div>
          <h3>No Artworks Found</h3>
          <p>We couldn't find any artworks matching your category or search query.</p>
        </div>
      )}

      {/* Art Lightbox Modal */}
      {lightboxArt && (
        <div className="lightbox active" onClick={() => setLightboxArt(null)}>
          <div className="lightbox-close" onClick={() => setLightboxArt(null)}>×</div>
          
          <div className="lightbox-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-img-wrapper">
              <img src={lightboxArt.imagePath} alt={lightboxArt.title} className="lightbox-img" />
            </div>
            
            <div className="lightbox-details">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <img 
                  src={lightboxArt.artistAvatar || '/default-profile.png'} 
                  alt={lightboxArt.artistName} 
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-gold)' }}
                  onError={(e) => { e.target.src = '/default-profile.png'; }}
                />
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600' }}>{lightboxArt.artistName}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Artist</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="art-category" style={{ fontSize: '11px', margin: 0 }}>{lightboxArt.category}</span>
                {lightboxArt.price ? (
                  <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-gold)' }}>
                    ₱{Number(lightboxArt.price).toLocaleString()}
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Portfolio Only
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '28px', marginBottom: '16px', lineHeight: '1.2', fontFamily: 'var(--font-display)' }}>
                {lightboxArt.title}
              </h2>
              
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: 'auto', paddingBottom: '24px' }}>
                {lightboxArt.description || 'No description provided.'}
              </p>

              <div style={{ borderTop: 'var(--border-light)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Showcased On</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {new Date(lightboxArt.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                <button 
                  className={`art-likes ${isLikedByUser(lightboxArt) ? 'liked' : ''}`}
                  onClick={() => handleLike(lightboxArt.id)}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  <span>♥</span> {lightboxArt.likes || 0}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
