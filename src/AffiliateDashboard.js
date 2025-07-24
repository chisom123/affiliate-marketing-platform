// AFFILIATE DASHBOARD COMPONENT - UPDATED WITH PAYOUT HISTORY
// Purpose: Main interface for affiliates with payment setup and payout tracking
// Features: Authentication, link creation, earnings display, payment setup, payout history

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
  getDoc,
  updateDoc
} from 'firebase/firestore';
import PaymentSetupModal from './PaymentSetupModal';

// LOGIN/SIGNUP COMPONENT - Updated with dark theme and mobile optimization
const AuthForm = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
          firstName: firstName,
          lastName: lastName,
          email: email,
          totalEarnings: 0,
          totalRatings: 0,
          createdAt: new Date(),
          status: 'active',
          paymentInfo: null,
          payoutHistory: []
        });
      }
    } catch (error) {
      setError(error.message);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #10183C 0%, #1A2245 100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Navigation Bar */}
      <header style={{ 
        backgroundColor: '#1A2245',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ 
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div 
            onClick={() => window.location.href = '/'}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a"
                alt="Star icon"
                style={{
                  width: '30px',
                  height: '30px'
                }}
              />
            </div>
            <h1 style={{ margin: '2px 0px 0px 0px', fontSize: '20px', color: 'white' }}>
              SocialStar Partners
            </h1>
          </div>
          
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
            Partner Dashboard
          </div>
        </div>
      </header>

      {/* Auth Form Container */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <div style={{ 
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#323862',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ 
              color: 'white',
              fontSize: '28px',
              fontWeight: 'bold',
              margin: '0 0 10px 0'
            }}>
              {isLogin ? 'Welcome Back' : 'Join SocialStar'}
            </h2>
            <p style={{ 
              color: 'rgba(255,255,255,0.7)',
              margin: '0',
              fontSize: '16px'
            }}>
              {isLogin ? 'Sign in to your affiliate dashboard' : 'Start earning from your stories today'}
            </p>
          </div>
          
          <div onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {!isLogin && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="First name"
                    style={{ 
                      width: '100%',
                      padding: '16px',
                      backgroundColor: '#1A2245',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                  />
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Last name"
                    style={{ 
                      width: '100%',
                      padding: '16px',
                      backgroundColor: '#1A2245',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                  />
                </div>
              </div>
            )}
            
            <div>
              <label style={{ 
                display: 'block',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                style={{ 
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#1A2245',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                style={{ 
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#1A2245',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              onClick={handleSubmit}
              style={{ 
                width: '100%',
                padding: '16px',
                backgroundColor: loading ? '#666' : '#4169E1',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                marginTop: '8px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#3557C7';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#4169E1';
                  e.target.style.transform = 'translateY(0px)';
                }
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Processing...
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </div>
          
          {error && (
            <div style={{ 
              marginTop: '20px',
              padding: '12px 16px',
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              border: '1px solid rgba(220, 53, 69, 0.3)',
              borderRadius: '8px',
              color: '#ff6b7a',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          <div style={{ 
            textAlign: 'center',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <p style={{ 
              color: 'rgba(255,255,255,0.7)',
              margin: '0 0 16px 0',
              fontSize: '14px'
            }}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              style={{ 
                background: 'none',
                border: 'none',
                color: '#4169E1',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'underline',
                padding: '8px 0'
              }}
              onMouseEnter={(e) => e.target.style.color = '#3557C7'}
              onMouseLeave={(e) => e.target.style.color = '#4169E1'}
            >
              {isLogin ? 'Create New Account' : 'Sign In Instead'}
            </button>
          </div>

          {!isLogin && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: 'rgba(65, 105, 225, 0.1)',
              border: '1px solid rgba(65, 105, 225, 0.3)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <p style={{ 
                color: 'rgba(255,255,255,0.8)',
                margin: '0',
                fontSize: '13px',
                lineHeight: '1.5'
              }}>
                🎉 <strong>Free to join!</strong> Start earning money from your Instagram stories immediately after signup.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        input::placeholder {
          color: rgba(255,255,255,0.5);
        }

        @media (max-width: 480px) {
          .auth-container {
            margin: 20px;
            padding: 32px 24px;
          }
        }
      `}</style>
    </div>
  );
};

// MAIN DASHBOARD COMPONENT
const Dashboard = ({ user, onLogout }) => {
  const [affiliateData, setAffiliateData] = useState(null);
  const [ratingLinks, setRatingLinks] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFirstEarningsPrompt, setShowFirstEarningsPrompt] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [hasShownFirstEarningsPrompt, setHasShownFirstEarningsPrompt] = useState(false);

  // Load affiliate data and rating links
  useEffect(() => {
    if (!user) return;

    // Get affiliate profile
    const loadAffiliateData = async () => {
      const affiliateDoc = await getDoc(doc(db, 'affiliates', user.uid));
      if (affiliateDoc.exists()) {
        const data = affiliateDoc.data();
        setAffiliateData(data);
        
        // Set payout history from affiliate document
        if (data.payoutHistory) {
          setPayoutHistory([...data.payoutHistory].reverse()); // Most recent first
        }
        
        // Check if we should show first earnings prompt
        if (data.totalEarnings > 0 && !data.paymentInfo && !hasShownFirstEarningsPrompt) {
          setShowFirstEarningsPrompt(true);
          setHasShownFirstEarningsPrompt(true);
        }
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
  }, [user, hasShownFirstEarningsPrompt]);

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
        url: `partners.socialstarapp.com/rate/${user.uid}/${linkId}`,
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

  // Handle payment info saved
  const handlePaymentInfoSaved = () => {
    // Refresh affiliate data
    const loadAffiliateData = async () => {
      const affiliateDoc = await getDoc(doc(db, 'affiliates', user.uid));
      if (affiliateDoc.exists()) {
        setAffiliateData(affiliateDoc.data());
      }
    };
    loadAffiliateData();
  };

// Calculate total earnings from all links (current unpaid balance)
const totalEarnings = ratingLinks.reduce((sum, link) => sum + (link.earnings || 0), 0);
const totalRatings = ratingLinks.reduce((sum, link) => sum + (link.totalRatings || 0), 0);

// Calculate total amount actually paid out from payout history
const totalPaidOut = payoutHistory.reduce((sum, p) => sum + p.amount, 0);

// Calculate lifetime earnings (paid out + current balance)
const lifetimeEarnings = totalPaidOut + totalEarnings;

  // Payment status component
  const PaymentStatus = () => {
    if (!affiliateData?.paymentInfo) {
      return (
        <div style={{ 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 5px 0', color: '#856404' }}>⚠️ Payment Setup Required</h4>
              <p style={{ margin: '0', color: '#856404' }}>
                Set up your payment information to receive earnings
              </p>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Setup Now
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ 
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: '0 0 5px 0', color: '#155724' }}>✅ Payment Setup Complete</h4>
            <p style={{ margin: '0', color: '#155724' }}>
              {affiliateData.paymentInfo.method === 'paypal' 
                ? `PayPal: ${affiliateData.paymentInfo.details.email}`
                : `Bank: ${affiliateData.paymentInfo.details.bankName}`
              }
            </p>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Edit
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '20px' }}>
        <div>
          <h1>SocialStar Affiliates</h1>
          <p>Welcome back, {affiliateData?.name || user.email}!</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Current Balance</p>
          <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            £{totalEarnings.toFixed(2)}
          </p>
          {affiliateData?.lastPayoutAmount && (
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
              Last payout: £{affiliateData.lastPayoutAmount.toFixed(2)} on{' '}
              {affiliateData.lastPayoutDate?.toDate?.()?.toLocaleDateString()}
            </p>
          )}
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              style={{ padding: '5px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Settings
            </button>
            <button 
              onClick={onLogout}
              style={{ padding: '5px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={{ 
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Settings</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Payment Information</h4>
            {affiliateData?.paymentInfo ? (
              <div>
                <p style={{ margin: '0 0 10px 0' }}>
                  <strong>Method:</strong> {affiliateData.paymentInfo.method === 'paypal' ? 'PayPal' : 'Bank Transfer'}
                </p>
                <p style={{ margin: '0 0 10px 0' }}>
                  <strong>Details:</strong> {
                    affiliateData.paymentInfo.method === 'paypal' 
                      ? affiliateData.paymentInfo.details.email
                      : `${affiliateData.paymentInfo.details.bankName} - ${affiliateData.paymentInfo.details.accountNumber.slice(-4)}`
                  }
                </p>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Edit Payment Info
                </button>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 10px 0', color: '#6c757d' }}>
                  No payment information set up yet.
                </p>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Setup Payment Info
                </button>
              </div>
            )}
          </div>

          {/* Payout History */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0' }}>Payout History</h4>
            {payoutHistory.length === 0 ? (
              <p style={{ margin: '0', color: '#6c757d' }}>
                No payouts yet. Your first payout will appear here once processed.
              </p>
            ) : (
              <div style={{ 
                backgroundColor: 'white',
                borderRadius: '6px',
                border: '1px solid #dee2e6',
                overflow: 'hidden'
              }}>
                {payoutHistory.map((payout, index) => (
                  <div key={index} style={{ 
                    padding: '15px',
                    borderBottom: index < payoutHistory.length - 1 ? '1px solid #eee' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#28a745' }}>
                        £{payout.amount.toFixed(2)}
                      </p>
                      <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>
                        {payout.method === 'paypal' ? '💙 PayPal' : '🏦 Bank Transfer'} • 
                        {payout.processedAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#adb5bd' }}>
                        Batch: {payout.batchId}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: '#d4edda',
                        color: '#155724'
                      }}>
                        ✅ Paid
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 style={{ margin: '0 0 10px 0' }}>Account Information</h4>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Name:</label>
              <input
                type="text"
                value={affiliateData?.name || ''}
                onChange={(e) => setAffiliateData(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '200px',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  marginRight: '10px'
                }}
              />
              <button
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'affiliates', user.uid), {
                      name: affiliateData.name
                    });
                    alert('Name updated successfully!');
                  } catch (error) {
                    alert('Error updating name: ' + error.message);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Update
              </button>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <p style={{ margin: '0 0 5px 0' }}><strong>Email:</strong> {affiliateData?.email}</p>
              <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>
                This is your login email and cannot be changed
              </p>
            </div>
            
            <p style={{ margin: '0 0 5px 0' }}><strong>Member Since:</strong> {affiliateData?.createdAt?.toDate?.()?.toLocaleDateString()}</p>
            <p style={{ margin: '0' }}><strong>Account Status:</strong> <span style={{ color: '#28a745' }}>Active</span></p>
          </div>
        </div>
      )}

      {/* Payment Status */}
      <PaymentStatus />

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Current Balance</h3>
          <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
            £{totalEarnings.toFixed(2)}
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
            Unpaid earnings
          </p>
        </div>
        
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Total Earned</h3>
          <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
            £{lifetimeEarnings.toFixed(2)}
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
            Lifetime earnings
          </p>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Total Paid Out</h3>
          <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#6c757d' }}>
            £{totalPaidOut.toFixed(2)}
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
            Already received
          </p>
        </div>
        
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Total Ratings</h3>
          <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>{totalRatings}</p>
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

      {/* First Earnings Celebration Modal */}
      {showFirstEarningsPrompt && (
        <div style={{ 
          position: 'fixed', 
          top: '0', 
          left: '0', 
          right: '0', 
          bottom: '0', 
          backgroundColor: 'rgba(0,0,0,0.7)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '40px', 
            borderRadius: '15px', 
            maxWidth: '400px', 
            width: '90%',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ color: '#28a745', marginBottom: '15px' }}>Congratulations!</h2>
            <p style={{ marginBottom: '20px', fontSize: '18px' }}>
              You just earned your first money with SocialStar!
            </p>
            <p style={{ marginBottom: '30px', color: '#6c757d' }}>
              Set up your payment information so we can send you your earnings.
            </p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowFirstEarningsPrompt(false);
                  setShowPaymentModal(true);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Setup Payments
              </button>
              
              <button
                onClick={() => setShowFirstEarningsPrompt(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Setup Modal */}
      {showPaymentModal && (
        <PaymentSetupModal
          user={user}
          onClose={() => setShowPaymentModal(false)}
          onPaymentInfoSaved={handlePaymentInfoSaved}
        />
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