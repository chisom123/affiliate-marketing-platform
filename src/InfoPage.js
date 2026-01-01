import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
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

const InfoPage = () => {
  const { affiliateId, linkId } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [competitionName, setCompetitionName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [imageLoading, setImageLoading] = useState(true);
  const [showScrollFade, setShowScrollFade] = useState(true);
  const [fingerprint, setFingerprint] = useState(null);
  const [continueClickInProgress, setContinueClickInProgress] = useState(false);

  const handleScrollNames = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target;
    // Hide fade when within 50px of the end
    const isNearEnd = scrollLeft + clientWidth >= scrollWidth - 50;
    setShowScrollFade(!isNearEnd);
  };

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

  const suggestedNames = [
    'Selfie War',
    'Competition Time!',
    'OOTD',
    'Food',
    'Party Time',
    'Campus Life',
    'Woke Up Like This',
    'Vibez',
    'Weekend Mode'
  ];

  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const isPhoneValid = () => {
    const numbers = phoneNumber.replace(/\D/g, '');
    return numbers.length === 10;
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 2));
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
          
          // Track each step separately
          const updateData = {
            lastInfoContinueClickAt: serverTimestamp()
          };
          
          if (stepName === 'step0_competition_name') {
            updateData.totalInfoContinueClicksStep0 = increment(1);
          } else if (stepName === 'step1_phone_number') {
            updateData.totalInfoContinueClicksStep1 = increment(1);
          } else if (stepName === 'step2_download') {
            updateData.totalInfoContinueClicksStep2 = increment(1);
          }
          
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

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const NavigationBar = ({ step }) => {
    const showBackButton = step !== 0 && step !== 2; // Show back on phone step only
    const showSkipButton = false; // No skip button anywhere
    
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px',
        zIndex: 100
      }}>
        {/* Left: Back Button */}
        <div style={{ width: '60px' }}>
          {showBackButton && (
            <button
              onClick={prevStep}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                margin: '-10px'
              }}
            >
              <ChevronLeft size={24} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Center: Logo */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
        </div>

        {/* Right: Skip Button */}
        <div style={{ width: '60px', display: 'flex', justifyContent: 'flex-end' }}>
          {showSkipButton && (
            <button
              onClick={() => nextStep()}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '10px'
              }}
            >
              Skip
            </button>
          )}
        </div>
      </div>
    );
  };

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

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Hide scrollbar for suggested names */
      div::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Step 0: Competition Name
  const renderCompetitionName = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        paddingTop: '60px',
        maxWidth: '500px',
        width: '100%',
        margin: '0 auto'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: 'clamp(1.5rem, 5vw, 2rem)',
          fontWeight: 'bold',
          margin: '0 0 15px 0',
          lineHeight: '1.3',
          textAlign: 'center'
        }}>
          Start a photo competition with your friends!
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 'clamp(0.9rem, 3vw, 1rem)',
          margin: '0 0 30px 0',
          textAlign: 'center'
        }}>
          Pick a name or create your own
        </p>

        <input
          type="text"
          value={competitionName}
          onChange={(e) => setCompetitionName(e.target.value)}
          placeholder="Competition Name"
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '18px 20px',
            fontSize: '1.1rem',
            fontWeight: '600',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            color: 'white',
            caretColor: 'white',
            outline: 'none',
            boxSizing: 'border-box',
            margin: '0 auto 20px auto',
            display: 'block'
          }}
        />

        {/* Suggested Names Row - Full width with edge-to-edge scroll */}
        <div style={{
          position: 'relative',
          marginBottom: '20px',
          marginLeft: 'calc(-1 * max(20px, (100vw - 500px) / 2))',
          marginRight: 'calc(-1 * max(20px, (100vw - 500px) / 2))'
        }}>
          <div 
            onScroll={handleScrollNames}
            style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingLeft: 'max(20px, (100vw - 500px) / 2)',
            paddingRight: 'max(20px, (100vw - 500px) / 2)',
            paddingTop: '5px',
            paddingBottom: '5px',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {suggestedNames.map(name => (
              <button
                key={name}
                onClick={() => setCompetitionName(name)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '200px',
                  border: competitionName === name 
                    ? '2px solid #4169E1' 
                    : '1px solid rgba(255, 255, 255, 0.3)',
                  backgroundColor: competitionName === name 
                    ? 'rgba(65, 105, 225, 0.2)' 
                    : 'transparent',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
              >
                {name}
              </button>
            ))}
          </div>
          
          {/* Fade gradient hint on right edge - only show when not scrolled to end */}
          {showScrollFade && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '100px',
              background: 'linear-gradient(to right, transparent, #10183C)',
              pointerEvents: 'none',
              transition: 'opacity 0.3s ease',
              opacity: 1
            }} />
          )}
        </div>

        <button
          onClick={() => {
            trackUniqueContinueClick('step0_competition_name');
            nextStep();
          }}
          disabled={!competitionName.trim()}
          style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: competitionName.trim() ? '#4169E1' : 'rgba(65, 105, 225, 0.5)',
            color: 'white',
            padding: '18px 0',
            margin: '0 auto',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: '200px',
            cursor: competitionName.trim() ? 'pointer' : 'not-allowed',
            opacity: competitionName.trim() ? 1 : 0.6
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // Step 1: Phone Number
  const renderPhoneNumber = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        paddingTop: '60px',
        maxWidth: '500px',
        width: '100%',
        margin: '0 auto'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: 'clamp(1.5rem, 5vw, 2rem)',
          fontWeight: 'bold',
          margin: '0 0 15px 0',
          lineHeight: '1.3',
          textAlign: 'center'
        }}>
          Create an account
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 'clamp(0.9rem, 3vw, 1rem)',
          margin: '0 0 40px 0',
          textAlign: 'center'
        }}>
          Enter your phone number to get started
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '400px',
          margin: '0 auto 20px auto',
          width: '100%',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '18px 20px',
            fontSize: '1.1rem',
            fontWeight: '600',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            borderRight: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            +1
          </div>
          <input
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder="(555) 123-4567"
            maxLength={14}
            style={{
              flex: 1,
              padding: '18px 20px',
              fontSize: '1.1rem',
              fontWeight: '600',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: 'white',
              caretColor: 'white',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={() => {
            trackUniqueContinueClick('step1_phone_number');
            nextStep();
          }}
          disabled={!isPhoneValid()}
          style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: isPhoneValid() ? '#4169E1' : 'rgba(65, 105, 225, 0.5)',
            color: 'white',
            padding: '18px 0',
            margin: '0 auto',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: '200px',
            cursor: isPhoneValid() ? 'pointer' : 'not-allowed',
            opacity: isPhoneValid() ? 1 : 0.6
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // Step 2: Download App
  const renderDownloadApp = () => (
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
      {/* Combined Container: Title, Subtitle, Leaderboard, and Button */}
      <div style={{
        width: '100%',
        maxWidth: '500px'
      }}>
        <div style={{
          backgroundColor: '#1A2245',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          {/* Title and Subtitle */}
          <div style={{
            padding: '30px 20px 20px 20px'
          }}>
            <h1 style={{
              color: 'white',
              fontSize: 'clamp(1.5rem, 5vw, 2rem)',
              fontWeight: 'bold',
              margin: '0 0 15px 0',
              lineHeight: '1.3',
              textAlign: 'center'
            }}>
              Your competition is ready!
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 'clamp(0.9rem, 3vw, 1rem)',
              margin: '0',
              lineHeight: '1.5',
              textAlign: 'center'
            }}>
              Start playing with friends
            </p>
          </div>

          {/* Leaderboard Rows */}
          {[
            { rank: 1, name: 'Me', stars: 0, isCurrentUser: true, profileUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/ffdb2764778f0f35c846ec597955c5c1.jpg?alt=media&token=3c1b808f-8345-4276-a9c5-ca4964c13498' },
            { rank: 2, name: null, stars: 0, isCurrentUser: false, profileUrl: null },
            { rank: 3, name: null, stars: 0, isCurrentUser: false, profileUrl: null }
          ].map((user, index) => (
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
                    backgroundColor: '#3B4374'
                  }}>
                    <img 
                      src={user.profileUrl}
                      alt={user.name || 'User'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
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
              
              {index < 2 && (
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
              trackUniqueContinueClick('step2_download');
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
      </div>
    </div>
  );

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#10183C',
      position: 'relative'
    }}>
      <NavigationBar step={currentStep} />
      
      {currentStep === 0 && renderCompetitionName()}
      {currentStep === 1 && renderPhoneNumber()}
      {currentStep === 2 && renderDownloadApp()}
    </div>
  );
};

export default InfoPage;