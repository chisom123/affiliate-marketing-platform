import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from './firebase';
import { ArrowRight, Copy } from 'lucide-react';
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

// Development environment check
const isDevelopment = process.env.NODE_ENV === 'development';

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
  const [error, setError] = useState('');
  const [isValidEnvironment, setIsValidEnvironment] = useState(true);
  const [claimCode, setClaimCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [hasEverCopied, setHasEverCopied] = useState(false);

  // Initialize fingerprint and check Instagram on component mount
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        if (!isInstagramApp() && !isDevelopment) {
          setIsValidEnvironment(false);
          setError('Please open this link in the Instagram app');
          setLoading(false);
          return;
        }

        const fp = await generateFingerprint();
        setFingerprint(fp);
        localStorage.setItem(`info_fingerprint_${linkId}`, fp);
        
        // Generate claim code from fingerprint + linkId
        const code = `SS${fp.substring(0, 4).toUpperCase()}${linkId.substring(0, 4).toUpperCase()}`;
        setClaimCode(code);
        
      } catch (error) {
        console.error('Error generating fingerprint:', error);
        const fallbackFp = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setFingerprint(fallbackFp);
        localStorage.setItem(`info_fingerprint_${linkId}`, fallbackFp);
        const code = `SS${fallbackFp.substring(0, 4).toUpperCase()}${linkId.substring(0, 4).toUpperCase()}`;
        setClaimCode(code);
      }
    };

    initializeFingerprint();
  }, [linkId]);

  // Set loading to false after initialization
  useEffect(() => {
    if (isValidEnvironment && fingerprint) {
      setLoading(false);
    }
  }, [isValidEnvironment, fingerprint]);

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(claimCode).then(() => {
      setCodeCopied(true);
      setHasEverCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

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
      
          <a href="https://apps.apple.com/gb/app/socialstar-app/id6473705189" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', cursor: 'pointer' }}>
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
        {/* Main Container */}
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
              padding: '30px 20px 20px 20px',
              textAlign: 'center'
            }}>
              <h1 style={{
                color: 'white',
                fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                fontWeight: 'bold',
                margin: '0',
                lineHeight: '1.25'
              }}>
                Claim Winnings
              </h1>
            </div>

            {/* Step 1: Copy Code */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
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
                  borderRadius: '50%',
                  backgroundColor: codeCopied ? '#10B981' : '#4169E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'white',
                  flexShrink: 0
                }}>
                  {'1'}
                </div>
                <h2 style={{
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: '0'
                }}>
                  Copy Win Code
                </h2>
              </div>

              <div 
                onClick={handleCopyCode}
                style={{
                  backgroundColor: '#2A3A6B',
                  padding: '18px 20px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '12px'
                }}
              >
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.6)',
                  textAlign: 'center',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  Win Code
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'white',
                  letterSpacing: '2px',
                  textAlign: 'center',
                  fontFamily: 'monospace'
                }}>
                  {claimCode}
                </div>
              </div>

              <button
                onClick={handleCopyCode}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: codeCopied ? '#10B981' : '#4169E1',
                  border: 'none',
                  borderRadius: '200px',
                  color: '#FFF',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                  <>
                    <Copy size={20} strokeWidth={2.5} />
                    <span>Copy Code</span>
                  </>
              </button>
            </div>

            {/* Step 2: Open SocialStar */}
            <div style={{
              padding: '20px',
              opacity: hasEverCopied ? 1 : 0.5,
              transition: 'opacity 0.3s ease'
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
                  borderRadius: '50%',
                  backgroundColor: hasEverCopied ? '#4169E1' : '#2A3A6B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: hasEverCopied ? 'white' : 'rgba(255, 255, 255, 0.4)',
                  flexShrink: 0
                }}>
                  2
                </div>
                <h2 style={{
                  color: hasEverCopied ? 'white' : 'rgba(255, 255, 255, 0.4)',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: '0'
                }}>
                  Open SocialStar
                </h2>
              </div>

              <p style={{
                color: hasEverCopied ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)',
                fontSize: '15px',
                margin: '0 0 15px 0',
                lineHeight: '1.4'
              }}>
                Enter the code in SocialStar to claim your winnings
              </p>

              <button
                onClick={() => {
                  if (hasEverCopied) {
                    trackUniqueContinueClick('download');
                    window.location.href = 'https://apps.apple.com/app/socialstar-app/id6473705189';
                  }
                }}
                disabled={!hasEverCopied}
                style={{
                  width: '100%',
                  padding: '18px',
                  backgroundColor: hasEverCopied ? '#4169E1' : '#2A3A6B',
                  border: 'none',
                  borderRadius: '200px',
                  color: hasEverCopied ? '#FFF' : 'rgba(255, 255, 255, 0.4)',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: hasEverCopied ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease'
                }}
                onMouseDown={(e) => {
                  if (hasEverCopied) {
                    e.currentTarget.style.transform = 'scale(0.98)';
                  }
                }}
                onMouseUp={(e) => {
                  if (hasEverCopied) {
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span>Open SocialStar</span>
                <ArrowRight size={24} strokeWidth={2.5} />
              </button>
            </div>
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
            <span style={{ fontSize: '18px', color: 'white', fontWeight: 'bold', marginTop: '1.5px' }}>
              SocialStar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoPage;