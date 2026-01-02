import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment,
  serverTimestamp,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

// Generate a fingerprint using available browser data
const generateFingerprint = async () => {
  const components = [];
  
  components.push(`screen:${window.screen.width}x${window.screen.height}`);
  components.push(`colorDepth:${window.screen.colorDepth}`);
  components.push(`pixelRatio:${window.devicePixelRatio}`);
  components.push(`timezone:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  components.push(`language:${navigator.language}`);
  components.push(`platform:${navigator.platform}`);
  components.push(`hardwareConcurrency:${navigator.hardwareConcurrency || 'unknown'}`);
  
  const ua = navigator.userAgent;
  components.push(`mobile:${/Mobile|Android|iPhone/i.test(ua)}`);
  
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
  
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
};

// Capitalize first letter of a string
const capitalizeFirstLetter = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Spinner component
const Spinner = () => (
  <div style={{
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTop: '3px solid #FFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }} />
);

const InfoPage = () => {
  const { affiliateId, linkId } = useParams();
  const [fingerprint, setFingerprint] = useState(null);
  const [continueClickInProgress, setContinueClickInProgress] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Affiliate data
  const [affiliateFirstName, setAffiliateFirstName] = useState(null);
  const [affiliateProfilePic, setAffiliateProfilePic] = useState(null);
  const [affiliateTotalStars, setAffiliateTotalStars] = useState(0);
  const [affiliateImageLoading, setAffiliateImageLoading] = useState(true);
  const [meImageLoading, setMeImageLoading] = useState(true);

  // Initialize fingerprint on component mount
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        const fp = await generateFingerprint();
        setFingerprint(fp);
        localStorage.setItem(`info_fingerprint_${linkId}`, fp);
      } catch (error) {
        console.error('Error generating fingerprint:', error);
        const fallbackFp = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setFingerprint(fallbackFp);
        localStorage.setItem(`info_fingerprint_${linkId}`, fallbackFp);
      }
    };

    initializeFingerprint();
  }, [linkId]);

  // Load affiliate data and ratings
  useEffect(() => {
    const loadData = async () => {
      if (!affiliateId || !linkId) {
        setLoading(false);
        return;
      }

      try {
        // First, get the link document to get the actual doc ID
        const linksQuery = query(
          collection(db, 'rating_links'),
          where('linkId', '==', linkId)
        );
        const linkSnapshot = await getDocs(linksQuery);
        
        let linkDocId = null;
        if (!linkSnapshot.empty) {
          linkDocId = linkSnapshot.docs[0].id;
        }

        // Fetch affiliate data
        const affiliateDoc = await getDoc(doc(db, 'affiliates', affiliateId));
        if (affiliateDoc.exists()) {
          const affiliateData = affiliateDoc.data();
          if (affiliateData.firstName) {
            setAffiliateFirstName(capitalizeFirstLetter(affiliateData.firstName));
          }
          if (affiliateData.profilePictureUrl) {
            setAffiliateProfilePic(affiliateData.profilePictureUrl);
          }
        }

        // Calculate total stars from ratings for this link
        if (linkDocId) {
          const ratingsQuery = query(
            collection(db, 'ratings'),
            where('linkId', '==', linkDocId)
          );
          const ratingsSnapshot = await getDocs(ratingsQuery);
          
          let totalStars = 0;
          ratingsSnapshot.docs.forEach(doc => {
            const ratingData = doc.data();
            totalStars += ratingData.rating || 0;
          });
          
          setAffiliateTotalStars(totalStars);
        }

      } catch (error) {
        console.error('Error loading data:', error);
      }
      
      setLoading(false);
    };

    loadData();
  }, [affiliateId, linkId]);

  // Track unique continue button click - FAST & NON-BLOCKING with spam prevention
  const trackUniqueContinueClick = async (stepName) => {
    // PREVENT SPAM - if already in progress, ignore this call
    if (continueClickInProgress || !fingerprint || !linkId) {
      if (continueClickInProgress) {
        console.log('Continue click already in progress, ignoring duplicate');
      }
      return;
    }
    
    // SET FLAG IMMEDIATELY to prevent duplicate calls
    setContinueClickInProgress(true);
    
    // Run tracking asynchronously without awaiting
    (async () => {
      try {
        // First, get the actual document ID from rating_links collection
        const linksQuery = query(
          collection(db, 'rating_links'),
          where('linkId', '==', linkId)
        );
        const linkSnapshot = await getDocs(linksQuery);
        
        if (linkSnapshot.empty) {
          console.warn('Rating link not found for tracking');
          return;
        }
        
        const linkDocId = linkSnapshot.docs[0].id;
        
        const trackingDocId = `${linkDocId}_${fingerprint}_${stepName}`;
        const trackingDocRef = doc(db, 'unique_info_continue_clicks', trackingDocId);
        
        // Check if this fingerprint has already clicked this continue button for this link
        const trackingDoc = await getDoc(trackingDocRef);
        
        if (!trackingDoc.exists()) {
          // First time this fingerprint is clicking this continue button for this link
          // Create tracking document
          await setDoc(trackingDocRef, {
            linkId: linkDocId,
            fingerprint: fingerprint,
            stepName: stepName,
            firstClickedAt: serverTimestamp(),
            clickCount: 1
          });

          // Increment UNIQUE continue clicks counter for this specific step
          const linkDocRef = doc(db, 'rating_links', linkDocId);
          
          const updateData = {
            lastInfoContinueClickAt: serverTimestamp(),
            totalInfoContinueClicksDownload: increment(1)
          };
          
          await updateDoc(linkDocRef, updateData);
        } else {
          // User has clicked before - just update their click count
          await updateDoc(trackingDocRef, {
            clickCount: increment(1),
            lastClickedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error tracking unique continue click:', error);
      } finally {
        // Reset flag after a short delay to allow legitimate re-clicks if needed
        setTimeout(() => {
          setContinueClickInProgress(false);
        }, 1500);
      }
    })();
  };

  // Build leaderboard data
  const leaderboardData = [
    { 
      rank: 1, 
      name: affiliateFirstName || 'Loading...', 
      stars: affiliateTotalStars, 
      isCurrentUser: false, 
      isAffiliate: true,
      profileUrl: affiliateProfilePic 
    },
    { 
      rank: 2, 
      name: 'Me', 
      stars: 0, 
      isCurrentUser: true,
      isAffiliate: false,
      profileUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/ffdb2764778f0f35c846ec597955c5c1.jpg?alt=media&token=3c1b808f-8345-4276-a9c5-ca4964c13498' 
    },
    { 
      rank: 3, 
      name: null, 
      stars: 0, 
      isCurrentUser: false,
      isAffiliate: false,
      profileUrl: null 
    }
  ];

  // Get image loading state for a user
  const getImageLoading = (user) => {
    if (user.isAffiliate) return affiliateImageLoading;
    if (user.isCurrentUser) return meImageLoading;
    return false;
  };

  // Set image loading state for a user
  const setImageLoading = (user, loading) => {
    if (user.isAffiliate) setAffiliateImageLoading(loading);
    if (user.isCurrentUser) setMeImageLoading(loading);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#10183C'
      }}>
        <Spinner />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#10183C',
      position: 'relative'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        paddingTop: '0',
        paddingBottom: '20px'
      }}>
        {/* Combined Container: Title, Leaderboard, and Button */}
        <div style={{
          width: '100%',
          maxWidth: '500px'
        }}>
          <div style={{
            backgroundColor: '#1A2245',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            {/* Title */}
            <div style={{
              padding: '30px 20px 20px 20px'
            }}>
              <h1 style={{
                color: 'white',
                fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                fontWeight: 'bold',
                margin: '0',
                lineHeight: '1.3',
                textAlign: 'center'
              }}>
                Leaderboard
              </h1>
            </div>

            {/* Leaderboard Rows */}
            {leaderboardData.map((user, index) => (
              <div key={index}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '24px 20px',
                  backgroundColor: user.isCurrentUser ? '#243055' : 'transparent'
                }}>
                  <span style={{
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    width: '30px',
                    marginRight: '15px'
                  }}>
                    {user.rank}
                  </span>
                  
                  {/* Profile Picture */}
                  {user.profileUrl ? (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      marginRight: '15px',
                      flexShrink: 0,
                      overflow: 'hidden',
                      backgroundColor: '#3B4374',
                      position: 'relative'
                    }}>
                      {getImageLoading(user) && (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          position: 'absolute',
                          top: 0,
                          left: 0
                        }}>
                          <div style={{
                            width: '15px',
                            height: '15px',
                            border: '2px solid rgba(255, 255, 255, 0.3)',
                            borderTop: '2px solid #FFF',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                        </div>
                      )}
                      <img 
                        src={user.profileUrl}
                        alt={user.name || 'User'}
                        onLoad={() => setImageLoading(user, false)}
                        onError={(e) => {
                          setImageLoading(user, false);
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: getImageLoading(user) ? 'none' : 'block'
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      marginRight: '15px',
                      flexShrink: 0
                    }} />
                  )}
                  
                  {/* Name or Placeholder */}
                  {user.name ? (
                    <span style={{
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      flex: 1,
                      textAlign: 'left'
                    }}>
                      {user.name}
                    </span>
                  ) : (
                    <div style={{
                      height: '16px',
                      width: '80px',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      marginRight: 'auto'
                    }} />
                  )}
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    backgroundColor: '#DAA520',
                    borderRadius: '20px'
                  }}>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: 'white'
                    }}>
                      {user.stars}
                    </span>
                    <span style={{
                      fontSize: '18px',
                      color: 'white'
                    }}>
                      ★
                    </span>
                  </div>
                </div>
                
                {index < leaderboardData.length - 1 && (
                  <div style={{
                    height: '1px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }} />
                )}
              </div>
            ))}

            {/* Integrated Download Button */}
            <button
              onClick={() => {
                trackUniqueContinueClick('download');
                window.location.href = 'https://apps.apple.com/app/socialstar-app/id6473705189';
              }}
              style={{
                width: '100%',
                backgroundColor: '#4169E1',
                color: 'white',
                padding: '25px 0',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: '0',
                cursor: 'pointer',
                marginTop: '1px'
              }}
            >
              Continue
            </button>
          </div>

          {/* SocialStar Branding */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            justifyContent: 'flex-start',
            marginTop: '30px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a" 
                alt="Star icon" 
                style={{ width: '22px', height: '22px' }} 
              />
            </div>
            <span style={{ fontSize: '18px', color: 'white', fontWeight: 'bold' }}>
              SocialStar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoPage;