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
            <h1 style={{ margin: '2px 0px 0px 0px', fontSize: '20px', color: 'white' }}>
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
          borderRadius: '20px',
          padding: '40px'
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
              {isLogin ? 'Sign in to your partner dashboard' : 'Start earning from your stories today'}
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
                      backgroundColor: '#323862',
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
                      backgroundColor: '#323862',
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
                  backgroundColor: '#323862',
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
                  backgroundColor: '#323862',
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
                color: '#fff',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                padding: '8px 0'
              }}
            >
              {isLogin ? 'Create New Account' : 'Sign In Instead'}
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
                fontSize: '20px', 
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
        
      {/* Payment Status */}
      <div style={{ marginBottom: '30px' }}>
          {!affiliateData?.paymentInfo && (
            <div style={{ 
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '5px',
              padding: '20px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '15px'
              }}>
                <div>
                  <h4 style={{ 
                    margin: '0 0 8px 0', 
                    color: '#ffc107',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                  Payment Setup Required
                  </h4>
                  <p style={{ 
                    margin: '0', 
                    color: 'rgba(255, 193, 7, 0.9)',
                    fontSize: '14px'
                  }}>
                    Set up your payment information to receive earnings
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#ffc107',
                    color: '#212529',
                    border: 'none',
                    borderRadius: '200px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Setup Now
                </button>
              </div>
            </div>
          )}
        </div>

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
              $0.02
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
              backgroundColor: 'rgba(0,0,0,0.8)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowSettings(false);
              }
            }}
          >
            <div 
              style={{ 
                backgroundColor: '#323862',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '30px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px',
                paddingBottom: '20px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{ 
                  margin: '0',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}>
                  Settings
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    fontSize: '24px',
                    padding: '0',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'rgba(255,255,255,0.7)';
                  }}
                >
                  ×
                </button>
              </div>
              
              {/* Payment Information Section */}
              <div style={{ marginBottom: '40px' }}>
                <h4 style={{ 
                  margin: '0 0 20px 0',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  Payment Information
                </h4>
                {affiliateData?.paymentInfo ? (
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ marginBottom: '15px' }}>
                      <p style={{ 
                        margin: '0 0 8px 0',
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '14px'
                      }}>
                        <strong>Method:</strong> {affiliateData.paymentInfo.method === 'paypal' ? 'PayPal' : 'Bank Transfer'}
                      </p>
                      <p style={{ 
                        margin: '0 0 15px 0',
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '14px'
                      }}>
                        <strong>Details:</strong> {
                          affiliateData.paymentInfo.method === 'paypal' 
                            ? affiliateData.paymentInfo.details.email
                            : `${affiliateData.paymentInfo.details.bankName} - ${affiliateData.paymentInfo.details.accountNumber.slice(-4)}`
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#4169E1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#3557C7'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#4169E1'}
                    >
                      Edit Payment Info
                    </button>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'center'
                  }}>
                    <p style={{ 
                      margin: '0 0 15px 0', 
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '14px'
                    }}>
                      No payment information set up yet.
                    </p>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      Setup Payment Info
                    </button>
                  </div>
                )}
              </div>

              {/* Payout History Section */}
              <div style={{ marginBottom: '40px' }}>
                <h4 style={{ 
                  margin: '0 0 20px 0',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  Payout History
                </h4>
                {payoutHistory.length === 0 ? (
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '30px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'center'
                  }}>
                    <p style={{ 
                      margin: '0', 
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '14px'
                    }}>
                      No payouts yet. Your first payout will appear here once processed.
                    </p>
                  </div>
                ) : (
                  <div style={{ 
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    overflow: 'hidden'
                  }}>
                    {payoutHistory.map((payout, index) => (
                      <div key={index} style={{ 
                        padding: '20px',
                        borderBottom: index < payoutHistory.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '15px'
                      }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <p style={{ 
                            margin: '0 0 8px 0', 
                            fontWeight: 'bold', 
                            color: '#4169E1',
                            fontSize: '18px'
                          }}>
                            ${payout.amount.toFixed(2)}
                          </p>
                          <p style={{ 
                            margin: '0 0 5px 0', 
                            fontSize: '13px', 
                            color: 'rgba(255,255,255,0.7)'
                          }}>
                            {payout.method === 'paypal' ? '💙 PayPal' : '🏦 Bank Transfer'} • 
                            {payout.processedAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
                          </p>
                          <p style={{ 
                            margin: '0', 
                            fontSize: '11px', 
                            color: 'rgba(255,255,255,0.5)'
                          }}>
                            Batch: {payout.batchId}
                          </p>
                        </div>
                        <div>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            backgroundColor: 'rgba(40, 167, 69, 0.2)',
                            color: '#28a745',
                            border: '1px solid rgba(40, 167, 69, 0.3)',
                            whiteSpace: 'nowrap'
                          }}>
                            ✅ Paid
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Account Information Section */}
              <div>
                <h4 style={{ 
                  margin: '0 0 20px 0',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  Account Information
                </h4>
                
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {/* Name Update */}
                  <div style={{ marginBottom: '25px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: 'white',
                      fontSize: '14px'
                    }}>
                      First Name:
                    </label>
                    <input
                      type="text"
                      value={affiliateData?.firstName || ''}
                      onChange={(e) => setAffiliateData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter your first name"
                      style={{
                        width: '100%',
                        marginBottom: '15px',
                        padding: '12px',
                        backgroundColor: '#1A2245',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />

                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: 'white',
                      fontSize: '14px'
                    }}>
                      Last Name:
                    </label>
                    <input
                      type="text"
                      value={affiliateData?.lastName || ''}
                      onChange={(e) => setAffiliateData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter your last name"
                      style={{
                        width: '100%',
                        marginBottom: '15px',
                        padding: '12px',
                        backgroundColor: '#1A2245',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />

                    <button
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'affiliates', user.uid), {
                            firstName: affiliateData.firstName,
                            lastName: affiliateData.lastName
                          });
                          alert('Name updated successfully!');
                        } catch (error) {
                          alert('Error updating name: ' + error.message);
                        }
                      }}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: '#4169E1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Update
                    </button>
                  </div>
                  
                  {/* Account Details */}
                  <div style={{ 
                    display: 'grid', 
                    gap: '15px',
                    fontSize: '14px'
                  }}>
                    <div style={{ 
                      padding: '15px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <p style={{ margin: '0 0 5px 0', color: 'rgba(255,255,255,0.7)' }}>
                        <strong>Email:</strong>
                      </p>
                      <p style={{ margin: '0', color: 'white' }}>
                        {affiliateData?.email}
                      </p>
                      <p style={{ 
                        margin: '5px 0 0 0', 
                        fontSize: '12px', 
                        color: 'rgba(255,255,255,0.5)'
                      }}>
                        This is your login email and cannot be changed
                      </p>
                    </div>
                    
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '15px'
                    }}>
                      <div style={{ 
                        padding: '15px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <p style={{ margin: '0 0 5px 0', color: 'rgba(255,255,255,0.7)' }}>
                          <strong>Member Since:</strong>
                        </p>
                        <p style={{ margin: '0', color: 'white' }}>
                          {affiliateData?.createdAt?.toDate?.()?.toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div style={{ 
                        padding: '15px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <p style={{ margin: '0 0 5px 0', color: 'rgba(255,255,255,0.7)' }}>
                          <strong>Account Status:</strong>
                        </p>
                        <p style={{ margin: '0' }}>
                          <span style={{ color: '#28a745', fontWeight: '600' }}>Active</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <div style={{ marginTop: '30px' }}>
                <button 
                  onClick={onLogout}
                  style={{ 
                    padding: '12px 24px', 
                    backgroundColor: '#dc3545', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                >
                  Logout
                </button>
              </div>
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
                  url: `partners.socialstarapp.com/rate/${user.uid}/${linkId}`,
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

        {/* First Earnings Celebration Modal */}
        {showFirstEarningsPrompt && (
          <div style={{ 
            position: 'fixed', 
            top: '0', 
            left: '0', 
            right: '0', 
            bottom: '0', 
            backgroundColor: 'rgba(0,0,0,0.8)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{ 
              backgroundColor: '#323862', 
              padding: '50px 40px', 
              borderRadius: '25px', 
              maxWidth: '450px', 
              width: '100%',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.6)'
            }}>
              <div style={{ 
                fontSize: '64px', 
                marginBottom: '25px',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
              }}>
                🎉
              </div>
              <h2 style={{ 
                color: '#4169E1', 
                marginBottom: '20px',
                fontSize: '28px',
                fontWeight: 'bold'
              }}>
                Congratulations!
              </h2>
              <p style={{ 
                marginBottom: '20px', 
                fontSize: '18px',
                color: 'white',
                lineHeight: '1.5'
              }}>
                You just earned your first money with SocialStar!
              </p>
              <p style={{ 
                marginBottom: '35px', 
                color: 'rgba(255,255,255,0.7)',
                fontSize: '16px',
                lineHeight: '1.4'
              }}>
                Set up your payment information so we can send you your earnings.
              </p>
              
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setShowFirstEarningsPrompt(false);
                    setShowPaymentModal(true);
                  }}
                  style={{
                    flex: 1,
                    minWidth: '140px',
                    padding: '16px 24px',
                    backgroundColor: '#4169E1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '16px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#3557C7'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#4169E1'}
                >
                  Setup Payments
                </button>
                
                <button
                  onClick={() => setShowFirstEarningsPrompt(false)}
                  style={{
                    flex: 1,
                    minWidth: '140px',
                    padding: '16px 24px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
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
    <div style={{ display: 'grid', gap: '12px' }}>

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
            transition: 'all 0.2s ease'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr auto', 
              gap: '15px', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              {/* Link Info */}
              <div>
                <h4 style={{ 
                  margin: '0 0 5px 0',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  {link.title}
                </h4>
                <p style={{ 
                  margin: '0', 
                  color: 'rgba(255,255,255,0.6)', 
                  fontSize: '12px' 
                }}>
                  {link.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                  {!isActive && (
                    <span style={{ color: '#ffc107', marginLeft: '8px' }}>
                      • Expired: {link.expiresAt?.toDate?.()?.toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
              
              {/* Share Link Button - Only show if active */}
              {isActive ? (
                <button
                  onClick={() => setSelectedLinkForInstructions(link)}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#4169E1', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '200px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    alignSelf: 'flex-start'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#3557C7';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#4169E1';
                    e.target.style.transform = 'translateY(0px)';
                  }}
                >
                Use Link
                </button>
              ) : (
                <div style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255, 193, 7, 0.1)',
                  color: '#ffc107',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: '1px solid rgba(255, 193, 7, 0.2)',
                  alignSelf: 'flex-start'
                }}>
                  ⏰ Expired
                </div>
              )}
            </div>
            
            {/* Average Rating Display - NEW */}
            {hasRatings && (
              <div style={{ 
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)'
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
                    color: '#ffc107'
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
                          color: star <= Math.round(averageData.average) ? '#ffc107' : '#dee2e6'
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p style={{ 
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '11px',
                  margin: '0',
                  textAlign: 'center'
                }}>
                  Average from {averageData.count} rating{averageData.count !== 1 ? 's' : ''}
                </p>
              </div>
            )}
            
            {/* Compact Stats Row */}
            <div style={{ 
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                padding: '6px 10px',
                minWidth: '80px'
              }}>
                <span style={{ fontSize: '14px', color: '#6B8AFF', fontWeight: 'bold' }}>
                  {link.totalRatings || 0}
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                  ratings
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                padding: '6px 10px',
                minWidth: '70px'
              }}>
                <span style={{ fontSize: '14px', color: '#4169E1', fontWeight: 'bold' }}>
                  ${(link.earnings || 0).toFixed(2)}
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                  earned
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                padding: '6px 10px'
              }}>
                <span style={{ fontSize: '12px' }}>
                  {linkStatus === 'active' ? '✅' : '⏰'}
                </span>
                <span style={{ 
                  fontSize: '11px', 
                  color: linkStatus === 'active' ? '#28a745' : '#ffc107',
                  fontWeight: '500'
                }}>
                  {linkStatus === 'active' ? 'Active' : 'Expired'}
                </span>
              </div>
              
              {/* Time remaining for active links */}
              {isActive && (
                <div style={{ 
                  padding: '6px 10px', 
                  backgroundColor: 'rgba(40, 167, 69, 0.1)', 
                  color: '#28a745', 
                  borderRadius: '6px',
                  fontSize: '11px',
                  border: '1px solid rgba(40, 167, 69, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>⏳</span>
                  <span>
                    {(() => {
                      const timeLeft = link.expiresAt?.toDate?.() - new Date();
                      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                      return hoursLeft > 0 ? `${hoursLeft}h left` : 'Expires soon';
                    })()}
                  </span>
                </div>
              )}
              
              {/* Expired Status Warning - Only show if expired */}
              {!isActive && (
                <div style={{ 
                  padding: '6px 10px', 
                  backgroundColor: 'rgba(255, 193, 7, 0.1)', 
                  color: '#ffc107', 
                  borderRadius: '6px',
                  fontSize: '11px',
                  border: '1px solid rgba(255, 193, 7, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: 'auto'
                }}>
                  <span>⚠️</span>
                  <span>Expired</span>
                </div>
              )}
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
      top: '0', 
      left: '0', 
      right: '0', 
      bottom: '0', 
      backgroundColor: 'rgba(0,0,0,0.8)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setSelectedLinkForInstructions(null);
      }
    }}
  >
    <div 
      style={{ 
        backgroundColor: '#323862', 
        padding: '30px', 
        borderRadius: '20px', 
        maxWidth: '500px', 
        width: '100%',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ marginBottom: '25px', textAlign: 'center' }}>
        <h3 style={{ 
          margin: '0 0 8px 0',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          How to Use Your Link
        </h3>
      </div>
      
      {/* Step 1: Copy Link */}
      <div style={{ 
        marginBottom: '25px',
        padding: '20px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '15px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#4169E1',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white'
          }}>
            1
          </div>
          <h4 style={{ 
            margin: '0',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Copy Your Link
          </h4>
        </div>
        
        <p style={{ 
          margin: '0 0 15px 0',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          First, copy your unique rating link to share with your audience.
        </p>
        
        <div style={{ 
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{
            flex: 1,
            minWidth: '200px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '10px 12px',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: 'monospace',
            wordBreak: 'break-all'
          }}>
            https://{selectedLinkForInstructions.url}
          </div>
          <button
            onClick={(event) => {
              copyToClipboard(selectedLinkForInstructions.url);
              // Show temporary feedback
              const btn = event.target;
              const originalText = btn.textContent;
              btn.textContent = '✅ Copied!';
              btn.style.backgroundColor = '#28a745';
              setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = '#4169E1';
              }, 2000);
            }}
            style={{
              padding: '10px 16px',
              backgroundColor: '#4169E1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            📋 Copy Link
          </button>
        </div>
      </div>
      
      {/* Step 2: Add to Story */}
      <div style={{ 
        marginBottom: '25px',
        padding: '20px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '15px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#28a745',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white'
          }}>
            2
          </div>
          <h4 style={{ 
            margin: '0',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Add to Your Story
          </h4>
        </div>
        
        <p style={{ 
          margin: '0',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          Paste the link in your Instagram or Snapchat story, for your friends and followers to access. The more visibility, the more ratings you'll get!
        </p>
      </div>
      
      {/* Step 3: Start Earning */}
      <div style={{ 
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '15px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#ffc107',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#212529'
          }}>
            3
          </div>
          <h4 style={{ 
            margin: '0',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Start Earning
          </h4>
        </div>
        
        <p style={{ 
          margin: '0 0 12px 0',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          Every time someone clicks your link and rates your story, you earn <strong style={{ color: '#4169E1' }}>$0.02 per rating</strong>. Your earnings will appear in real-time on your dashboard!
        </p>
        
        <div style={{
          backgroundColor: 'rgba(65, 105, 225, 0.1)',
          borderRadius: '8px',
          padding: '12px',
          border: '1px solid rgba(65, 105, 225, 0.2)'
        }}>
          <p style={{ 
            margin: '0',
            color: '#4169E1',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            💡 Pro Tip: Links expire after 48 hours, so create fresh ones regularly for best results!
          </p>
        </div>
      </div>
      
      {/* Close Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => setSelectedLinkForInstructions(null)}
          style={{
            padding: '12px 32px',
            backgroundColor: '#4169E1',
            color: 'white',
            border: 'none',
            borderRadius: '200px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#3557C7'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#4169E1'}
        >
          Got It!
        </button>
      </div>
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