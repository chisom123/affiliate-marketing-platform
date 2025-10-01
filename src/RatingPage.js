// RATING PAGE COMPONENT
// Enhanced with bulletproof fraud prevention and social media detection
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
  serverTimestamp,
  limit,
  orderBy
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';

// DEVELOPMENT BYPASS HELPER
const isLocalDevelopment = () => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' || 
         window.location.port === '3000' ||
         window.location.hostname.includes('.local');
};

// Enhanced fingerprinting with multiple data points
const generateEnhancedFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('SocialStar fingerprint test', 2, 2);
  
  // Audio fingerprinting
  let audioFingerprint = '';
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const analyser = audioCtx.createAnalyser();
    oscillator.connect(analyser);
    audioFingerprint = analyser.frequencyBinCount.toString();
    audioCtx.close();
  } catch (e) {
    audioFingerprint = 'unavailable';
  }

  // WebGL fingerprinting
  let webglFingerprint = '';
  try {
    const canvas2 = document.createElement('canvas');
    const gl = canvas2.getContext('webgl') || canvas2.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        webglFingerprint = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (e) {
    webglFingerprint = 'unavailable';
  }

  return {
    screen: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    languages: navigator.languages?.join(',') || '',
    platform: navigator.platform,
    userAgent: navigator.userAgent.substring(0, 200),
    canvas: canvas.toDataURL().substring(0, 100),
    audio: audioFingerprint,
    webgl: webglFingerprint.substring(0, 100),
    memory: navigator.deviceMemory || 'unknown',
    cores: navigator.hardwareConcurrency || 'unknown',
    cookies: navigator.cookieEnabled,
    touchSupport: 'ontouchstart' in window,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink
    } : null,
    timestamp: Date.now(),
    performanceNow: performance.now()
  };
};

// Hash function for fingerprints
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// Enhanced browser detection with confidence scoring and debugging
const detectSocialMediaApp = () => {
  // LOCALHOST BYPASS
  if (isLocalDevelopment()) {
    console.log('🔧 Development mode detected - bypassing social media checks');
    return {
      isValid: true,
      app: 'development',
      isWebView: false,
      confidence: 100,
      details: {
        isInstagram: false,
        isSnapchat: false,
        isTikTok: false,
        isFacebookApp: false,
        isMobile: false,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        patterns: { isInstagram: false, isSnapchat: false, isTikTok: false, isFacebookApp: false },
        developmentMode: true
      }
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  
  // Debug logging
  console.log('User Agent:', ua);
  
  // Comprehensive detection patterns
  const instagramPatterns = [
    /instagram/i, 
    /fbav/i, 
    /fban/i, 
    /fb_iab/i, 
    /fbios/i, 
    /fbandroid/i
  ];
  
  const snapchatPatterns = [
    /snapchat/i, 
    /snap_ios/i, 
    /snap_android/i, 
    /snapkit/i
  ];
  
  // TikTok patterns (future expansion)
  const tiktokPatterns = [
    /tiktok/i, 
    /musically/i
  ];
  
  // Enhanced webview detection
  const webViewIndicators = [
    /wv\)/i,
    /version\/[\d.]+.*mobile.*safari/i,
    /mobile.*safari/i,
    /android.*version/i,
    /iphone.*version/i
  ];
  
  const isInstagram = instagramPatterns.some(pattern => pattern.test(ua));
  const isSnapchat = snapchatPatterns.some(pattern => pattern.test(ua));
  const isTikTok = tiktokPatterns.some(pattern => pattern.test(ua));
  const isFacebookApp = /fbav|fban|fb_iab/i.test(ua);
  const isWebView = webViewIndicators.some(pattern => pattern.test(ua));
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);
  
  // Enhanced confidence scoring
  let confidence = 0;
  
  // Primary app detection (highest scores)
  if (/instagram/i.test(ua)) confidence += 50;
  if (/snapchat/i.test(ua)) confidence += 50;
  if (/tiktok/i.test(ua)) confidence += 50;
  if (/fbav/i.test(ua)) confidence += 40;
  if (/fban/i.test(ua)) confidence += 40;
  if (isFacebookApp) confidence += 30;
  
  // Secondary indicators
  if (isWebView) confidence += 25;
  if (isMobile) confidence += 20;
  
  // Additional mobile indicators
  if (/safari/i.test(ua) && isMobile) confidence += 15;
  if (/version/i.test(ua) && isMobile) confidence += 10;
  
  // Screen size check (typical mobile dimensions)
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  if ((screenWidth <= 428 && screenHeight <= 926) || 
      (screenHeight <= 428 && screenWidth <= 926)) {
    confidence += 10;
  }
  
  // Touch support
  if ('ontouchstart' in window) confidence += 5;
  
  // STRICT validation - ONLY direct app detection
  const isValidDirect = isInstagram || isSnapchat || isTikTok || isFacebookApp;
  
  // Remove ALL fallback validation - no confidence scoring allowed
  const isValid = isValidDirect;
  
  // Debug logging
  console.log('Detection results:', {
    isInstagram,
    isSnapchat,
    isTikTok,
    isFacebookApp,
    isWebView,
    isMobile,
    confidence,
    isValid
  });
  
  return {
    isValid,
    app: isInstagram || isFacebookApp ? 'instagram' : 
         isSnapchat ? 'snapchat' : 
         isTikTok ? 'tiktok' :
         isMobile ? 'mobile_browser' : 'unknown',
    isWebView,
    confidence: Math.min(confidence, 100),
    details: {
      isInstagram,
      isSnapchat,
      isTikTok,
      isFacebookApp,
      isMobile,
      screenSize: `${screenWidth}x${screenHeight}`,
      patterns: { isInstagram, isSnapchat, isTikTok, isFacebookApp }
    }
  };
};

