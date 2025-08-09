// AFFILIATE DASHBOARD COMPONENT - UPDATED WITH PAYOUT HISTORY
// Purpose: Main interface for affiliates with payment setup and payout tracking
// Features: Authentication, link creation, earnings display, payment setup, payout history

import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
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
  updateDoc,
  getDocs
} from 'firebase/firestore';
import PaymentSetupModal from './PaymentSetupModal';

// LOGIN/SIGNUP COMPONENT - Updated with dark theme and mobile optimization
const AuthForm = ({ onLogin }) => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.state?.authMode === 'login');
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
        backgroundColor: '#1A2245'
      }}>
        <div style={{ 
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '17px 20px',
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
            <h1 style={{ margin: '2px 0px 0px 0px', fontSize: '18px', color: 'white' }}>
              SocialStar Partners
            </h1>
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
          backgroundColor: '#1A2245',
          borderRadius: '5px',
          padding: '40px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ 
              color: 'white',
              fontSize: '25px',
              fontWeight: 'bold',
              margin: '0 0 10px 0'
            }}>
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </h2>
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
                      backgroundColor: '#323862',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '5px',
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
                      backgroundColor: '#323862',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '5px',
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
                  backgroundColor: '#323862',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '5px',
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
                  backgroundColor: '#323862',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '5px',
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
                borderRadius: '200px',
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
              borderRadius: '5px',
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
                color: '#fff',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                padding: '8px 0'
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
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
  const [selectedLinkForInstructions, setSelectedLinkForInstructions] = useState(null);
  const [linkAverageRatings, setLinkAverageRatings] = useState({});

  // Add this function to calculate average ratings for all links
  const calculateAllLinkAverages = async () => {
    if (ratingLinks.length === 0) return;
    
    const averages = {};
    
    for (const link of ratingLinks) {
      try {
        const ratingsQuery = query(
          collection(db, 'ratings'),
          where('linkIdString', '==', link.linkId)
        );
        const ratingsSnapshot = await getDocs(ratingsQuery);
        
        if (!ratingsSnapshot.empty) {
          const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating);
          const total = ratings.reduce((sum, rating) => sum + rating, 0);
          const average = total / ratings.length;
          
          averages[link.linkId] = {
            average: average,
            count: ratings.length
          };
        } else {
          averages[link.linkId] = {
            average: 0,
            count: 0
          };
        }
      } catch (error) {
        console.error(`Error calculating average for link ${link.linkId}:`, error);
        averages[link.linkId] = {
          average: 0,
          count: 0
        };
      }
    }
    
    setLinkAverageRatings(averages);
  };

  // Add this useEffect to calculate averages when ratingLinks change
  useEffect(() => {
    if (ratingLinks.length > 0) {
      calculateAllLinkAverages();
    }
  }, [ratingLinks]);

  // ADD THIS MISSING useEffect AND FUNCTIONS:
  useEffect(() => {
    if (!user) return;

    window.scrollTo(0, 0);

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
        url: `rate.socialstarapp.com/rate/${user.uid}/${linkId}`,
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
    // The success feedback is now handled in the modal button click
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

  // NOW your return statement starts here...
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #10183C 0%, #1A2245 100%)',
      color: 'white'
    }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: '#1A2245',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ 
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '17px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
            <div>
              <h1 style={{ 
                margin: '2px 0px 0px 0px', 
                fontSize: '18px', 
                color: 'white',
                fontWeight: 'bold'
              }}>
                SocialStar Partners
              </h1>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                padding: '0',
                backgroundColor: 'transparent',
                color: 'white',
                border: '0',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Settings 
                size={28}
                />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '20px',
        minHeight: 'calc(100vh - 100px)'
      }}>
        
        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '20px', 
          marginBottom: '40px' 
        }}>
          <div style={{ 
            padding: '25px', 
            backgroundColor: '#323862', 
            borderRadius: '5px', 
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              margin: '0 0 10px 0', 
              color: 'rgba(255,255,255,0.8)',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              Current Balance
            </h3>
            <p style={{ 
              margin: '0', 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#fff'
            }}>
              ${totalEarnings.toFixed(2)}
            </p>
            <p style={{ 
              margin: '8px 0 0 0', 
              fontSize: '12px', 
              color: 'rgba(255,255,255,0.6)'
            }}>
              Unpaid earnings
            </p>
          </div>

          <div style={{ 
            padding: '25px', 
            backgroundColor: '#323862', 
            borderRadius: '5px', 
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              margin: '0 0 10px 0', 
              color: 'rgba(255,255,255,0.8)',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              Total Paid Out
            </h3>
            <p style={{ 
              margin: '0', 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#fff'
            }}>
              ${totalPaidOut.toFixed(2)}
            </p>
            <p style={{ 
              margin: '8px 0 0 0', 
              fontSize: '12px', 
              color: 'rgba(255,255,255,0.6)'
            }}>
              Already received
            </p>
          </div>
          
          <div style={{ 
            padding: '25px', 
            backgroundColor: '#323862', 
            borderRadius: '5px', 
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              margin: '0 0 10px 0', 
              color: 'rgba(255,255,255,0.8)',
              fontSize: '16px',
              fontWeight: '500'
            }}>
             Earnings Per Rating
            </h3>
            <p style={{ 
              margin: '0', 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#fff'
            }}>
              $0.10
            </p>
            <p style={{ 
              margin: '8px 0 0 0', 
              fontSize: '12px', 
              color: 'rgba(255,255,255,0.6)'
            }}>
              Per story rating
            </p>
          </div>
          
          <div style={{ 
            padding: '25px', 
            backgroundColor: '#323862', 
            borderRadius: '5px', 
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              margin: '0 0 10px 0', 
              color: 'rgba(255,255,255,0.8)',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              Total Ratings Received
            </h3>
            <p style={{ 
              margin: '0', 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#fff'
            }}>
              {totalRatings}
            </p>
            <p style={{ 
              margin: '8px 0 0 0', 
              fontSize: '12px', 
              color: 'rgba(255,255,255,0.6)'
            }}>
              Story ratings
            </p>
          </div>
        </div>

{/* Settings Modal */}
{showSettings && (
  <div 
    style={{ 
      position: 'fixed', 
      top: '0', 
      left: '0', 
      right: '0', 
      bottom: '0', 
      backgroundColor: 'rgba(16, 24, 60, 0.95)', 
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
      overflowY: 'auto'
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowSettings(false);
      }
    }}
  >
    <div 
      style={{ 
        backgroundColor: '#1A2245',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '640px',
        margin: 'auto',
        boxShadow: '0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        position: 'relative',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ 
        padding: '32px 32px 24px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'relative'
      }}>
        <button
          onClick={() => setShowSettings(false)}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: '12px',
            width: '40px',
            height: '40px',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(255,255,255,0.12)';
            e.target.style.color = 'white';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
            e.target.style.color = 'rgba(255,255,255,0.7)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          ×
        </button>
        
        <div style={{ textAlign: 'center', paddingRight: '56px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: 'rgba(65, 105, 225, 0.15)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            border: '1px solid rgba(65, 105, 225, 0.2)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="3" stroke="#4169E1" strokeWidth="2"/>
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="#4169E1" strokeWidth="2"/>
            </svg>
          </div>
          
          <h2 style={{ 
            margin: '0 0 8px 0',
            color: 'white',
            fontSize: '28px',
            fontWeight: '700',
            letterSpacing: '-0.02em'
          }}>
            Settings
          </h2>
          
          <p style={{ 
            margin: '0',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            Manage your account and payment preferences
          </p>
        </div>
      </div>
      
      {/* Content */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto'
      }}>
        {/* Payment Information Section */}
        <div style={{ 
          padding: '32px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'rgba(65, 105, 225, 0.15)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(65, 105, 225, 0.2)'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="#4169E1" strokeWidth="2"/>
                <line x1="1" y1="10" x2="23" y2="10" stroke="#4169E1" strokeWidth="2"/>
              </svg>
            </div>
            <h3 style={{
              margin: '0',
              color: 'white',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              Payment Information
            </h3>
          </div>
          
          {affiliateData?.paymentInfo?.method === 'global_payouts' ? (
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              {/* Payment Method Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: 'rgba(65, 105, 225, 0.15)',
                    borderRadius: '20px',
                    border: '1px solid rgba(65, 105, 225, 0.2)',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#4169E1'
                  }}>
                    Bank Transfer
                  </div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    backgroundColor: affiliateData.paymentInfo.verified ? 'rgba(40, 167, 69, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                    color: affiliateData.paymentInfo.verified ? '#28a745' : '#ffc107',
                    border: `1px solid ${affiliateData.paymentInfo.verified ? 'rgba(40, 167, 69, 0.2)' : 'rgba(255, 193, 7, 0.2)'}`
                  }}>
                    {affiliateData.paymentInfo.verified ? '✓ Verified' : 'Pending Verification'}
                  </span>
                </div>
              </div>

              {/* Account Details */}
              <div style={{
                display: 'grid',
                gap: '16px',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <span style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px'
                  }}>
                    Account Holder
                  </span>
                  <span style={{
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    {affiliateData.paymentInfo.details.fullName}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <span style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px'
                  }}>
                    Account Number
                  </span>
                  <span style={{
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", monospace'
                  }}>
                    ****{affiliateData.paymentInfo.details.bankAccount?.accountNumber?.slice(-4) || 'XXXX'}
                  </span>
                </div>

                {affiliateData.paymentInfo.details.country === 'US' && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <span style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '14px'
                    }}>
                      Routing Number
                    </span>
                    <span style={{
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", monospace'
                    }}>
                      ****{affiliateData.paymentInfo.details.bankAccount?.routingNumber?.slice(-4) || 'XXXX'}
                    </span>
                  </div>
                )}

                {affiliateData.paymentInfo.details.country === 'GB' && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <span style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '14px'
                    }}>
                      Sort Code
                    </span>
                    <span style={{
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", monospace'
                    }}>
                      {affiliateData.paymentInfo.details.bankAccount?.sortCode || 'XX-XX-XX'}
                    </span>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <span style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px'
                  }}>
                    Location
                  </span>
                  <span style={{
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    {affiliateData.paymentInfo.details.address?.city}, {affiliateData.paymentInfo.details.address?.country}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setShowPaymentModal(true)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  backgroundColor: '#4169E1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#3557C7';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#4169E1';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Edit Payment Information
              </button>
            </div>
          ) : (
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                backgroundColor: 'rgba(65, 105, 225, 0.15)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                border: '1px solid rgba(65, 105, 225, 0.2)'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="#4169E1" strokeWidth="2"/>
                  <line x1="1" y1="10" x2="23" y2="10" stroke="#4169E1" strokeWidth="2"/>
                </svg>
              </div>
              <h4 style={{
                margin: '0 0 12px 0',
                color: 'white',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                Bank Account Setup Required
              </h4>
              <p style={{
                margin: '0 0 24px 0',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '15px',
                lineHeight: '1.5'
              }}>
                Set up your bank account to receive earnings directly. We support US and UK bank accounts with instant transfers.
              </p>
              
              <button
                onClick={() => setShowPaymentModal(true)}
                style={{
                  padding: '14px 28px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#218838';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#28a745';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Setup Bank Account
              </button>
            </div>
          )}
        </div>

        {/* Payout History Section */}
        <div style={{ 
          padding: '32px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'rgba(40, 167, 69, 0.15)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(40, 167, 69, 0.2)'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#28a745" strokeWidth="2"/>
                <polyline points="12,6 12,12 16,14" stroke="#28a745" strokeWidth="2"/>
              </svg>
            </div>
            <h3 style={{ 
              margin: '0',
              color: 'white',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              Payout History
            </h3>
          </div>
          
          {payoutHistory.length === 0 ? (
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: '16px',
              padding: '40px',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
                  <path d="M16 12l-4-4-4 4" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
                  <path d="M12 16V8" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
                </svg>
              </div>
              <p style={{ 
                margin: '0', 
                color: 'rgba(255,255,255,0.6)',
                fontSize: '15px',
                lineHeight: '1.5'
              }}>
                No payouts yet. Your first payout will appear here once processed.
              </p>
            </div>
          ) : (
            <div style={{ 
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden'
            }}>
              {payoutHistory.map((payout, index) => (
                <div key={index} style={{ 
                  padding: '20px 24px',
                  borderBottom: index < payoutHistory.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <span style={{ 
                        fontSize: '18px',
                        fontWeight: '700', 
                        color: '#4169E1'
                      }}>
                        ${payout.amount.toFixed(2)}
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: 'rgba(40, 167, 69, 0.15)',
                        color: '#28a745',
                        border: '1px solid rgba(40, 167, 69, 0.2)'
                      }}>
                        ✓ Paid
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: payout.method === 'paypal' ? 'rgba(0, 48, 135, 0.15)' : 'rgba(65, 105, 225, 0.15)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: payout.method === 'paypal' ? '#003087' : '#4169E1',
                        fontWeight: '500'
                      }}>
                        {payout.method === 'paypal' ? 'PayPal' : 'Bank Transfer'}
                      </span>
                      <span style={{ 
                        fontSize: '13px', 
                        color: 'rgba(255,255,255,0.7)'
                      }}>
                        {payout.processedAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
                      </span>
                    </div>
                    <p style={{ 
                      margin: '0', 
                      fontSize: '11px', 
                      color: 'rgba(255,255,255,0.5)',
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", monospace'
                    }}>
                      Batch: {payout.batchId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Information Section */}
        <div style={{ padding: '32px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'rgba(255, 193, 7, 0.15)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 193, 7, 0.2)'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#ffc107" strokeWidth="2"/>
                <circle cx="12" cy="7" r="4" stroke="#ffc107" strokeWidth="2"/>
              </svg>
            </div>
            <h3 style={{ 
              margin: '0',
              color: 'white',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              Account Information
            </h3>
          </div>
          
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            {/* Name Update Form */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: 'white',
                    fontSize: '14px'
                  }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    value={affiliateData?.firstName || ''}
                    onChange={(e) => setAffiliateData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter your first name"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4169E1';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: 'white',
                    fontSize: '14px'
                  }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={affiliateData?.lastName || ''}
                    onChange={(e) => setAffiliateData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter your last name"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4169E1';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                    }}
                  />
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'affiliates', user.uid), {
                      firstName: affiliateData.firstName,
                      lastName: affiliateData.lastName
                    });
                    // Show success feedback
                    const event = window.event;
                    if (event && event.target) {
                      const btn = event.target;
                      const originalText = btn.textContent;
                      btn.textContent = '✓ Updated!';
                      btn.style.backgroundColor = '#28a745';
                      setTimeout(() => {
                        btn.textContent = originalText;
                        btn.style.backgroundColor = '#4169E1';
                      }, 2000);
                    }
                  } catch (error) {
                    alert('Error updating name: ' + error.message);
                  }
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#4169E1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!e.target.textContent.includes('Updated')) {
                    e.target.style.backgroundColor = '#3557C7';
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.textContent.includes('Updated')) {
                    e.target.style.backgroundColor = '#4169E1';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                Update Name
              </button>
            </div>
            
            {/* Account Details Display */}
            <div style={{ 
              display: 'grid', 
              gap: '16px',
              fontSize: '14px'
            }}>
              <div style={{ 
                padding: '16px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                    Email Address
                  </span>
                </div>
                <span style={{ color: 'white', fontSize: '15px' }}>
                  {affiliateData?.email}
                </span>
                <p style={{ 
                  margin: '8px 0 0 0', 
                  fontSize: '12px', 
                  color: 'rgba(255,255,255,0.5)',
                  fontStyle: 'italic'
                }}>
                  This is your login email and cannot be changed
                </p>
              </div>
              
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <div style={{ 
                  padding: '16px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                      Member Since
                    </span>
                  </div>
                  <span style={{ color: 'white', fontSize: '15px' }}>
                    {affiliateData?.createdAt?.toDate?.()?.toLocaleDateString()}
                  </span>
                </div>
                
                <div style={{ 
                  padding: '16px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                      Account Status
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#28a745',
                      borderRadius: '50%'
                    }}></div>
                    <span style={{ color: '#28a745', fontWeight: '600', fontSize: '15px' }}>
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        padding: '24px 32px 32px 32px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px'
      }}>
        <button 
          onClick={onLogout}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#c82333';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#dc3545';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          Logout
        </button>
      </div>
      
      {/* Mobile Responsive Styles */}
      <style>{`
        input::placeholder {
          color: rgba(255,255,255,0.5);
        }
        
        @media (max-width: 640px) {
          .settings-section {
            padding: 24px !important;
          }
          .settings-header {
            padding: 24px 24px 20px 24px !important;
          }
          .settings-footer {
            padding: 20px 24px 24px 24px !important;
            flex-direction: column;
          }
          .settings-footer button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  </div>
)}

        {/* Create New Link Button */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <button
            onClick={async () => {
              setLoading(true);
              
              try {
                // Generate unique link ID
                const linkId = `${user.uid}_${Date.now()}`;
                
                // Auto-generate link name based on existing links count
                const linkNumber = ratingLinks.length + 1;
                const autoTitle = `Rating Link #${linkNumber}`;
                
                // Create rating link document
                await addDoc(collection(db, 'rating_links'), {
                  affiliateId: user.uid,
                  linkId: linkId,
                  title: autoTitle,
                  description: '',
                  url: `rate.socialstarapp.com/rate/${user.uid}/${linkId}`,
                  createdAt: new Date(),
                  expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
                  totalRatings: 0,
                  earnings: 0,
                  status: 'active'
                });
                
                // Scroll to the rating links section after creating the link
                setTimeout(() => {
                  const ratingLinksSection = document.getElementById('rating-links-section');
                  if (ratingLinksSection) {
                    ratingLinksSection.scrollIntoView({ 
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }
                }, 500); // Small delay to ensure the new link is rendered
                
              } catch (error) {
                alert('Error creating link: ' + error.message);
              }
              
              setLoading(false);
            }}
            disabled={loading}
            style={{ 
              padding: '16px 32px', 
              backgroundColor: loading ? '#666' : '#4169E1', 
              color: 'white', 
              border: 'none', 
              borderRadius: '200px', 
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Creating Link...
              </>
            ) : (
              'Create New Rating Link'
            )}
          </button>
        </div>

        {/* Payment Setup Modal */}
        {showPaymentModal && (
          <PaymentSetupModal
            user={user}
            onClose={() => setShowPaymentModal(false)}
            onPaymentInfoSaved={handlePaymentInfoSaved}
          />
        )}

        {/* Add the spin animation CSS */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          input::placeholder, textarea::placeholder {
            color: rgba(255,255,255,0.5);
          }
        `}</style>

{/* Rating Links List */}
<div id="rating-links-section">
  <h3 style={{ 
    margin: '0 0 25px 0',
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
    textAlign: 'left'
  }}>
    Your Rating Links
  </h3>
  
  {ratingLinks.length === 0 ? (
    <div style={{ 
      textAlign: 'center', 
      padding: '60px 20px', 
      backgroundColor: '#323862',
      borderRadius: '5px',
      border: '2px dashed rgba(255,255,255,0.2)',
      margin: '0 auto'
    }}>
      <p style={{ 
        color: 'rgba(255,255,255,0.8)', 
        fontSize: '18px',
        margin: '0 0 10px 0',
        fontWeight: '600'
      }}>
        No rating links yet
      </p>
      <p style={{ 
        color: 'rgba(255,255,255,0.6)',
        fontSize: '16px',
        margin: '0'
      }}>
        Create your first link to start earning
      </p>
    </div>
  ) : (
    <div 
      className="rating-links-grid"
      style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 280px))',
        gap: '16px',
        justifyContent: 'start'
      }}
    >

      <style jsx>{`
        @media (max-width: 600px) {
          .rating-links-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {[...ratingLinks]
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime; // Newest first
        })
        .map(link => {
          // Determine if link is active based on expiration time
          const isActive = link.expiresAt?.toDate?.() > new Date();
          const linkStatus = isActive ? 'active' : 'expired';
          
          // Get average rating data for this link
          const averageData = linkAverageRatings[link.linkId] || { average: 0, count: 0 };
          const hasRatings = averageData.count > 0;
          
          return (
          <div key={link.id} style={{ 
            padding: '16px 20px', 
            backgroundColor: '#323862',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '5px',
            transition: 'all 0.2s ease',
            height: 'fit-content'
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '12px',
              height: '100%'
            }}>
              {/* Header with title and status */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ 
                    margin: '0 0 5px 0',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    wordBreak: 'break-word'
                  }}>
                    {link.title}
                  </h4>
                  <p style={{ 
                    margin: '0', 
                    color: 'rgba(255,255,255,0.6)', 
                    fontSize: '12px' 
                  }}>
                    {(() => {
                      const createdDate = link.createdAt?.toDate?.() || new Date();
                      const now = new Date();
                      const diffMs = now - createdDate;
                      const diffMins = Math.floor(diffMs / (1000 * 60));
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      const diffWeeks = Math.floor(diffDays / 7);
                      const diffMonths = Math.floor(diffDays / 30);
                      
                      if (diffMins < 1) return 'Just now';
                      if (diffMins < 60) return `${diffMins}m ago`;
                      if (diffHours < 24) return `${diffHours}h ago`;
                      if (diffDays < 7) return `${diffDays}d ago`;
                      if (diffWeeks < 4) return `${diffWeeks}w ago`;
                      if (diffMonths < 12) return `${diffMonths}mo ago`;
                      return `${Math.floor(diffMonths / 12)}y ago`;
                    })()}
                  </p>
                </div>
                
                {/* Status Text */}
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  backgroundColor: isActive ? '#28a745' : '#dc3545',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '5px',
                  flexShrink: 0
                }}>
                  {isActive ? 'Active' : 'Expired'}
                </div>
              </div>
              {/* Content that pushes button to bottom */}
              <div style={{ flex: 1 }}>
                {/* Earnings Display */}
                <div style={{ 
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '5px',
                  padding: '8px 10px',
                  textAlign: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>
                    ${(link.earnings || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '5px', color: 'rgba(255,255,255,0.6)' }}>
                    earned
                  </div>
                </div>

                {/* Average Rating Display - Always show */}
                <div style={{ 
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '5px',
                  border: '0',
                  marginBottom: '12px'
                }}>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ 
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: hasRatings ? '#ffc107' : 'rgba(255,255,255,0.4)'
                    }}>
                      {averageData.average.toFixed(1)}
                    </div>
                    <div style={{ 
                      display: 'flex',
                      gap: '1px'
                    }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          style={{
                            fontSize: '14px',
                            color: hasRatings && star <= Math.round(averageData.average) ? '#ffc107' : '#dee2e6'
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '12px',
                    margin: '0',
                    textAlign: 'center'
                  }}>
                    Average from {averageData.count} rating{averageData.count !== 1 ? 's' : ''}
                  </p>
                </div>
                
              </div>
              
              {/* Full width button at bottom */}
              <button
                onClick={isActive ? () => setSelectedLinkForInstructions(link) : undefined}
                disabled={!isActive}
                style={{ 
                  width: '100%',
                  padding: '12px', 
                  backgroundColor: isActive ? '#4169E1' : 'rgba(255,255,255,0.1)', 
                  color: isActive ? 'white' : 'rgba(255,255,255,0.4)', 
                  border: 'none', 
                  borderRadius: '200px',
                  cursor: isActive ? 'pointer' : 'not-allowed',
                  fontSize: '15px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  marginTop: 'auto'
                }}
                onMouseEnter={(e) => {
                  if (isActive) {
                    e.target.style.backgroundColor = '#3557C7';
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isActive) {
                    e.target.style.backgroundColor = '#4169E1';
                    e.target.style.transform = 'translateY(0px)';
                  }
                }}
              >
                Use Link
              </button>
            </div>
          </div>
        )})}
    </div>
  )}
</div>

{/* Share Instructions Modal */}
{selectedLinkForInstructions && (
  <div 
    style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(16, 24, 60, 0.95)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
      overflowY: 'auto'
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setSelectedLinkForInstructions(null);
      }
    }}
  >
    <div 
      style={{ 
        backgroundColor: '#1A2245',
        borderRadius: '5px',
        width: '100%',
        maxWidth: '560px',
        margin: 'auto',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ 
        padding: '32px 32px 24px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'relative'
      }}>
        <button
          onClick={() => setSelectedLinkForInstructions(null)}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'transparent',
            border: 'none',
            borderRadius: '12px',
            width: '40px',
            height: '40px',
            color: 'rgba(255,255,255,0.7)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
        >
          ×
        </button>
        <br></br>
        
        <div style={{ textAlign: 'center', paddingRight: '0px' }}>
          
          <h2 style={{ 
              margin: '0 0 8px 0',
              color: 'white',
              fontSize: '24px',
              fontWeight: '700',
              letterSpacing: '-0.02em'
          }}>
            Use Link
          </h2>
        </div>
      </div>
      
      {/* Content */}
      <div style={{ 
        padding: '0',
        flex: 1,
        overflowY: 'auto'
      }}>
        {/* Step 1 */}
        <div style={{ 
          padding: '32px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ 
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#28a745',
              borderRadius: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: '700',
              color: 'white',
              flexShrink: 0,
              transition: 'all 0.3s ease'
            }}>
              1
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{ 
                margin: '0 0 12px 0',
                color: 'white',
                fontSize: '20px',
                fontWeight: '600'
              }}>
                Copy Link
              </h3>
              
              <p style={{ 
                margin: '0 0 20px 0',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '15px',
                lineHeight: '1.6'
              }}>
                Copy your unique rating link
              </p>
              
              {/* Link Copy Section */}
              <div style={{ 
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: '5px',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderRadius: '5px',
                  padding: '16px',
                  marginBottom: '16px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", monospace',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.8)',
                  wordBreak: 'break-all',
                  lineHeight: '1.4'
                }}>
                  https://{selectedLinkForInstructions.url}
                </div>
                
                <button
                  onClick={(event) => {
                    copyToClipboard(selectedLinkForInstructions.url);
                    // Show temporary feedback
                    const btn = event.target;
                    const originalText = btn.textContent;
                    btn.textContent = 'Link Copied';
                    btn.style.backgroundColor = '#28a745';
                    setTimeout(() => {
                      btn.textContent = originalText;
                      btn.style.backgroundColor = '#4169E1';
                    }, 2000);
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    backgroundColor: '#4169E1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '200px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.textContent.includes('Copied')) {
                      e.target.style.backgroundColor = '#3557C7';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.textContent.includes('Copied')) {
                      e.target.style.backgroundColor = '#4169E1';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Step 2 */}
        <div style={{ 
          padding: '32px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ 
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#28a745',
              borderRadius: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: '700',
              color: 'white',
              flexShrink: 0,
              transition: 'all 0.3s ease'
            }}>
              2
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{ 
                margin: '0 0 12px 0',
                color: 'white',
                fontSize: '20px',
                fontWeight: '600'
              }}>
                Add Link to Story
              </h3>
              
              <p style={{ 
                margin: '0 0 20px 0',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '15px',
                lineHeight: '1.6'
              }}>
                Add the link to your Instagram or Snapchat story when sharing a photo or video
              </p>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  backgroundColor: 'rgba(225, 255, 255, 0.15)',
                  borderRadius: '5px',
                  border: '1px solid rgba(225, 255, 255, 0.5)',
                  fontSize: '14px',
                  color: '#fff',
                  fontWeight: '500'
                }}>
                  Instagram
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  backgroundColor: 'rgba(225, 255, 255, 0.15)',
                  borderRadius: '5px',
                  border: '1px solid rgba(225, 255, 255, 0.5)',
                  fontSize: '14px',
                  color: '#fff',
                  fontWeight: '500'
                }}>
                  Snapchat
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Step 3 */}
        <div style={{ 
          padding: '32px'
        }}>
          <div style={{ 
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#28a745',
              borderRadius: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: '700',
              color: 'white',
              flexShrink: 0,
              transition: 'all 0.3s ease'
            }}>
              3
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{ 
                margin: '0 0 12px 0',
                color: 'white',
                fontSize: '20px',
                fontWeight: '600'
              }}>
                Start Earning
              </h3>
              
              <p style={{ 
                margin: '0 0 20px 0',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '15px',
                lineHeight: '1.6'
              }}>
                Earn $0.10 for every story rating you receive. Track your earnings in real-time
              </p>
              
              <div style={{
                backgroundColor: 'rgba(65, 105, 225, 0.1)',
                borderRadius: '5px',
                padding: '20px',
                border: '1px solid rgba(65, 105, 225, 0.2)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#4169E1',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    i
                  </div>
                  <span style={{ 
                    color: '#4169E1',
                    fontSize: '15px',
                    fontWeight: '600'
                  }}>
                    Pro Tip
                  </span>
                </div>
                <p style={{ 
                  margin: '0',
                  color: 'rgba(255, 255, 225, 0.7)',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  Links expire after 48 hours. Create new ones regularly for the best results and maximum earnings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '24px 32px 32px 32px',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          <button
            onClick={() => setSelectedLinkForInstructions(null)}
            style={{
              width: '100%',
              padding: '16px 24px',
              backgroundColor: '#4169E1',
              color: 'white',
              border: 'none',
              borderRadius: '200px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#3557C7';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#4169E1';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Done
          </button>
        </div>
      </div>
      
      {/* Mobile Responsive Styles */}
      <style>{`
        @media (max-width: 640px) {
          .modal-step {
            padding: 24px !important;
          }
          .modal-header {
            padding: 24px 24px 20px 24px !important;
          }
          .modal-footer {
            padding: 20px 24px 24px 24px !important;
          }
        }
      `}</style>
    </div>
  </div>
)}
        
      </div> {/* End of main content container */}
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
      <>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#10183C',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #323862',
              borderTop: '4px solid #fff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
          </div>
        </div>
      </>
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