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

  // Enhanced submit rating with bulletproof fraud prevention
  const submitRating = async () => {
    if (rating === 0) {
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
        // Log suspicious activity
        await addDoc(collection(db, 'suspicious_activity'), {
          type: 'fraud_attempt',
          reason: fraudCheck.reason,
          confidence: fraudCheck.confidence,
          fingerprint: fingerprint,
          linkId: linkId,
          affiliateId: affiliateId,
          timestamp: serverTimestamp()
        });
        
        throw new Error('Rating not allowed due to suspicious activity.');
      }
      
      // Step 5: Double rating check
      const clientToken = generateSecureClientToken();
      const ratingKey = `rated_${linkId}`;
      
      if (localStorage.getItem(ratingKey)) {
        throw new Error('You have already rated this story!');
      }
      
      // Step 6: Submit rating with all protection data
      const fingerprintHash = simpleHash(JSON.stringify(fingerprint));
      
      const ratingData = {
        linkId: linkData.id,
        linkIdString: linkData.linkId,
        affiliateId: affiliateId,
        rating: rating,
        createdAt: serverTimestamp(),
        fingerprint: fingerprint,
        fingerprintHash: fingerprintHash,
        clientToken: clientToken,
        browserInfo: browserCheck,
        fraudScore: fraudCheck.confidence,
        referrer: document.referrer,
        validated: true,
        earnings: 0.01,
        protectionVersion: '2.0'
      };
      
      await addDoc(collection(db, 'ratings'), ratingData);
      
      // Update stats
      await updateDoc(doc(db, 'rating_links', linkData.id), {
        totalRatings: increment(1),
        earnings: increment(0.01),
        lastRatedAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'affiliates', affiliateId), {
        totalRatings: increment(1),
        totalEarnings: increment(0.01)
      });
      
      // Mark as rated
      localStorage.setItem(ratingKey, JSON.stringify({
        rated: true,
        timestamp: Date.now(),
        rating: rating
      }));
      
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8f9fa',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #e3e3e3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Loading rating page...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8f9fa',
        fontFamily: 'Arial, sans-serif',
        padding: '20px'
      }}>
        <div style={{ 
          textAlign: 'center',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          maxWidth: '500px'
        }}>
          <div style={{
            backgroundColor: '#ff6b6b',
            color: 'white',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '28px'
          }}>
            !
          </div>
          
          <h2 style={{ color: '#495057', marginBottom: '15px' }}>
            Browser Not Supported
          </h2>
          
          <p style={{ color: '#6c757d', marginBottom: '20px' }}>
            {error}
          </p>
          
          <div style={{ 
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '25px',
            textAlign: 'left'
          }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
              To rate this story:
            </p>
            <ol style={{ 
              paddingLeft: '20px',
              margin: '0',
              color: '#495057'
            }}>
              <li>Open Instagram or Snapchat</li>
              <li>Find the story with this rating link</li>
              <li>Tap the link in the story</li>
            </ol>
          </div>
          
          <p style={{ 
            color: '#6c757d', 
            fontSize: '14px',
            marginBottom: '25px'
          }}>
            If you think this is a mistake, contact support@socialstar.app
          </p>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '15px'
          }}>
            <a 
              href="instagram://user?username=socialstar" 
              style={{
                backgroundColor: '#e1306c',
                color: 'white',
                padding: '10px 15px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAyaDMiLz48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHJ4PSI1IiByeT0iNSI+PC9yZWN0PjxwYXRoIGQ9Ik0xNiAxMS4zN0ExNCAxNCAwIDEgMSA4IDExLjM3Ij48L3BhdGg+PC9zdmc+")',
                backgroundSize: 'cover'
              }}></div>
              Open Instagram
            </a>
            
            <a 
              href="snapchat://add/socialstar" 
              style={{
                backgroundColor: '#fffc00',
                color: 'black',
                padding: '10px 15px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAxM2MtMS44IDAtMy40IDEuNi0zLjQgMy40czEuNiAzLjQgMy40IDMuNCAzLjQtMS42IDMuNC0zLjQtMS42LTMuNC0zLjQtMy40eiI+PC9wYXRoPjxwYXRoIGQ9Ik0xOCA2Yy0uNiAwLTEuMS40LTEuNS44LS40LjQtLjggMS0uOCAxLjYgMCAuNi40IDEuMS44IDEuNS40LjQgMSAuOCAxLjYuOC42IDAgMS4xLS40IDEuNS0uOC40LS40LjgtMSAuOC0xLjYgMC0uNi0uNC0xLjEtLjgtMS41QzE5LjEgNi40IDE4LjYgNiAxOCA2eiI+PC9wYXRoPjxwYXRoIGQ9Ik02IDE4Yy0uNiAwLTEuMS40LTEuNS44LS40LjQtLjggMS0uOCAxLjYgMCAuNi40IDEuMS44IDEuNS40LjQgMSAuOCAxLjYuOC42IDAgMS4xLS40IDEuNS0uOC40LS40LjgtMSAuOC0xLjYgMC0uNi0uNC0xLjEtLjgtMS41LS40LS40LTEtLjgtMS42LS44eiI+PC9wYXRoPjwvc3ZnPg==")',
                backgroundSize: 'cover'
              }}></div>
              Open Snapchat
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px 30px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            width: '80px',
            height: '80px',
            backgroundColor: '#28a745',
            borderRadius: '50%',
            margin: '0 auto 30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '36px'
          }}>
            ✓
          </div>

          <h2 style={{ 
            color: '#2c3e50',
            marginBottom: '15px',
            fontSize: '24px'
          }}>
            Thanks for rating!
          </h2>

          <p style={{ 
            color: '#6c757d',
            marginBottom: '30px',
            lineHeight: '1.5'
          }}>
            You gave {affiliateData?.name || 'this story'} {rating} star{rating !== 1 ? 's' : ''}!
          </p>

          <div style={{ 
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px'
          }}>
            <h3 style={{ 
              color: '#495057',
              marginBottom: '15px',
              fontSize: '18px'
            }}>
              Want to rate more friends?
            </h3>
            <p style={{ 
              color: '#6c757d',
              fontSize: '14px',
              marginBottom: '0'
            }}>
              Join SocialStar to create your own rating competitions and discover amazing content!
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <a 
              href="https://apps.apple.com/app/socialstar" 
              style={{ 
                display: 'inline-block',
                margin: '0 10px 10px 0',
                textDecoration: 'none'
              }}
            >
              <div style={{
                backgroundColor: '#000',
                color: '#fff',
                borderRadius: '8px',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{fontSize: '24px'}}></div>
                <div>
                  <div style={{fontSize: '10px'}}>Download on the</div>
                  <div style={{fontSize: '18px', fontWeight: 'bold'}}>App Store</div>
                </div>
              </div>
            </a>
            
            <a 
              href="https://play.google.com/store/apps/details?id=com.socialstar" 
              style={{ 
                display: 'inline-block',
                margin: '0 0 10px 10px',
                textDecoration: 'none'
              }}
            >
              <div style={{
                backgroundColor: '#000',
                color: '#fff',
                borderRadius: '8px',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{fontSize: '24px'}}>▶</div>
                <div>
                  <div style={{fontSize: '10px'}}>GET IT ON</div>
                  <div style={{fontSize: '18px', fontWeight: 'bold'}}>Google Play</div>
                </div>
              </div>
            </a>
          </div>

          <p style={{ 
            fontSize: '12px',
            color: '#adb5bd',
            margin: '0'
          }}>
            Rate friends • Share moments • Win prizes
          </p>
        </div>
      </div>
    );
  }

  // Main rating interface
  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        backgroundColor: 'white',
        padding: '20px',
        borderBottom: '1px solid #dee2e6',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: '#28a745',
          color: 'white',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '4px'
        }}>
          {navigator.userAgent.includes('Instagram') ? 'Instagram' : 
           navigator.userAgent.includes('Snapchat') ? 'Snapchat' :
           navigator.userAgent.includes('TikTok') ? 'TikTok' : 'Social Media'}
        </div>
        
        <h1 style={{ 
          margin: '0 0 5px 0',
          color: '#495057',
          fontSize: '20px'
        }}>
          Rate this story
        </h1>
        <p style={{ 
          margin: '0',
          color: '#6c757d',
          fontSize: '14px'
        }}>
          by {affiliateData?.name || 'a friend'}
        </p>
      </div>

      <div style={{ 
        padding: '30px 20px',
        textAlign: 'center'
      }}>
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#007bff',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px'
          }}>
            Rating Link
          </div>
          
          <h2 style={{ 
            color: '#495057',
            marginBottom: '15px',
            fontSize: '22px'
          }}>
            "{linkData.title}"
          </h2>
          
          {linkData.description && (
            <p style={{ 
              color: '#6c757d',
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              {linkData.description}
            </p>
          )}

          <div style={{ 
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '40px',
            border: '2px dashed #dee2e6',
            marginBottom: '30px'
          }}>
            <p style={{ 
              color: '#adb5bd',
              margin: '0',
              fontSize: '14px'
            }}>
              📸 Story content preview
            </p>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <p style={{ 
              color: '#495057',
              marginBottom: '20px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              How would you rate this story?
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
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '36px',
                    cursor: 'pointer',
                    color: (hoveredStar >= star || rating >= star) ? '#ffc107' : '#dee2e6',
                    transition: 'color 0.2s',
                    padding: '5px'
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            {rating > 0 && (
              <p style={{ 
                color: '#28a745',
                fontSize: '14px',
                margin: '0 0 20px 0'
              }}>
                You selected {rating} star{rating !== 1 ? 's' : ''}!
              </p>
            )}
          </div>

          <button
            onClick={submitRating}
            disabled={rating === 0 || submitting}
            style={{
              backgroundColor: rating === 0 ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              padding: '15px 40px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: rating === 0 || submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              minWidth: '160px'
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>

        <p style={{ 
          color: '#adb5bd',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          Powered by SocialStar • Rate friends and win prizes!
        </p>
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