// Rate limiting with progressive delays
const checkRateLimit = () => {
  // LOCALHOST BYPASS
  if (isLocalDevelopment()) {
    console.log('🔧 Development mode - bypassing rate limits');
    return { allowed: true, delay: 0, attempts: 1 };
  }

  const rateKey = 'socialstar_rate_limit';
  const stored = localStorage.getItem(rateKey);
  
  if (stored) {
    try {
      const data = JSON.parse(stored);
      const now = Date.now();
      
      if (now - data.firstAttempt > 60 * 60 * 1000) {
        localStorage.removeItem(rateKey);
        return { allowed: true, delay: 0 };
      }
      
      const delays = [0, 30000, 120000, 300000, 900000];
      const currentDelay = delays[Math.min(data.attempts, delays.length - 1)];
      
      if (now - data.lastAttempt < currentDelay) {
        return { 
          allowed: false, 
          delay: currentDelay - (now - data.lastAttempt),
          attempts: data.attempts 
        };
      }
      
      data.attempts++;
      data.lastAttempt = now;
      localStorage.setItem(rateKey, JSON.stringify(data));
      
      return { allowed: true, delay: 0, attempts: data.attempts };
      
    } catch (e) {
      localStorage.removeItem(rateKey);
    }
  }
  
  const data = {
    firstAttempt: Date.now(),
    lastAttempt: Date.now(),
    attempts: 1
  };
  localStorage.setItem(rateKey, JSON.stringify(data));
  
  return { allowed: true, delay: 0, attempts: 1 };
};

// Server-side fraud detection
const checkForFraud = async (fingerprint, linkId, affiliateId) => {
  // LOCALHOST BYPASS
  if (isLocalDevelopment()) {
    console.log('🔧 Development mode - bypassing fraud detection');
    return { fraud: false, confidence: 100, developmentMode: true };
  }

  const fingerprintHash = simpleHash(JSON.stringify(fingerprint));
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  try {
    // Check 1: Same fingerprint hash in last hour
    const recentSameFingerprint = await getDocs(query(
      collection(db, 'ratings'),
      where('fingerprintHash', '==', fingerprintHash),
      where('createdAt', '>=', oneHourAgo),
      limit(1)
    ));
    
    if (!recentSameFingerprint.empty) {
      return { 
        fraud: true, 
        reason: 'Same device used recently',
        confidence: 95 
      };
    }
    
    // Check 2: Too many ratings for this affiliate recently
    const recentAffiliateRatings = await getDocs(query(
      collection(db, 'ratings'),
      where('affiliateId', '==', affiliateId),
      where('createdAt', '>=', oneHourAgo),
      limit(20)
    ));
    
    if (recentAffiliateRatings.size >= 15) {
      return { 
        fraud: true, 
        reason: 'Too many ratings for this affiliate',
        confidence: 80 
      };
    }
    
    // Check 3: Rapid sequential ratings
    const veryRecentRatings = await getDocs(query(
      collection(db, 'ratings'),
      where('createdAt', '>=', new Date(now.getTime() - 5 * 60 * 1000)),
      orderBy('createdAt', 'desc'),
      limit(10)
    ));
    
    const rapidRatings = veryRecentRatings.docs.filter(doc => {
      const rating = doc.data();
      const timeDiff = now - rating.createdAt.toDate();
      return timeDiff < 10000;
    });
    
    if (rapidRatings.length >= 3) {
      return { 
        fraud: true, 
        reason: 'Suspicious rapid rating pattern',
        confidence: 90 
      };
    }
    
    return { fraud: false, confidence: 100 };
    
  } catch (error) {
    console.error('Fraud detection error:', error);
    return { fraud: false, confidence: 0, error: true };
  }
};

