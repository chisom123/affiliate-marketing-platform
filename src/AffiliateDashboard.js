// AFFILIATE DASHBOARD COMPONENT
// Purpose: Main interface for affiliates to create rating links and track earnings
// Features: Authentication, link creation, earnings display, real-time analytics

import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';

// LOGIN/SIGNUP COMPONENT
const AuthForm = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login existing user
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Create new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create affiliate profile in Firestore
        await setDoc(doc(db, 'affiliates', userCredential.user.uid), {
          name: name,
          email: email,
          totalEarnings: 0,
          totalRatings: 0,
          createdAt: new Date(),
          status: 'active'
        });
      }
    } catch (error) {
      setError(error.message);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>{isLogin ? 'Login' : 'Sign Up'} - SocialStar Affiliates</h2>
      
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div style={{ marginBottom: '15px' }}>
            <label>Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
        )}
        
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '10px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
        </button>
      </form>
      
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      
      <p style={{ textAlign: 'center', marginTop: '15px' }}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button 
          onClick={() => setIsLogin(!isLogin)}
          style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}
        >
          {isLogin ? 'Sign Up' : 'Login'}
        </button>
      </p>
    </div>
  );
};

// MAIN DASHBOARD COMPONENT
const Dashboard = ({ user, onLogout }) => {
  const [affiliateData, setAffiliateData] = useState(null);
  const [ratingLinks, setRatingLinks] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(false);

  // Load affiliate data and rating links
  useEffect(() => {
    if (!user) return;

    // Get affiliate profile
    const loadAffiliateData = async () => {
      const affiliateDoc = await getDoc(doc(db, 'affiliates', user.uid));
      if (affiliateDoc.exists()) {
        setAffiliateData(affiliateDoc.data());
      }
    };

    // Real-time listener for rating links
    const unsubscribe = onSnapshot(
      query(collection(db, 'rating_links'), where('affiliateId', '==', user.uid)),
      (snapshot) => {
        const links = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRatingLinks(links);
      }
    );

    loadAffiliateData();
    return () => unsubscribe();
  }, [user]);

  // Create new rating link
  const createRatingLink = async () => {
    if (!newLink.title.trim()) return;
    
    setLoading(true);
    
    try {
      // Generate unique link ID
      const linkId = `${user.uid}_${Date.now()}`;
      
      // Create rating link document
      await addDoc(collection(db, 'rating_links'), {
        affiliateId: user.uid,
        linkId: linkId,
        title: newLink.title,
        description: newLink.description,
        url: `rate.socialstar.com/rate/${user.uid}/${linkId}`,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        totalRatings: 0,
        earnings: 0,
        status: 'active'
      });
      
      // Reset form
      setNewLink({ title: '', description: '' });
      setShowCreateModal(false);
    } catch (error) {
      alert('Error creating link: ' + error.message);
    }
    
    setLoading(false);
  };

  // Copy link to clipboard
  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(`https://${url}`);
    alert('Link copied to clipboard!');
  };

  // Calculate total earnings from all links
  const totalEarnings = ratingLinks.reduce((sum, link) => sum + (link.earnings || 0), 0);
  const totalRatings = ratingLinks.reduce((sum, link) => sum + (link.totalRatings || 0), 0);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '20px' }}>
        <div>
          <h1>SocialStar Affiliates</h1>
          <p>Welcome back, {affiliateData?.name || user.email}!</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Total Earnings</p>
          <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            £{totalEarnings.toFixed(2)}
          </p>
          <button 
            onClick={onLogout}
            style={{ marginTop: '10px', padding: '5px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Total Ratings</h3>
          <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>{totalRatings}</p>
        </div>
        
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Active Links</h3>
          <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
            {ratingLinks.filter(link => link.status === 'active').length}
          </p>
        </div>
        
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Avg per Link</h3>
          <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>
            {ratingLinks.length > 0 ? (totalRatings / ratingLinks.length).toFixed(1) : '0.0'}
          </p>
        </div>
      </div>

      {/* Create New Link Button */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          + Create New Rating Link
        </button>
      </div>

      {/* Create Link Modal */}
      {showCreateModal && (
        <div style={{ 
          position: 'fixed', 
          top: '0', 
          left: '0', 
          right: '0', 
          bottom: '0', 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '30px', 
            borderRadius: '8px', 
            maxWidth: '500px', 
            width: '90%' 
          }}>
            <h3>Create New Rating Link</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label>Story Title:</label>
              <input
                type="text"
                value={newLink.title}
                onChange={(e) => setNewLink({...newLink, title: e.target.value})}
                placeholder="e.g., Beach Day Vibes"
                style={{ width: '100%', padding: '8px', marginTop: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label>Description (optional):</label>
              <textarea
                value={newLink.description}
                onChange={(e) => setNewLink({...newLink, description: e.target.value})}
                placeholder="Describe your story..."
                style={{ width: '100%', padding: '8px', marginTop: '5px', border: '1px solid #ddd', borderRadius: '4px', height: '80px' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={createRatingLink}
                disabled={loading || !newLink.title.trim()}
                style={{ 
                  flex: 1,
                  padding: '10px', 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Creating...' : 'Create Link'}
              </button>
              
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ 
                  flex: 1,
                  padding: '10px', 
                  backgroundColor: '#6c757d', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Links List */}
      <div>
        <h3>Your Rating Links</h3>
        
        {ratingLinks.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <p style={{ color: '#6c757d', fontSize: '18px' }}>No rating links yet.</p>
            <p style={{ color: '#6c757d' }}>Create your first link to start earning!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {ratingLinks.map(link => (
              <div key={link.id} style={{ 
                padding: '20px', 
                border: '1px solid #dee2e6', 
                borderRadius: '8px',
                backgroundColor: 'white'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '20px', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0' }}>{link.title}</h4>
                    <p style={{ margin: '0 0 10px 0', color: '#6c757d', fontSize: '14px' }}>
                      Created: {link.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </p>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6c757d', fontFamily: 'monospace' }}>
                      {link.url}
                    </p>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                      {link.totalRatings || 0}
                    </p>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>ratings</p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold', color: '#28a745' }}>
                      £{(link.earnings || 0).toFixed(2)}
                    </p>
                  </div>
                  
                  <div>
                    <button
                      onClick={() => copyToClipboard(link.url)}
                      style={{ 
                        padding: '8px 16px', 
                        backgroundColor: '#17a2b8', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
                
                {link.status !== 'active' && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px', 
                    backgroundColor: '#f8d7da', 
                    color: '#721c24', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    This link has expired
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// MAIN APP COMPONENT
const AffiliateDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      alert('Error logging out: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <AuthForm />
      )}
    </div>
  );
};

export default AffiliateDashboard;