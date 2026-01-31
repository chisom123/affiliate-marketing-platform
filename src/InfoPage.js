import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from './firebase';
import { ArrowRight } from 'lucide-react';
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

  // Set loading to false after initialization
  useEffect(() => {
    if (isValidEnvironment && fingerprint) {
      setLoading(false);
    }
  }, [isValidEnvironment, fingerprint]);

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

  // Slot machine animation states
  const [slots, setSlots] = useState([null, null, null]);
  const [currentEarning, setCurrentEarning] = useState(null);
  const [showEarning, setShowEarning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Start slot machine animation on mount
  useEffect(() => {
    if (!isValidEnvironment || !fingerprint) return;

    // Start animation after a brief delay
    const startDelay = setTimeout(() => {
      animateSlots();
    }, 500);

    return () => clearTimeout(startDelay);
  }, [isValidEnvironment, fingerprint]);

  const animateSlots = () => {
    setIsAnimating(true);
    
    // Reset to exactly 3 empty slots at the start
    const initialSlots = [null, null, null];
    setSlots(initialSlots);
    
    // Track used ratings to prevent duplicates - needs to persist across animateNextSlot calls
    const usedRatings = [];
    
    // Animate each slot sequentially
    const animateNextSlot = (currentSlot) => {
      if (currentSlot >= 3) {
        setIsAnimating(false);
        // Restart animation after a pause
        setTimeout(() => {
          animateSlots();
        }, 3000);
        return;
      }

      // Shuffle effect for current slot
      let shuffleCount = 0;
      const shuffleInterval = setInterval(() => {
        const randomRating = Math.floor(Math.random() * 5) + 1;
        
        setSlots(prevSlots => {
          // Create a clean array with exactly 3 elements
          const slot0 = currentSlot === 0 ? randomRating : prevSlots[0];
          const slot1 = currentSlot === 1 ? randomRating : prevSlots[1];
          const slot2 = currentSlot === 2 ? randomRating : prevSlots[2];
          return [slot0, slot1, slot2];
        });

        shuffleCount++;
        if (shuffleCount >= 10) {
          clearInterval(shuffleInterval);
          
          // Final value for this slot - ensure it's not a duplicate
          let finalRating;
          let attempts = 0;
          do {
            finalRating = Math.floor(Math.random() * 5) + 1;
            attempts++;
          } while (usedRatings.includes(finalRating) && attempts < 100);
          
          // Add to used ratings BEFORE setting state
          usedRatings.push(finalRating);
          
          console.log(`Slot ${currentSlot}: ${finalRating}, Used so far:`, usedRatings);
          
          // Random earning between $0.10 and $1.00
          const randomEarnings = [0.10, 0.25, 0.50, 0.75, 1.00];
          const finalEarning = randomEarnings[Math.floor(Math.random() * randomEarnings.length)];
          
          setSlots(prevSlots => {
            // Create a clean array with exactly 3 elements
            const slot0 = currentSlot === 0 ? finalRating : prevSlots[0];
            const slot1 = currentSlot === 1 ? finalRating : prevSlots[1];
            const slot2 = currentSlot === 2 ? finalRating : prevSlots[2];
            return [slot0, slot1, slot2];
          });
          
          // Flash the earning amount
          setCurrentEarning(finalEarning);
          setShowEarning(true);

          // Hide the earning flash after 800ms
          setTimeout(() => {
            setShowEarning(false);
          }, 800);

          // Move to next slot
          setTimeout(() => animateNextSlot(currentSlot + 1), 400);
        }
      }, 100);
    };

    animateNextSlot(0);
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
      minHeight: '100vh',
      backgroundColor: '#10183C',
      position: 'relative'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes flashIn {
          0% { 
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
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
        {/* Combined Container: Title, Slot Animation, and Button */}
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
              padding: '30px 20px',
              textAlign: 'center'
            }}>
              <h1 style={{
                color: 'white',
                fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                fontWeight: 'bold',
                margin: '0',
                lineHeight: '1.25'
              }}>
                Win money rating your friends' photos
              </h1>
            </div>

            {/* Slot Machine Animation */}
            <div style={{
              padding: '40px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '30px'
            }}>
              {/* Slot Boxes */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '15px'
              }}>
                {slots.slice(0, 3).map((rating, index) => (
                  <div
                    key={index}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      backgroundColor: '#2A3A6B',
                      border: '3px solid rgba(255, 255, 255, 0.3)',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      transform: isAnimating ? 'scale(1.05)' : 'scale(1)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '2px'
                      }}>
                        {rating !== null && (
                          <span style={{
                            fontSize: '32px',
                            fontWeight: 'bold',
                            color: 'white',
                            lineHeight: '1'
                          }}>
                            {rating}
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: '20px',
                        color: 'white',
                        lineHeight: '1'
                      }}>
                        ★
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Single Flashing Win Indicator */}
              <div style={{
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {showEarning && currentEarning !== null && (
                  <div
                    style={{
                      padding: '12px 24px',
                      borderRadius: '25px',
                      backgroundColor: '#22C55E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'flashIn 0.3s ease-in-out',
                      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
                    }}
                  >
                    <span style={{
                      color: 'white',
                      fontSize: '24px',
                      fontWeight: 'bold'
                    }}>
                      +${currentEarning.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

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
                padding: '30px 20px',
                fontSize: '22px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: 'none',
                borderRadius: '0',
                cursor: 'pointer'
              }}
            >
              <span>Continue</span>
              <ArrowRight size={34} strokeWidth={2.5} style={{ marginLeft: 'auto' }} />
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