// Enhanced client token with additional security
const generateSecureClientToken = () => {
  const stored = localStorage.getItem('socialstar_client_token');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.expires > Date.now()) {
        return parsed.token;
      }
    } catch (e) {
      // Invalid stored token
    }
  }
  
  const token = {
    token: 'sst_' + Math.random().toString(36).substr(2, 16),
    created: Date.now(),
    expires: Date.now() + (7 * 24 * 60 * 60 * 1000),
    fingerprint: simpleHash(JSON.stringify(generateEnhancedFingerprint()))
  };
  
  localStorage.setItem('socialstar_client_token', JSON.stringify(token));
  return token.token;
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
  const [averageRating, setAverageRating] = useState(null);
  const [totalRatingsCount, setTotalRatingsCount] = useState(0);

  // Check if user is in a valid browser
  const [isValidBrowser, setIsValidBrowser] = useState(false);

  useEffect(() => {
    // Check browser environment immediately
    const browserCheck = detectSocialMediaApp();
    console.log('Browser check result:', browserCheck);
    
    // STRICT validation - ONLY direct app detection allowed
    const isAcceptable = browserCheck.isValid;
    
    setIsValidBrowser(isAcceptable);
    
    if (!isAcceptable) {
      setError('Ratings are only allowed from Instagram or Snapchat stories. Please open this link in the Instagram or Snapchat app.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
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
        
        // Check if link is expired
        if (linkData.expiresAt && linkData.expiresAt.toDate() < new Date()) {
          setError('This rating link has expired');
          setLoading(false);
          return;
        }

        setLinkData(linkData);

        // Load affiliate data
        const affiliateDoc = await getDoc(doc(db, 'affiliates', affiliateId));
        if (affiliateDoc.exists()) {
          setAffiliateData(affiliateDoc.data());
        }

      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load rating page');
      }
      
      setLoading(false);
    };

    if (affiliateId && linkId && isValidBrowser) {
      loadData();
    }
  }, [affiliateId, linkId, isValidBrowser]);

  const calculateAverageRating = async () => {
    try {
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('linkIdString', '==', linkId)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);
      
      if (!ratingsSnapshot.empty) {
        const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating);
        const total = ratings.reduce((sum, rating) => sum + rating, 0);
        const average = total / ratings.length;
        
        setAverageRating(average);
        setTotalRatingsCount(ratings.length);
      }
    } catch (error) {
      console.error('Error calculating average rating:', error);
    }
  };

  // Enhanced submit rating with bulletproof fraud prevention
  const submitRating = async (selectedRating = rating) => {
    const finalRating = selectedRating || rating;
    if (finalRating === 0) {
      alert('Please select a star rating first!');
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Rate limiting check
      const rateLimit = checkRateLimit();
      if (!rateLimit.allowed) {
        throw new Error(`Please wait ${Math.ceil(rateLimit.delay / 1000)} seconds before rating again.`);
      }
      
      // Step 2: STRICT browser validation - ONLY direct app detection
      const browserCheck = detectSocialMediaApp();
      
      if (!browserCheck.isValid) {
        throw new Error('Invalid browser detected. Please rate from Instagram, Snapchat, or TikTok.');
      }
      
      // Step 3: Enhanced fingerprinting
      const fingerprint = generateEnhancedFingerprint();
      
      // Step 4: Server-side fraud detection
      const fraudCheck = await checkForFraud(fingerprint, linkId, affiliateId);
      if (fraudCheck.fraud) {
        // Log suspicious activity (skip in development)
        if (!isLocalDevelopment()) {
          await addDoc(collection(db, 'suspicious_activity'), {
            type: 'fraud_attempt',
            reason: fraudCheck.reason,
            confidence: fraudCheck.confidence,
            fingerprint: fingerprint,
            linkId: linkId,
            affiliateId: affiliateId,
            timestamp: serverTimestamp()
          });
        }
        
        throw new Error('Rating not allowed due to suspicious activity.');
      }
      
      // Step 5: Double rating check (bypassed in localhost)
      const clientToken = generateSecureClientToken();
      const ratingKey = `rated_${linkId}`;
      
      if (!isLocalDevelopment() && localStorage.getItem(ratingKey)) {
        throw new Error('You have already rated this story!');
      }
      
      // Step 6: Submit rating with all protection data
      const fingerprintHash = simpleHash(JSON.stringify(fingerprint));
      
      const ratingData = {
        linkId: linkData.id,
        linkIdString: linkData.linkId,
        affiliateId: affiliateId,
        rating: finalRating,
        createdAt: serverTimestamp(),
        fingerprint: fingerprint,
        fingerprintHash: fingerprintHash,
        clientToken: clientToken,
        browserInfo: browserCheck,
        fraudScore: fraudCheck.confidence,
        referrer: document.referrer,
        validated: true,
        earnings: 0.50,
        protectionVersion: isLocalDevelopment() ? '2.0-dev' : '2.0',
        developmentMode: isLocalDevelopment()
      };
      
      await addDoc(collection(db, 'ratings'), ratingData);
      
      // Update stats
      await updateDoc(doc(db, 'rating_links', linkData.id), {
        totalRatings: increment(1),
        earnings: increment(0.50),
        lastRatedAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'affiliates', affiliateId), {
        totalRatings: increment(1),
        totalEarnings: increment(0.50), 
        balance: increment(0.50)      
      });
      
      // Mark as rated (skip in development to allow multiple ratings)
      if (!isLocalDevelopment()) {
        localStorage.setItem(ratingKey, JSON.stringify({
          rated: true,
          timestamp: Date.now(),
          rating: finalRating
        }));
      }
      
      await calculateAverageRating();
      setSubmitted(true);

    } catch (error) {
      console.error('Error submitting rating:', error);
      setError(error.message);
    }

    setSubmitting(false);
  };

  // Loading state
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

