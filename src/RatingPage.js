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
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';


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

// Capitalize first letter of a string
const capitalizeFirstLetter = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Generate consistent color from fingerprint
const getColorFromFingerprint = (fingerprint) => {
  if (!fingerprint) return '#999';
  
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    hash = fingerprint.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B88B', '#A8E6CF', '#FFD3B6', '#FFAAA5'
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

// Avatar component - simplified to just show colored circle
const Avatar = ({ fingerprint, size = 40 }) => {
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      backgroundColor: getColorFromFingerprint(fingerprint),
      flexShrink: 0
    }} />
  );
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
  const [earningsPerRating, setEarningsPerRating] = useState(0.25);
  const [downloadClickInProgress, setDownloadClickInProgress] = useState(false);
  const [continuePlayingLoading, setContinuePlayingLoading] = useState(false);
  
  // Image loading states
  const [profileImageLoading, setProfileImageLoading] = useState(true);
  const [backgroundImageLoading, setBackgroundImageLoading] = useState(true);

  const [continueUrl, setContinueUrl] = useState('https://apps.apple.com/app/socialstar-app/id6473705189');
  
  // Dynamic viewport height state
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  
  // Bottom sheet drag state - SIMPLIFIED
  const [snapState, setSnapState] = useState('mid');
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const sheetRef = useRef(null);

  // Load dynamic earnings rate
  useEffect(() => {
    const loadEarningsRate = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'app_config', 'affiliate_pricing'));
        if (configDoc.exists()) {
          setEarningsPerRating(configDoc.data().earnings_per_rating || 0.25);
        }
      } catch (error) {
        console.error('Error loading earnings rate:', error);
        // Keep default 0.25 if loading fails
      }
    };

    loadEarningsRate();
  }, []);

  // Handle viewport changes (browser UI collapse/expand)
  useEffect(() => {
    const updateViewport = () => {
      // Use visualViewport for more accurate tracking
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      } else {
        setViewportHeight(window.innerHeight);
      }
    };

    // Listen to both resize and visualViewport events
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }
    
    window.addEventListener('resize', updateViewport);
    
    // Initial update
    updateViewport();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  // Prevent body scroll
  useEffect(() => {
    // Lock body scroll to prevent layout shifts
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    
    // Prevent text selection for app-like feel
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.webkitTouchCallout = 'none';
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.webkitTouchCallout = '';
    };
  }, []);

  // Calculate snap points based on viewport
  const getSnapPoints = () => {
    const vh = viewportHeight;
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

        // Track UNIQUE page open - NON-BLOCKING
        trackUniquePageOpen(linkData.id, fingerprint);

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
  }, [affiliateId, linkId, fingerprint, isValidEnvironment]);

  // Track unique page open - FAST & NON-BLOCKING
  const trackUniquePageOpen = async (linkDocId, userFingerprint) => {
    if (pageOpenTracked) return;
    
    setPageOpenTracked(true);

    // Run tracking asynchronously without awaiting
    (async () => {
      try {
        const trackingDocId = `${linkDocId}_${userFingerprint}`;
        const trackingDocRef = doc(db, 'unique_page_opens', trackingDocId);
        
        // Check if this fingerprint has already opened this link
        const trackingDoc = await getDoc(trackingDocRef);
        
        if (!trackingDoc.exists()) {
          // First time this fingerprint is opening this link
          // Create tracking document
          await setDoc(trackingDocRef, {
            linkId: linkDocId,
            fingerprint: userFingerprint,
            firstOpenedAt: serverTimestamp(),
            openCount: 1
          });

          // Increment UNIQUE page opens counter
          await updateDoc(doc(db, 'rating_links', linkDocId), {
            totalPageOpens: increment(1),
            lastOpenedAt: serverTimestamp()
          });
        } else {
          // User has opened before - just update their open count
          await updateDoc(trackingDocRef, {
            openCount: increment(1),
            lastOpenedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error tracking unique page open:', error);
      }
    })();
  };

  // Track unique download click - FAST & NON-BLOCKING with spam prevention
  const trackUniqueDownloadClick = async (linkDocId, userFingerprint) => {
    // PREVENT SPAM - if already in progress, ignore this call
    if (downloadClickInProgress) {
      console.log('Download click already in progress, ignoring duplicate');
      return;
    }
    
    // SET FLAG IMMEDIATELY to prevent duplicate calls
    setDownloadClickInProgress(true);
    
    // Run tracking asynchronously without awaiting
    (async () => {
      try {
        const trackingDocId = `${linkDocId}_${userFingerprint}`;
        const trackingDocRef = doc(db, 'unique_download_clicks', trackingDocId);
        
        // Check if this fingerprint has already clicked download for this link
        const trackingDoc = await getDoc(trackingDocRef);
        
        if (!trackingDoc.exists()) {
          // First time this fingerprint is clicking download for this link
          // Create tracking document
          await setDoc(trackingDocRef, {
            linkId: linkDocId,
            fingerprint: userFingerprint,
            firstClickedAt: serverTimestamp(),
            clickCount: 1
          });

          // Increment UNIQUE download clicks counter
          await updateDoc(doc(db, 'rating_links', linkDocId), {
            totalDownloadClicks: increment(1),
            lastDownloadClickAt: serverTimestamp()
          });
        } else {
          // User has clicked before - just update their click count
          await updateDoc(trackingDocRef, {
            clickCount: increment(1),
            lastClickedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error tracking unique download click:', error);
      } finally {
        // Reset flag after a short delay to allow legitimate re-clicks if needed
        setTimeout(() => {
          setDownloadClickInProgress(false);
        }, 1500);
      }
    })();
  };

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
        // First, check if either rating belongs to current user
        const aIsCurrentUser = a.fingerprint === fingerprint;
        const bIsCurrentUser = b.fingerprint === fingerprint;
        
        // If one is current user and other isn't, current user comes first
        if (aIsCurrentUser && !bIsCurrentUser) return -1;
        if (!aIsCurrentUser && bIsCurrentUser) return 1;
        
        // Otherwise sort by timestamp (newest first)
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

  // Instant rating on star tap - fully anonymous
  const handleStarTap = async (stars) => {
    if (!isRatingEnabled || hasAlreadyVoted) return;
    
    // DISABLE IMMEDIATELY to prevent spam
    setIsRatingEnabled(false);
    
    setRating(stars);
    setAnimateRating(true);
    
    // Submit rating IMMEDIATELY (no name needed)
    try {
      await submitRating(stars);
      setHasAlreadyVoted(true);
      
      // Reload interactions to show new rating
      if (linkData) {
        await loadInteractions(linkData.id);
      }
      
      // Reset animation after brief delay
      setTimeout(() => {
        setAnimateRating(false);
      }, 800);
      
    } catch (error) {
      console.error('Error submitting rating:', error);
      setAnimateRating(false);
      // RE-ENABLE on error so user can retry
      setIsRatingEnabled(true);
      alert('Failed to submit rating. Please try again.');
    }
  };

  const submitRating = async (stars) => {
    if (!linkData || !fingerprint) return;

    const ratingFingerprint = isDevelopment 
      ? `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : fingerprint;

    const ratingData = {
      linkId: linkData.id,
      linkIdString: linkData.linkId,
      affiliateId: affiliateId,
      rating: stars,
      earnings: earningsPerRating,
      fingerprint: ratingFingerprint,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      isDevelopment: isDevelopment
    };
    
    const docRef = await addDoc(collection(db, 'ratings'), ratingData);
    
    await updateDoc(doc(db, 'rating_links', linkData.id), {
      totalRatings: increment(1),
      earnings: increment(earningsPerRating),
      lastRatedAt: serverTimestamp()
    });
    
    await updateDoc(doc(db, 'affiliates', affiliateId), {
      totalRatings: increment(1),
      totalEarnings: increment(earningsPerRating),
      balance: increment(earningsPerRating)
    });
    
    return docRef.id;
  };

  // Handle Continue Playing button click
  const handleContinuePlaying = () => {
    // Set loading state immediately
    setContinuePlayingLoading(true);
    
    // Stop spinner after 1.5 seconds
    setTimeout(() => {
      setContinuePlayingLoading(false);
    }, 1500);
    
    // Track UNIQUE download click FIRST (non-blocking with spam prevention)
    if (linkData && fingerprint) {
      trackUniqueDownloadClick(linkData.id, fingerprint);
    }
    
    // Construct deep link URL - format: socialstar://rating/affiliateId/linkId
    const deepLinkUrl = `socialstar://rating/${affiliateId}/${linkId}`;
    const infoPageUrl = `/info/${affiliateId}/${linkId}`;
    
    // Track if the page becomes hidden (app opened successfully)
    let appOpened = false;
    
    const visibilityHandler = () => {
      if (document.hidden) {
        appOpened = true;
      }
    };
    
    document.addEventListener('visibilitychange', visibilityHandler);
    
    // Attempt to open the app via deep link
    window.location.href = deepLinkUrl;
    
    // Fallback to Info Page if app is not installed
    // After 1.5 seconds, if the app didn't open (page didn't become hidden), redirect to Info Page
    setTimeout(() => {
      document.removeEventListener('visibilitychange', visibilityHandler);
      if (!appOpened) {
        window.location.href = infoPageUrl;
      }
    }, 1500);
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
      height: `${viewportHeight}px`,
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
        {backgroundImageLoading && photoUrl && (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }}>
            <Spinner />
          </div>
        )}
        {photoUrl && (
          <img 
            src={photoUrl}
            alt="Rating"
            onLoad={() => setBackgroundImageLoading(false)}
            onError={() => setBackgroundImageLoading(false)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: backgroundImageLoading ? 'none' : 'block'
            }}
          />
        )}
      </div>

      {/* Navigation Bar - Always show */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: '0px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: affiliateProfilePic ? '12px' : '0px',
            backgroundColor: 'transparent',
            padding: '5px 16px'
          }}>
            {/* Profile Image with Placeholder - Only render if URL exists */}
            {affiliateProfilePic && (
              <div style={{
                position: 'relative',
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                overflow: 'hidden'
              }}>
                {profileImageLoading && (
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
                  src={affiliateProfilePic}
                  alt={affiliateFirstName}
                  onLoad={() => setProfileImageLoading(false)}
                  onError={() => setProfileImageLoading(false)}
                  style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: profileImageLoading ? 'none' : 'block'
                  }}
                />
              </div>
            )}
            <span style={{
              color: 'white',
              fontSize: '19px',
              fontWeight: 'bold',
              maxWidth: '200px', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap'
            }}>
              {affiliateFirstName}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'absolute',
          bottom: 100,
          left: 0,
          right: 0,
          height: `${snapPoints[snapState] - dragOffset}px`,
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

        {/* Ratings List - Simplified anonymous display */}
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
                justifyContent: 'space-between',
                padding: '15px 20px',
                paddingBottom: index === interactions.length - 1 ? '25px' : '15px'
              }}>
                <Avatar fingerprint={interaction.fingerprint} size={38} />

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
                  height: '1px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  margin: '0'
                }}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer - Star Rating or Continue Playing Button */}
      {!hasAlreadyVoted ? (
        /* Star Rating Footer - shown before voting */
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100px',
          backgroundColor: '#10183C',
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
                color: (hoveredStar >= star || rating >= star) 
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
      ) : (
        /* Continue Playing Footer - shown after voting, replaces star rating */
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100px',
          zIndex: 30
        }}>
          <button
            onClick={handleContinuePlaying}
            disabled={continuePlayingLoading}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#4169E1',
              border: 'none',
              padding: '0 24px',
              cursor: continuePlayingLoading ? 'default' : 'pointer',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#FFF',
              transition: 'transform 0.2s ease'
            }}
            onMouseDown={(e) => {
              if (!continuePlayingLoading) {
                e.currentTarget.style.transform = 'scale(0.98)';
              }
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {continuePlayingLoading ? (
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                borderTop: '3px solid #FFF',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight size={32} strokeWidth={2.5} style={{ marginLeft: 'auto' }} />
              </>
            )}
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RatingPage;