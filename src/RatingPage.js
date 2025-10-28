import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  addDoc, 
  collection, 
  updateDoc, 
  increment,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';

// Development environment check
const isDevelopment = process.env.NODE_ENV === 'development';

// Generate a fingerprint using available browser data
const generateFingerprint = async () => {
  const components = [];
  
  // Screen properties - using window.screen to avoid ESLint errors
  components.push(`screen:${window.screen.width}x${window.screen.height}`);
  components.push(`colorDepth:${window.screen.colorDepth}`);
  components.push(`pixelRatio:${window.devicePixelRatio}`);
  
  // Timezone
  components.push(`timezone:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  
  // Language
  components.push(`language:${navigator.language}`);
  
  // Platform
  components.push(`platform:${navigator.platform}`);
  
  // Hardware concurrency
  components.push(`hardwareConcurrency:${navigator.hardwareConcurrency || 'unknown'}`);
  
  // User agent (limited)
  const ua = navigator.userAgent;
  components.push(`mobile:${/Mobile|Android|iPhone/i.test(ua)}`);
  
  // Canvas fingerprint (basic)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Fingerprint', 4, 17);
    const canvasData = canvas.toDataURL();
    components.push(`canvas:${canvasData.length}`);
  } catch (e) {
    components.push(`canvas:error`);
  }
  
  // WebGL fingerprint (basic)
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      components.push(`webglVendor:${vendor?.substring(0, 20) || 'unknown'}`);
      components.push(`webglRenderer:${renderer?.substring(0, 20) || 'unknown'}`);
    }
  } catch (e) {
    components.push(`webgl:error`);
  }
  
  const fingerprintString = components.join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
};

// Check if user is in Instagram app
const isInstagramApp = () => {
  // Allow bypass in development
  if (isDevelopment) {
    console.log('Development mode: Instagram requirement bypassed');
    return true; // Always return true in development
  }
  
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for Instagram in-app browser
  const isInstagram = /instagram/i.test(userAgent);
  
  // Check for iOS/Android Instagram patterns
  const isIOSInstagram = /instagram.*applewebkit/i.test(userAgent) && !/safari/i.test(userAgent);
  const isAndroidInstagram = /instagram.*android/i.test(userAgent);
  
  return isInstagram || isIOSInstagram || isAndroidInstagram;
};

const RatingPage = () => {
  const { affiliateId, linkId } = useParams();
  const [linkData, setLinkData] = useState(null);
  const [affiliateData, setAffiliateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageOpenTracked, setPageOpenTracked] = useState(false);
  const [fingerprint, setFingerprint] = useState(null);
  const [isValidEnvironment, setIsValidEnvironment] = useState(true);

  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        // Check if we're in Instagram app (bypassed in development)
        if (!isInstagramApp() && !isDevelopment) {
          setIsValidEnvironment(false);
          setError('Please open this link in the Instagram app to rate stories');
          setLoading(false);
          return;
        }

        const fp = await generateFingerprint();
        setFingerprint(fp);
        
        // Store fingerprint in localStorage to persist across sessions
        localStorage.setItem(`rating_fingerprint_${linkId}`, fp);
        
      } catch (error) {
        console.error('Error generating fingerprint:', error);
        // Continue anyway but with limited protection
        const fallbackFp = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setFingerprint(fallbackFp);
        localStorage.setItem(`rating_fingerprint_${linkId}`, fallbackFp);
      }
    };

    initializeFingerprint();
  }, [linkId]);

  useEffect(() => {
    const loadData = async () => {
      if (!isValidEnvironment || !fingerprint) {
        setLoading(false);
        return;
      }

      try {
        // Find the rating link
        const linksQuery = query(
          collection(db, 'rating_links'),
          where('linkId', '==', linkId)
        );
        const linkSnapshot = await getDocs(linksQuery);
        
        if (linkSnapshot.empty) {
          setError('Rating link not found or expired');
          setLoading(false);
          return;
        }

        const linkDoc = linkSnapshot.docs[0];
        const linkData = { id: linkDoc.id, ...linkDoc.data() };
        
        setLinkData(linkData);

        // Load affiliate data including profile picture
        const affiliateDoc = await getDoc(doc(db, 'affiliates', affiliateId));
        if (affiliateDoc.exists()) {
          const affiliateData = affiliateDoc.data();
          setAffiliateData(affiliateData);
        }

        // Check if this fingerprint has already rated (bypassed in development)
        if (!isDevelopment) {
          const existingRatingQuery = query(
            collection(db, 'ratings'),
            where('linkId', '==', linkData.id),
            where('fingerprint', '==', fingerprint)
          );
          const existingRatings = await getDocs(existingRatingQuery);
          
          if (!existingRatings.empty) {
            setError('You have already rated this story');
            setLoading(false);
            return;
          }
        } else {
          console.log('Development mode: Skipping "already rated" check');
        }

        // Track page open (only once per load)
        if (!pageOpenTracked) {
          // Update link stats
          await updateDoc(doc(db, 'rating_links', linkDoc.id), {
            totalPageOpens: increment(1),
            lastOpenedAt: serverTimestamp()
          });
          
          setPageOpenTracked(true);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load rating page');
      }
      
      setLoading(false);
    };

    if (affiliateId && linkId && fingerprint && isValidEnvironment) {
      loadData();
    }
  }, [affiliateId, linkId, pageOpenTracked, fingerprint, isValidEnvironment]);

  const submitRating = async (selectedRating = rating) => {
    // Only enforce environment check in production
    if (!isValidEnvironment && !isDevelopment) {
      alert('Please open this link in the Instagram app to rate stories');
      return;
    }

    const finalRating = selectedRating || rating;
    if (finalRating === 0) {
      alert('Please select a star rating first');
      return;
    }

    setSubmitting(true);

    try {
      // In development, generate a unique fingerprint for each rating to avoid conflicts
      const ratingFingerprint = isDevelopment 
        ? `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : fingerprint;

      const ratingData = {
        linkId: linkData.id,
        linkIdString: linkData.linkId,
        affiliateId: affiliateId,
        rating: finalRating,
        earnings: 1.0,
        fingerprint: ratingFingerprint,
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        isDevelopment: isDevelopment // Mark development ratings for tracking
      };
      
      await addDoc(collection(db, 'ratings'), ratingData);
      
      // Update stats with earnings
      await updateDoc(doc(db, 'rating_links', linkData.id), {
        totalRatings: increment(1),
        earnings: increment(1.0),
        lastRatedAt: serverTimestamp()
      });
      
      // Update affiliate earnings
      await updateDoc(doc(db, 'affiliates', affiliateId), {
        totalRatings: increment(1),
        totalEarnings: increment(1.0),
        balance: increment(1.0)
      });
    
      setSubmitted(true);

    } catch (error) {
      console.error('Error submitting rating:', error);
      setError(error.message);
    }

    setSubmitting(false);
  };

  // Handle continue button click
  const handleContinueClick = async () => {
    window.open('https://apps.apple.com/app/socialstar-app/id6473705189', '_blank');

    // Update link stats
    if (linkData) {
      await updateDoc(doc(db, 'rating_links', linkData.id), {
        totalContinueClicks: increment(1)
      });
    }
  };

  // Prediction Row Component with actual affiliate profile picture
  const PredictionRow = ({ prediction, userRating, isCorrect }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0',
        width: '100%',
      }}
    >
      {/* Left section: profile + prediction */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1,
        }}
      >
        {/* Profile Picture - Now using actual affiliate profile picture */}
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {affiliateData?.profilePictureUrl ? (
            <img
              src={affiliateData.profilePictureUrl}
              alt={`${affiliateData?.firstName || 'Affiliate'} profile`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                // Fallback if image fails to load
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#4169E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '50%',
              }}
            >
              {affiliateData?.firstName?.charAt(0) || 'A'}
            </div>
          )}
        </div>

        {/* Prediction section */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              marginBottom: '5px',
            }}
          >
            Prediction
          </div>

          <div style={{ display: 'flex', alignItems: 'center', height: '28px' }}>
            {/* Prediction tab */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                height: '100%',
                padding: '0 8px',
                backgroundColor: isCorrect ? 'rgba(0, 255, 0, 0.6)' : '#FF4444',
                borderRadius: '6px',
              }}
            >
              <button
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#fff',
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  cursor: 'default',
                  padding: '0',
                  pointerEvents: 'none'
                }}
                disabled
              >
                ★
              </button>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#fff',
                  marginTop: '1px'
                }}
              >
                {prediction}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Win/Lost badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: isCorrect ? 'rgba(0, 255, 0, 0.15)' : 'rgba(255, 68, 68, 0.15)',
          borderRadius: '20px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isCorrect ? '#00FF00' : '#FF4444',
          }}
        ></div>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: isCorrect ? '#00FF00' : '#FF4444',
          }}
        >
          {isCorrect ? 'Win' : 'Lost'}
        </span>
      </div>
    </div>
  );

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

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: '#10183C',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ 
          textAlign: 'center',
          width: '100%',
          maxWidth: '500px'
        }}>
          <div style={{ 
            backgroundColor: '#1A2245',
            borderRadius: '12px',
            padding: '40px 30px',
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            <p style={{ 
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '30px',
              fontWeight: 'normal',
              fontSize: '18px',
              lineHeight: '1.5'
            }}>
              {error}
            </p>
          </div>
          
          {/* SocialStar Branding - Added under error container */}
          <a href="https://apps.apple.com/gb/app/socialstar-app/id6473705189" target="_blank" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              justifyContent: 'flex-start',
              width: '100%'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a" alt="Star icon" style={{ width: '22px', height: '22px' }} />
              </div>
              <h1 style={{ margin: '2px 0px 0px 0px', fontSize: '18px', color: 'white' }}> SocialStar</h1>
            </div>
          </a>
        </div>
      </div>
    );
  }

  if (submitted) {
    const prediction = linkData?.predictedRating;
    const userRating = rating;
    const hasPrediction = prediction && prediction > 0;
    const isCorrect = hasPrediction && prediction === userRating;
    
    // Get parlay amounts from linkData
    const parlayData = {
      entry: linkData?.parlayEntry || 25,
      win: linkData?.parlayWin || 100,
      profit: linkData?.parlayProfit || 75
    };
    
    return (
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: '#10183C',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          padding: '30px 20px',
          textAlign: 'center',
          width: '100%',
          maxWidth: '500px'
        }}>
          <div style={{ 
            backgroundColor: '#1A2245',
            borderRadius: '12px',
            padding: '0',
            marginBottom: '30px',
            overflow: 'hidden'
          }}>
            {/* Header - Updated to show affiliate's actual name */}
            <div style={{ 
              padding: '10px 0px 25px 20px'
            }}>
              <p style={{ 
                color: '#fff',
                fontSize: '17px',
                marginBottom: '0px',
                padding: '0',
                fontWeight: '600',
                textAlign: 'left',
                lineHeight: '20px'
              }}>
                {affiliateData?.firstName || 'The affiliate'} predicted your rating
              </p>
            </div>

            {/* Parlay Slip Style Container */}
            <div style={{ 
              backgroundColor: '#243055',
              borderRadius: '12px',
              padding: '20px',
              margin: '0px 20px 20px 20px',
              position: 'relative'
            }}>
              {/* Prediction Row - iOS Style with actual profile picture */}
              {hasPrediction && (
                <PredictionRow 
                  prediction={prediction}
                  userRating={userRating}
                  isCorrect={isCorrect}
                />
              )}

              {/* Divider */}
              <div style={{ 
                height: '1px',
                backgroundColor: 'rgba(184, 197, 209, 0.2)',
                margin: '15px 0'
              }}></div>

              {/* Parlay Entry Data - Now using stored data from Firestore */}
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                {/* Entry */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    color: '#B8C5D1',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    Bet
                  </span>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ 
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#fff'
                    }}>
                      {parlayData.entry}
                    </span>
                    <img 
                      src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/dollar.png?alt=media&token=a1fccb79-e00b-474e-9411-577c0624e81f" 
                      alt="Coin" 
                      style={{ width: '18px', height: '18px' }}
                    />
                  </div>
                </div>

                {/* Win */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    color: '#B8C5D1',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    Win
                  </span>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ 
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#fff'
                    }}>
                      {isCorrect ? parlayData.win : 0}
                    </span>
                    <img 
                      src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/dollar.png?alt=media&token=a1fccb79-e00b-474e-9411-577c0624e81f" 
                      alt="Coin" 
                      style={{ width: '18px', height: '18px' }}
                    />
                  </div>
                </div>

                {/* Profit - Only show when won */}
                {isCorrect && (
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ 
                      color: '#B8C5D1',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      Profit
                    </span>
                    <span style={{ 
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#00FF00'
                    }}>
                      +{parlayData.profit}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinueClick}
              style={{
                padding: '23px 30px',
                backgroundColor: '#4169E1',
                color: 'white',
                border: 'none',
                borderRadius: '0px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%',
                marginTop: '10px'
              }}
            >
              Continue
            </button>
          </div>

          {/* SocialStar Branding - Floated to the left */}
          <a href="https://apps.apple.com/gb/app/socialstar-app/id6473705189" target="_blank" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              justifyContent: 'flex-start',
              width: '100%'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a" alt="Star icon" style={{ width: '22px', height: '22px' }} />
              </div>
              <h1 style={{ margin: '2px 0px 0px 0px', fontSize: '18px', color: 'white' }}> SocialStar </h1>
            </div>
          </a>
        </div>
      </div>
    );
  }

  // Original rating selection UI remains the same
  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#10183C',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ 
        padding: '30px 20px',
        textAlign: 'center',
        width: '100%',
        maxWidth: '500px'
      }}>
        <div style={{ 
          backgroundColor: '#1A2245',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          position: 'relative'
        }}>
          <div style={{ marginBottom: '30px' }}>
            <p style={{
              color: '#fff',
              marginBottom: '10px',
              fontSize: '20px',
              fontWeight: 'bold',
              lineHeight: '28px'
            }}>
              Tap to Rate
            </p>
            
            <div style={{ 
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '20px'
            }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => {
                    setRating(star);
                    setTimeout(() => {
                      submitRating(star);
                    }, 100);
                  }}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  disabled={submitting}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '36px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    color: (hoveredStar >= star || rating >= star) ? '#ffc107' : '#dee2e6',
                    transition: 'color 0.2s',
                    padding: '5px'
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            {submitting && (
              <div style={{ 
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: '40px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  border: '4px solid #323862',
                  borderTop: '4px solid #fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
            )}
          </div>
        </div>
        
        {/* SocialStar Branding - Floated to the left */}
        <a href="https://apps.apple.com/gb/app/socialstar-app/id6473705189" target="_blank" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            justifyContent: 'flex-start',
            width: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a" alt="Star icon" style={{ width: '22px', height: '22px' }} />
            </div>
            <h1 style={{ margin: '2px 0px 0px 0px', fontSize: '18px', color: 'white' }}> SocialStar </h1>
          </div>
        </a>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RatingPage;