// Error state
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
        backgroundColor: '#1A2245',
        borderRadius: '20px',
        padding: '40px 30px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        
        {/* Error Message */}
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
    </div>
  );
}

// Success state
if (submitted) {
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
          padding: '40px 30px 0px 30px', // Remove bottom padding
          marginBottom: '30px'
        }}>
          <h2 style={{ 
            color: '#fff',
            marginTop: '0px',
            marginBottom: '30px',
            fontSize: '22px',
            fontWeight: 'bold'
          }}>
            Thanks for rating!
          </h2>

          {/* NEW: Average Rating Display */}
          {averageRating && (
            <div style={{ 
              backgroundColor: '#243055',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <p style={{ 
                color: '#B8C5D1',
                fontSize: '15px',
                margin: '0 0 10px 0',
                fontWeight: '500'
              }}>
                Average Rating
              </p>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px'
              }}>
                <div style={{ 
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#ffc107',
                  marginRight: '10px'
                }}>
                  {averageRating.toFixed(1)}
                </div>
                <div style={{ 
                  display: 'flex',
                  gap: '2px'
                }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      style={{
                        fontSize: '20px',
                        color: star <= Math.round(averageRating) ? '#ffc107' : '#dee2e6'
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <p style={{ 
                color: '#B8C5D1',
                fontSize: '15px',
                margin: '0',
                fontWeight: '500'
              }}>
                {totalRatingsCount} rater{totalRatingsCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <button
              onClick={() => window.open('https://apps.apple.com/app/socialstar-app/id6473705189', '_blank')}
              style={{
                padding: '23px 30px',
                backgroundColor: '#4169E1',
                color: 'white',
                border: 'none',
                borderRadius: '0px 0px 12px 12px', // Only round bottom corners to match container
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: 'calc(100% + 60px)', // Extend beyond padding
                marginLeft: '-30px',        // Offset to align with container edge
                marginTop: '20px'
              }}
            >
              Continue
            </button>
        </div>
        <a href="https://apps.apple.com/gb/app/socialstar-app/id6473705189" target="_blank" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

  // Main rating interface
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

            {/* Spinner shown during submission */}
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
        <a href="https://apps.apple.com/gb/app/socialstar-app/id6473705189" target="_blank" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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