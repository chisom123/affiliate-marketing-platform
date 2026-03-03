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
  const [copyClickInProgress, setCopyClickInProgress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isValidEnvironment, setIsValidEnvironment] = useState(true);
  const [claimCode, setClaimCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [hasEverCopied, setHasEverCopied] = useState(false);
  const [linkData, setLinkData] = useState(null);
  const [openingApp, setOpeningApp] = useState(false);

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
        
      } catch (error) {
        console.error('Error generating fingerprint:', error);
        const fallbackFp = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setFingerprint(fallbackFp);
        localStorage.setItem(`info_fingerprint_${linkId}`, fallbackFp);
      }
    };

    initializeFingerprint();
  }, [linkId]);

  // Fetch the win code from Firestore after fingerprint is ready
  useEffect(() => {
    const fetchWinCode = async () => {
      if (!fingerprint || !linkId) return;

      try {
        const linksQuery = query(
          collection(db, 'rating_links'),
          where('linkId', '==', linkId)
        );
        const linkSnapshot = await getDocs(linksQuery);
        
        if (linkSnapshot.empty) {
          setError('Rating link not found');
          setLoading(false);
          return;
        }

        const linkDoc = linkSnapshot.docs[0];
        const linkData = { id: linkDoc.id, ...linkDoc.data() };
        setLinkData(linkData);

        const winCodeDocId = `${linkData.id}_${fingerprint}`;
        const winCodeRef = doc(db, 'pending_wins', winCodeDocId);
        const winCodeDoc = await getDoc(winCodeRef);

        if (winCodeDoc.exists()) {
          const savedCode = winCodeDoc.data().code;
          setClaimCode(savedCode);
          setLoading(false);
        } else {
          setError('No winnings to claim. Please rate first.');
          setLoading(false);
        }
        
      } catch (error) {
        console.error('Error fetching win code:', error);
        setError('Failed to load your winnings');
        setLoading(false);
      }
    };

    if (isValidEnvironment && fingerprint) {
      fetchWinCode();
    }
  }, [fingerprint, linkId, isValidEnvironment]);

  // Track unique code copy
  const trackUniqueCodeCopy = async () => {
    if (copyClickInProgress || !fingerprint || !linkData) return;
    setCopyClickInProgress(true);

    (async () => {
      try {
        const trackingDocId = `${linkData.id}_${fingerprint}`;
        const trackingDocRef = doc(db, 'unique_code_copies', trackingDocId);
        const trackingDoc = await getDoc(trackingDocRef);

        if (!trackingDoc.exists()) {
          await setDoc(trackingDocRef, {
            linkId: linkData.id,
            fingerprint,
            firstCopiedAt: serverTimestamp(),
            copyCount: 1
          });
          await updateDoc(doc(db, 'rating_links', linkData.id), {
            totalCodeCopies: increment(1),
            lastCodeCopiedAt: serverTimestamp()
          });
        } else {
          await updateDoc(trackingDocRef, {
            copyCount: increment(1),
            lastCopiedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error tracking code copy:', error);
      } finally {
        setTimeout(() => setCopyClickInProgress(false), 1500);
      }
    })();
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(claimCode).then(() => {
      setCodeCopied(true);
      setHasEverCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
      trackUniqueCodeCopy();
    });
  };

  // Track unique continue button click
  const trackUniqueContinueClick = async (stepName) => {
    if (continueClickInProgress || !fingerprint || !linkId || !linkData) {
      if (continueClickInProgress) {
        console.log('Continue click already in progress, ignoring duplicate');
      }
      return;
    }
    
    setContinueClickInProgress(true);
    
    (async () => {
      try {
        const trackingDocId = `${linkData.id}_${fingerprint}_${stepName}`;
        const trackingDocRef = doc(db, 'unique_info_continue_clicks', trackingDocId);
        
        const trackingDoc = await getDoc(trackingDocRef);
        
        if (!trackingDoc.exists()) {
          await setDoc(trackingDocRef, {
            linkId: linkData.id,
            fingerprint: fingerprint,
            stepName: stepName,
            firstClickedAt: serverTimestamp(),
            clickCount: 1
          });

          const linkDocRef = doc(db, 'rating_links', linkData.id);
          
          const updateData = {
            lastInfoContinueClickAt: serverTimestamp(),
            totalInfoContinueClicksDownload: increment(1)
          };
          
          await updateDoc(linkDocRef, updateData);
        } else {
          await updateDoc(trackingDocRef, {
            clickCount: increment(1),
            lastClickedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error tracking unique continue click:', error);
      } finally {
        setTimeout(() => {
          setContinueClickInProgress(false);
        }, 1500);
      }
    })();
  };

  const handleOpenSocialStar = () => {
    if (!hasEverCopied) return;

    setOpeningApp(true);
    trackUniqueContinueClick('download');

    const deepLink = `socialstar://redeem/${claimCode}`;
    const appStoreURL = 'https://apps.apple.com/app/socialstar-app/id6473705189';

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(fallbackTimer);
        setOpeningApp(false);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };

    const handleBlur = () => {
      clearTimeout(fallbackTimer);
      setOpeningApp(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    const fallbackTimer = setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      setOpeningApp(false);
      window.location.href = appStoreURL;
    }, 1500);

    window.location.href = deepLink;
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
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%'
              }}>
                <h1 style={{
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  margin: '0',
                }}>
                  Claim Winnings
                </h1>
                <span style={{
                  backgroundColor: '#00AA00',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  padding: '5px 12px',
                  borderRadius: '200px',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.3px'
                }}>
                  $50 Prize Pool
                </span>
              </div>
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
                  backgroundColor: codeCopied ? '#00AA00' : '#4169E1',
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
                  backgroundColor: codeCopied ? '#00AA00' : '#4169E1',
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
                <span>Copy Code</span>
              </button>
            </div>

            {/* Step 2: Open SocialStar */}
            <div style={{
              padding: '20px 20px 30px 20px',
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
                onClick={handleOpenSocialStar}
                disabled={!hasEverCopied || openingApp}
                style={{
                  width: '100%',
                  padding: '18px',
                  backgroundColor: hasEverCopied ? '#4169E1' : '#2A3A6B',
                  border: 'none',
                  borderRadius: '200px',
                  color: hasEverCopied ? '#FFF' : 'rgba(255, 255, 255, 0.4)',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: hasEverCopied && !openingApp ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease'
                }}
                onMouseDown={(e) => {
                  if (hasEverCopied && !openingApp) e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  if (hasEverCopied && !openingApp) e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {openingApp ? (
                  <div style={{
                    width: '22px',
                    height: '22px',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '3px solid #FFF',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                ) : (
                  <span>Open SocialStar</span>
                )}
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