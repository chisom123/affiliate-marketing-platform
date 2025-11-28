import React, { useState, useEffect, useRef } from 'react';
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
import { ArrowRight } from 'lucide-react';
import { X } from 'lucide-react';


// Development environment check
const isDevelopment = process.env.NODE_ENV === 'development';

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

// Check if user is in Instagram app
const isInstagramApp = () => {
  if (isDevelopment) {
    console.log('Development mode: Instagram requirement bypassed');
    return true;
  }
  
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isInstagram = /instagram/i.test(userAgent);
  const isIOSInstagram = /instagram.*applewebkit/i.test(userAgent) && !/safari/i.test(userAgent);
  const isAndroidInstagram = /instagram.*android/i.test(userAgent);
  
  return isInstagram || isIOSInstagram || isAndroidInstagram;
};

// Generate initials from name
const getInitials = (name) => {
  if (!name) return '?';
  return name.trim()[0].toUpperCase();
};

// Generate consistent color from name
const getColorFromName = (name) => {
  if (!name) return '#999';
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B88B', '#A8E6CF', '#FFD3B6', '#FFAAA5'
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

// Avatar component
const Avatar = ({ userName, size = 40 }) => {
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      backgroundColor: getColorFromName(userName),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${size * 0.4}px`,
      fontWeight: 'bold',
      color: 'white',
      flexShrink: 0
    }}>
      {getInitials(userName)}
    </div>
  );
};

const RatingPage = () => {
  const { affiliateId, linkId } = useParams();
  const [linkData, setLinkData] = useState(null);
  const [affiliateFirstName, setAffiliateFirstName] = useState(null);
  const [affiliateProfilePic, setAffiliateProfilePic] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState(false);
  const [isRatingEnabled, setIsRatingEnabled] = useState(true);
  const [animateRating, setAnimateRating] = useState(false);
  const [pageOpenTracked, setPageOpenTracked] = useState(false);
  const [fingerprint, setFingerprint] = useState(null);
  const [isValidEnvironment, setIsValidEnvironment] = useState(true);
  const [interactions, setInteractions] = useState([]);
  const [loadingInteractions, setLoadingInteractions] = useState(true);
  
  // Name modal state
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingRating, setPendingRating] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [continueUrl, setContinueUrl] = useState('https://apps.apple.com/app/socialstar-app/id6473705189');
  
  // Bottom sheet drag state - SIMPLIFIED
  const [snapState, setSnapState] = useState('mid');
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const sheetRef = useRef(null);

  // Calculate snap points based on viewport
  const getSnapPoints = () => {
    const vh = window.innerHeight;
    const starFooterHeight = 100;
    const navHeight = 80;
    const bottomPadding = 20;
    
    return {
      min: 80,
      mid: vh * 0.25,
      max: vh - navHeight - bottomPadding - starFooterHeight
    };
  };

  const snapPoints = getSnapPoints();

  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        if (!isInstagramApp() && !isDevelopment) {
          setIsValidEnvironment(false);
          setError('Please open this link in the Instagram app to rate stories');
          setLoading(false);
          return;
        }

        const fp = await generateFingerprint();
        setFingerprint(fp);
        localStorage.setItem(`rating_fingerprint_${linkId}`, fp);
        
      } catch (error) {
        console.error('Error generating fingerprint:', error);
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

        // Set photo URL from link data
        if (linkData.photoUrl) {
          setPhotoUrl(linkData.photoUrl);
        }

        // Fetch affiliate first name
        const affiliateDoc = await getDoc(doc(db, 'affiliates', affiliateId));
        if (affiliateDoc.exists()) {
          const affiliateData = affiliateDoc.data();
          if (affiliateData.firstName) {
            setAffiliateFirstName(affiliateData.firstName);
          }
          if (affiliateData.profilePictureUrl) {
            setAffiliateProfilePic(affiliateData.profilePictureUrl);
          }
        }

        // Check if already rated (only in production)
        if (!isDevelopment) {
          const existingRatingQuery = query(
            collection(db, 'ratings'),
            where('linkId', '==', linkData.id),
            where('fingerprint', '==', fingerprint)
          );
          const existingRatings = await getDocs(existingRatingQuery);
          
          if (!existingRatings.empty) {
            setHasAlreadyVoted(true);
            setIsRatingEnabled(false);
          }
        } else {
          console.log('Development mode: Skipping "already rated" check');
        }

        // Track page open
        if (!pageOpenTracked) {
          await updateDoc(doc(db, 'rating_links', linkDoc.id), {
            totalPageOpens: increment(1),
            lastOpenedAt: serverTimestamp()
          });
          setPageOpenTracked(true);
        }

        // Load interactions
        await loadInteractions(linkData.id);

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

  const loadInteractions = async (linkDocId) => {
    setLoadingInteractions(true);
    try {
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('linkId', '==', linkDocId)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);
      
      const interactionsData = ratingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        const aTime = a.timestamp?.toMillis() || 0;
        const bTime = b.timestamp?.toMillis() || 0;
        return bTime - aTime;
      });
      
      setInteractions(interactionsData);
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
    setLoadingInteractions(false);
  };

  const handleStarTap = (stars) => {
    if (!isRatingEnabled || hasAlreadyVoted) return;
    
    setRating(stars);
    setPendingRating(stars);
    setAnimateRating(true);
    
    setTimeout(() => {
      setAnimateRating(false);
      setShowNameModal(true);
    }, 300);
  };

  const handleNameSubmit = async () => {
    const trimmedName = nameInput.trim();
    if (trimmedName.length === 0 || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await submitRating(pendingRating, trimmedName);
      setShowNameModal(false);
      setNameInput('');
      setHasAlreadyVoted(true);
      setIsRatingEnabled(false);
      
      // Reload interactions
      if (linkData) {
        await loadInteractions(linkData.id);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const submitRating = async (stars, userName) => {
    if (!linkData || !fingerprint) return;

    const ratingFingerprint = isDevelopment 
      ? `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : fingerprint;

    const ratingData = {
      linkId: linkData.id,
      linkIdString: linkData.linkId,
      affiliateId: affiliateId,
      rating: stars,
      userName: userName,
      earnings: 0.25,
      fingerprint: ratingFingerprint,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      isDevelopment: isDevelopment
    };
    
    await addDoc(collection(db, 'ratings'), ratingData);
    
    await updateDoc(doc(db, 'rating_links', linkData.id), {
      totalRatings: increment(1),
      earnings: increment(0.25),
      lastRatedAt: serverTimestamp()
    });
    
    await updateDoc(doc(db, 'affiliates', affiliateId), {
      totalRatings: increment(1),
      totalEarnings: increment(0.25),
      balance: increment(0.25)
    });
  };

  // SIMPLIFIED BOTTOM SHEET DRAG
  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartY(e.clientY);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    
    const deltaY = e.clientY - dragStartY;
    
    // Calculate bounds based on current snap state
    let maxDragUp = 0;
    let maxDragDown = 0;
    
    if (snapState === 'min') {
      maxDragUp = -(snapPoints.mid - snapPoints.min);
      maxDragDown = 0;
    } else if (snapState === 'mid') {
      maxDragUp = -(snapPoints.max - snapPoints.mid);
      maxDragDown = (snapPoints.mid - snapPoints.min);
    } else if (snapState === 'max') {
      maxDragUp = 0;
      maxDragDown = (snapPoints.max - snapPoints.mid);
    }
    
    const boundedOffset = Math.max(maxDragUp, Math.min(maxDragDown, deltaY));
    setDragOffset(boundedOffset);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    
    const dragThreshold = 50;
    let newSnapState = snapState;
    
    if (Math.abs(dragOffset) > dragThreshold) {
      if (dragOffset < 0) {
        // Dragged up
        if (snapState === 'min') newSnapState = 'mid';
        else if (snapState === 'mid') newSnapState = 'max';
      } else {
        // Dragged down
        if (snapState === 'max') newSnapState = 'mid';
        else if (snapState === 'mid') newSnapState = 'min';
      }
    }
    
    setSnapState(newSnapState);
    setIsDragging(false);
    setDragOffset(0);
    setDragStartY(0);
  };

  // Add global pointer move/up listeners when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalPointerMove = (e) => {
      handlePointerMove(e);
    };

    const handleGlobalPointerUp = () => {
      handlePointerUp();
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isDragging, dragStartY, dragOffset, snapState]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#10183C'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #323862',
          borderTop: '4px solid #fff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error && !isValidEnvironment) {
    return (
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: '#10183C',
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
            marginBottom: '30px'
          }}>
            <p style={{ 
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '30px',
              fontWeight: '600',
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#10183C',
      overflow: 'hidden'
    }}>
      {/* Photo Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        backgroundColor: '#10183C'
      }}>
        {photoUrl && (
          <img 
            src={photoUrl}
            alt="Rating"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}
      </div>

      {/* Navigation Bar / Continue Button */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: '0px'
      }}>
        {hasAlreadyVoted ? (
          <button
            onClick={() => window.location.href = continueUrl}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#4169E1',
              border: 'none',
              borderRadius: '0px',
              padding: '16px 20px',
              cursor: 'pointer'
            }}
          >
            <span style={{
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              lineHeight: 1
            }}>
              Continue Playing
            </span>
            <span style={{
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center'
            }}>
              <ArrowRight size={30} strokeWidth={2.5} />
            </span>
          </button>
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'transparent',
              padding: '5px 16px'
            }}>
              <img 
                src={affiliateProfilePic}
                alt={affiliateFirstName}
                style={{
                  width: '35px',
                  height: '35px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
              <span style={{
                color: 'white',
                fontSize: '19px',
                fontWeight: 'bold'
              }}>
                {affiliateFirstName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'absolute',
          bottom: 100,
          left: 0,
          right: 0,
          height: `${snapPoints[snapState] - dragOffset}px`, // Dynamic height during drag
          backgroundColor: '#1A2245',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          zIndex: 20,
          transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'height'
        }}
      >
        {/* Handle */}
        <div 
          onPointerDown={handlePointerDown}
          style={{
            width: '100%',
            padding: '15px 0',
            display: 'flex',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            userSelect: 'none'
          }}
        >
          <div style={{
            width: '40px',
            height: '5px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '200px',
            pointerEvents: 'none'
          }}></div>
        </div>

        {/* Header */}
        <div style={{
          padding: '0px 20px 10px 20px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 'bold',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            Ratings ({interactions.length})
          </h3>
        </div>

        {/* Ratings List */}
        <div style={{
          overflowY: 'auto',
          height: 'calc(100% - 60px)',
          WebkitOverflowScrolling: 'touch'
        }}>
          {interactions.map((interaction, index) => (
            <div key={interaction.id}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px 20px',
                gap: '12px'
              }}>
                <Avatar userName={interaction.userName} size={38} />
                
                <span style={{
                  flex: 1,
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'white',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {interaction.userName}
                </span>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  backgroundColor: '#DAA520',
                  borderRadius: '20px'
                }}>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    {interaction.rating}
                  </span>
                  <button
                    disabled
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      fontSize: '18px',
                      color: 'white',
                      padding: 0,
                      cursor: 'default',
                      outline: 'none'
                    }}
                  >
                    ★
                  </button>
                </div>
              </div>
              
              {index < interactions.length - 1 && (
                <div style={{
                  height: '0.25px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  margin: '0'
                }}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Star Rating Footer */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100px',
        backgroundColor: hasAlreadyVoted ? '#A9A9A9' : '#10183C',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 30,
        gap: '12px'
      }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleStarTap(star)}
            onMouseEnter={() => !hasAlreadyVoted && setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            disabled={hasAlreadyVoted || !isRatingEnabled}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '40px',
              cursor: hasAlreadyVoted ? 'not-allowed' : 'pointer',
              color: hasAlreadyVoted 
                ? '#c2c2c2' 
                : (hoveredStar >= star || rating >= star) 
                  ? '#FFD700' 
                  : 'white',
              padding: '5px',
              transition: 'all 0.2s',
              transform: (animateRating && star <= rating) ? 'scale(1.3)' : 'scale(1)',
              outline: 'none'
            }}
          >
            ★
          </button>
        ))}
      </div>

      {/* Name Modal */}
      {showNameModal && (
        <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          {/* Close button in top-right */}
          <button
            onClick={() => {
              setShowNameModal(false);
              setNameInput('');
              setPendingRating(null);
              setRating(0);
            }}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255)',
              fontSize: '36px',
              cursor: 'pointer',
              padding: '5px',
              lineHeight: 1
            }}
          >
            <X size={33} strokeWidth={3} />
          </button>

          <div style={{
            backgroundColor: '#1A2245',
            borderRadius: '12px',
            padding: '30px',
            width: '100%',
            maxWidth: '400px',
            animation: 'modalFadeIn 0.2s ease-out',
          }}>

            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center'
            }}>
              What's your name?
            </h2>

            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value.slice(0, 15))}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && nameInput.trim().length > 0) {
                  handleNameSubmit();
                }
              }}
              placeholder="Enter your name"
              autoFocus
              maxLength={15}
              style={{
                width: '100%',
                padding: '18px 20px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: '#3B4374',
                border: '0px',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                caretColor: '#fff'
              }}
            />

            <button
              onClick={handleNameSubmit}
              disabled={nameInput.trim().length === 0 || isSubmitting}
              style={{
                marginTop: '20px',
                padding: '17px 32px',
                backgroundColor: nameInput.trim().length === 0 || isSubmitting  ? 'rgba(65, 105, 225, 0.5)' : '#4169E1',
                color: 'white',
                border: 'none',
                borderRadius: '200px',
                fontSize: '17px',
                fontWeight: 'bold',
                cursor: nameInput.trim().length === 0 || isSubmitting  ? 'not-allowed' : 'pointer',
                width: '100%'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default RatingPage;