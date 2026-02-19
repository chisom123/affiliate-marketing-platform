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
import { ArrowRight, RefreshCw, Gem, X } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const submitRatingFn = httpsCallable(functions, 'submitRating');


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

// Generate win code from fingerprint, linkId, and timestamp for uniqueness
const generateWinCode = (fingerprint, linkId) => {
  const timestamp = Date.now().toString(36).substring(Date.now().toString(36).length - 2);
  return `SS${fingerprint.substring(0, 3).toUpperCase()}${linkId.substring(0, 3).toUpperCase()}${timestamp.toUpperCase()}`;
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

// ThemeBadge component - flexible width with dynamic ellipsis
const ThemeBadge = ({ themeName }) => {
  if (!themeName) return null;
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '5px 10px',
      backgroundColor: '#4169E1',
      borderRadius: '20px',
      flexShrink: 1,
      minWidth: 0
    }}>
      <svg 
        width="19" 
        height="19" 
        viewBox="0 0 16 16" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, transform: 'scaleX(-1)' }}
      >
        <path 
          d="M2 3.5C2 2.67157 2.67157 2 3.5 2H7.58579C7.851 2 8.10536 2.10536 8.29289 2.29289L13.7071 7.70711C14.0976 8.09763 14.0976 8.73079 13.7071 9.12132L9.12132 13.7071C8.73079 14.0976 8.09763 14.0976 7.70711 13.7071L2.29289 8.29289C2.10536 8.10536 2 7.851 2 7.58579V3.5Z" 
          fill="white"
        />
        <circle cx="5.5" cy="5.5" r="1" fill="#4169E1"/>
      </svg>
      
      <span style={{
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0
      }}>
        {themeName}
      </span>
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
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState(false);
  const [pageOpenTracked, setPageOpenTracked] = useState(false);
  const [fingerprint, setFingerprint] = useState(null);
  const [isValidEnvironment, setIsValidEnvironment] = useState(true);
  const [interactions, setInteractions] = useState([]);
  const [loadingInteractions, setLoadingInteractions] = useState(true);
  const [earningsPerRating, setEarningsPerRating] = useState(0.25);
  const [downloadClickInProgress, setDownloadClickInProgress] = useState(false);
  
  // Image loading states
  const [profileImageLoading, setProfileImageLoading] = useState(true);
  const [backgroundImageLoading, setBackgroundImageLoading] = useState(true);

  // Slot machine states
  const [spins, setSpins] = useState([]);
  const [spinEarnings, setSpinEarnings] = useState([0, 0, 0]); // Track earnings for each spin slot
  const [spinsRemaining, setSpinsRemaining] = useState(3);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasStartedSpinning, setHasStartedSpinning] = useState(false);
  const [selectedRatingIndex, setSelectedRatingIndex] = useState(null);
  const [showRatingsList, setShowRatingsList] = useState(false);
  const [currentSpinEarnings, setCurrentSpinEarnings] = useState(0); // For notification display
  const [showWinScreen, setShowWinScreen] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [displayedEarnings, setDisplayedEarnings] = useState(0);
  const [dollarAmount, setDollarAmount] = useState(0);
  const [displayedDollars, setDisplayedDollars] = useState(0);
  
  // Dynamic viewport height state
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  
  // Bottom sheet drag state
  const [snapState, setSnapState] = useState('mid');
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const sheetRef = useRef(null);

  // Earnings notification state
  const [showEarningsNotification, setShowEarningsNotification] = useState(false);
  const [notificationKey, setNotificationKey] = useState(0);
  const earningsTimeoutRef = useRef(null);
  const animationTimerRef = useRef(null);

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
      }
    };

    loadEarningsRate();
  }, []);

  // Handle viewport changes (browser UI collapse/expand)
  useEffect(() => {
    const updateViewport = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      } else {
        setViewportHeight(window.innerHeight);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }
    
    window.addEventListener('resize', updateViewport);
    
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
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    
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

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (earningsTimeoutRef.current) {
        clearTimeout(earningsTimeoutRef.current);
      }
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
      }
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

  // Calculate base payout based on star rating
  const getBasePayout = (stars) => {
    const payoutTable = {
      5: 500,
      4: 400,
      3: 300,
      2: 200,
      1: 100
    };
    return payoutTable[stars] || 0;
  };

  // Get random multiplier based on weighted probabilities
  const getRandomMultiplier = () => {
    const random = Math.random() * 100; // 0-100
    
    if (random < 60) return 1;        // 60% chance
    if (random < 85) return 2;        // 25% chance (60 + 25 = 85)
    if (random < 95) return 3;        // 10% chance (85 + 10 = 95)
    if (random < 99) return 5;        // 4% chance (95 + 4 = 99)
    return 10;                         // 1% chance (99 + 1 = 100)
  };

  // Calculate final earnings with multiplier
  const calculateEarnings = (stars) => {
    const basePayout = getBasePayout(stars);
    const multiplier = getRandomMultiplier();
    return basePayout * multiplier;
  };

  // Convert tokens to dollar amount ($0.50 - $1.50)
  const convertTokensToDollars = (tokens) => {
    // Min tokens: 100 (1 star * 1x) -> $0.50
    // Max tokens: 5000 (5 stars * 10x) -> $1.50
    const minTokens = 100;
    const maxTokens = 5000;
    const minDollars = 0.50;
    const maxDollars = 1.50;
    
    // Linear scale between min and max
    const ratio = (tokens - minTokens) / (maxTokens - minTokens);
    const dollars = minDollars + (ratio * (maxDollars - minDollars));
    
    return Math.max(minDollars, Math.min(maxDollars, dollars));
  };

  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        if (!isInstagramApp() && !isDevelopment) {
          setIsValidEnvironment(false);
          setError('Please open this link in the Instagram app to rate stories');
          setLoading(false);
          return;
        }

        // In development always use a fresh dev_ fingerprint to bypass duplicate check
        if (isDevelopment) {
          const devFp = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setFingerprint(devFp);
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

        if (linkData.photoUrl) {
          setPhotoUrl(linkData.photoUrl);
        }

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

        if (!isDevelopment) {
          const existingRatingQuery = query(
            collection(db, 'ratings'),
            where('linkId', '==', linkData.id),
            where('fingerprint', '==', fingerprint)
          );
          const existingRatings = await getDocs(existingRatingQuery);
          
          if (!existingRatings.empty) {
            setHasAlreadyVoted(true);
            setShowRatingsList(true);
            
            const winCodeDocId = `${linkData.id}_${fingerprint}`;
            const winCodeRef = doc(db, 'pending_wins', winCodeDocId);
            const winCodeDoc = await getDoc(winCodeRef);
            
            if (winCodeDoc.exists()) {
              const winData = winCodeDoc.data();
              const earnings = winData.points || 0;
              const dollars = convertTokensToDollars(earnings);
              
              setTotalEarnings(earnings);
              setDollarAmount(dollars);
              setDisplayedEarnings(earnings);
              setDisplayedDollars(dollars);
            }
          }
        } else {
          console.log('Development mode: Skipping "already rated" check');
        }

        trackUniquePageOpen(linkData.id, fingerprint);
        
        // Check if user has already spun
        const hasSpun = await checkAndLoadSpinState(linkData.id, fingerprint);
        
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

  const trackUniquePageOpen = async (linkDocId, userFingerprint) => {
    if (pageOpenTracked) return;
    
    setPageOpenTracked(true);

    (async () => {
      try {
        const trackingDocId = `${linkDocId}_${userFingerprint}`;
        const trackingDocRef = doc(db, 'unique_page_opens', trackingDocId);
        
        const trackingDoc = await getDoc(trackingDocRef);
        
        if (!trackingDoc.exists()) {
          await setDoc(trackingDocRef, {
            linkId: linkDocId,
            fingerprint: userFingerprint,
            firstOpenedAt: serverTimestamp(),
            openCount: 1
          });

          await updateDoc(doc(db, 'rating_links', linkDocId), {
            totalPageOpens: increment(1),
            lastOpenedAt: serverTimestamp()
          });
        } else {
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

  const checkAndLoadSpinState = async (linkDocId, userFingerprint) => {
    if (isDevelopment) {
      console.log('Development mode: Skipping spin state check');
      return false;
    }
    
    try {
      const spinStateDocId = `${linkDocId}_${userFingerprint}`;
      const spinStateDocRef = doc(db, 'spin_states', spinStateDocId);
      
      const spinStateDoc = await getDoc(spinStateDocRef);
      
      if (spinStateDoc.exists()) {
        const data = spinStateDoc.data();
        const savedSpins = data.spins || [];
        const savedEarnings = data.earnings || [0, 0, 0];
        
        setSpins(savedSpins);
        setSpinEarnings(savedEarnings);
        
        // Calculate remaining spins based on how many they've already done
        const spinsUsed = savedSpins.filter(s => s !== undefined && s !== null).length;
        const remaining = 3 - spinsUsed;
        setSpinsRemaining(remaining);
        
        // Mark that spinning has started if any spins have been used
        if (spinsUsed > 0) {
          setHasStartedSpinning(true);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking spin state:', error);
      return false;
    }
  };

  const saveSpinState = async (linkDocId, userFingerprint, spinsArray, earningsArray) => {
    if (isDevelopment) {
      console.log('Development mode: Skipping spin state save');
      return;
    }
    
    try {
      const spinStateDocId = `${linkDocId}_${userFingerprint}`;
      const spinStateDocRef = doc(db, 'spin_states', spinStateDocId);
      
      await setDoc(spinStateDocRef, {
        linkId: linkDocId,
        fingerprint: userFingerprint,
        spins: spinsArray,
        earnings: earningsArray,
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving spin state:', error);
    }
  };

  const trackUniqueDownloadClick = async (linkDocId, userFingerprint) => {
    if (downloadClickInProgress) {
      console.log('Download click already in progress, ignoring duplicate');
      return;
    }
    
    setDownloadClickInProgress(true);
    
    try {
      const trackingDocId = `${linkDocId}_${userFingerprint}`;
      const trackingDocRef = doc(db, 'unique_download_clicks', trackingDocId);
      
      const trackingDoc = await getDoc(trackingDocRef);
      
      if (!trackingDoc.exists()) {
        await setDoc(trackingDocRef, {
          linkId: linkDocId,
          fingerprint: userFingerprint,
          firstClickedAt: serverTimestamp(),
          clickCount: 1
        });

        await updateDoc(doc(db, 'rating_links', linkDocId), {
          totalDownloadClicks: increment(1),
          lastDownloadClickAt: serverTimestamp()
        });
      } else {
        await updateDoc(trackingDocRef, {
          clickCount: increment(1),
          lastClickedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error tracking unique download click:', error);
    } finally {
      setTimeout(() => {
        setDownloadClickInProgress(false);
      }, 1500);
    }
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
        const aIsCurrentUser = a.fingerprint === fingerprint;
        const bIsCurrentUser = b.fingerprint === fingerprint;
        
        if (aIsCurrentUser && !bIsCurrentUser) return -1;
        if (!aIsCurrentUser && bIsCurrentUser) return 1;
        
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

  const getRecruiterId = async (affiliateId) => {
    try {
      const affiliateDoc = await getDoc(doc(db, 'affiliates', affiliateId));
      if (!affiliateDoc.exists()) {
        return null;
      }
      return affiliateDoc.data()?.recruitedBy;
    } catch (error) {
      console.error('Error getting recruiter ID:', error);
      return null;
    }
  };

  const submitRating = async (stars, points) => {
    const result = await submitRatingFn({
      linkId: linkData.linkId,
      affiliateId: affiliateId,
      stars: stars,
      fingerprint: fingerprint,
      spins: spins,
      spinEarnings: spinEarnings
    });
    return result.data.ratingId;
  };

  // ── Single spin: animates one slot and resolves with the final rating ──
  const runSingleSpin = (slotIndex, usedRatings) => {
    return new Promise((resolve) => {
      let spinCount = 0;
      const spinInterval = setInterval(() => {
        const randomRating = Math.floor(Math.random() * 5) + 1;
        setSpins(prev => {
          const newSpins = [...prev];
          newSpins[slotIndex] = randomRating;
          return newSpins;
        });

        spinCount++;
        if (spinCount >= 10) {
          clearInterval(spinInterval);

          // Final value — avoid duplicating an already-settled slot
          let finalRating;
          let attempts = 0;
          do {
            finalRating = Math.floor(Math.random() * 5) + 1;
            attempts++;
          } while (usedRatings.includes(finalRating) && attempts < 100);

          setSpins(prev => {
            const newSpins = [...prev];
            newSpins[slotIndex] = finalRating;
            return newSpins;
          });

          // Calculate & store earnings for this slot
          const earnings = calculateEarnings(finalRating);
          setCurrentSpinEarnings(earnings);
          setSpinEarnings(prev => {
            const newEarnings = [...prev];
            newEarnings[slotIndex] = earnings;
            return newEarnings;
          });

          resolve({ slotIndex, finalRating, earnings });
        }
      }, 100);
    });
  };

  // ── One button press → run all remaining spins in sequence ──
  const handleSpin = async () => {
    if (isSpinning || spinsRemaining <= 0 || hasAlreadyVoted) return;

    setIsSpinning(true);
    setHasStartedSpinning(true);
    const currentSpins = [...spins];
    const currentEarnings = [...spinEarnings];
    const settledRatings = currentSpins.filter(r => r !== undefined && r !== null);
    const totalToSpin = spinsRemaining;
    let slotOffset = 3 - spinsRemaining; // starting slot index

    for (let i = 0; i < totalToSpin; i++) {
      const slotIndex = slotOffset + i; // fills 0 → 1 → 2

      const { finalRating, earnings } = await runSingleSpin(slotIndex, settledRatings);
      settledRatings.push(finalRating);
      currentSpins[slotIndex] = finalRating;
      currentEarnings[slotIndex] = earnings;

      setSpinsRemaining(prev => prev - 1);

      // Short pause between spins so the user can see each result land
      if (i < totalToSpin - 1) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }

    // Persist final spin state to Firestore using the local arrays directly
    if (linkData && fingerprint) {
      saveSpinState(linkData.id, fingerprint, currentSpins, currentEarnings);
    }

    setIsSpinning(false);
  };

  const handleSelectRating = async (index, rating) => {
    if (selectedRatingIndex !== null || hasAlreadyVoted) return;
    
    setSelectedRatingIndex(index);
    
    // ✅ Calculate total earnings from ALL 3 spins (not just selected one)
    const total = spinEarnings.reduce((sum, points) => sum + points, 0);
    const dollars = convertTokensToDollars(total);
    
    try {
      await submitRating(rating, total);
      
      // Set the target values first
      setTotalEarnings(total);
      setDollarAmount(dollars);
      
      // Reset displayed values to 0 before showing win screen
      setDisplayedEarnings(0);
      setDisplayedDollars(0);
      
      // Show win screen
      setShowWinScreen(true);
      
      // Start counting animation after a brief delay to ensure state is set
      setTimeout(() => {
        animateCounter(total, dollars);
      }, 300);
      
      // Set hasAlreadyVoted after animation starts
      setTimeout(() => {
        setHasAlreadyVoted(true);
      }, 800);
      
    } catch (error) {
      console.error('Error submitting rating:', error);
      setSelectedRatingIndex(null);
      alert('Failed to submit rating. Please try again.');
    }
  };

  // Animate the earnings counter
  const animateCounter = (targetAmount, targetDollars) => {
    // Clear any existing animation
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
    }

    const duration = 2000; // 2 seconds
    const steps = 60;
    const tokenIncrement = targetAmount / steps;
    const dollarIncrement = targetDollars / steps;
    let currentTokens = 0;
    let currentDollars = 0;
    let step = 0;

    animationTimerRef.current = setInterval(() => {
      step++;
      currentTokens += tokenIncrement;
      currentDollars += dollarIncrement;
      
      if (step >= steps) {
        setDisplayedEarnings(targetAmount);
        setDisplayedDollars(targetDollars);
        clearInterval(animationTimerRef.current);
        animationTimerRef.current = null;
      } else {
        setDisplayedEarnings(Math.floor(currentTokens));
        setDisplayedDollars(currentDollars);
      }
    }, duration / steps);
  };

  const handleContinuePlaying = async () => {
    if (linkData && fingerprint) {
      await trackUniqueDownloadClick(linkData.id, fingerprint);
    }
    
    window.location.href = `/info/${affiliateId}/${linkId}`;
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartY(e.clientY);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    
    const deltaY = e.clientY - dragStartY;
    
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
        if (snapState === 'min') newSnapState = 'mid';
        else if (snapState === 'mid') newSnapState = 'max';
      } else {
        if (snapState === 'max') newSnapState = 'mid';
        else if (snapState === 'mid') newSnapState = 'min';
      }
    }
    
    setSnapState(newSnapState);
    setIsDragging(false);
    setDragOffset(0);
    setDragStartY(0);
  };

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

      {/* Navigation Bar */}
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
            gap: '15px',
            backgroundColor: 'transparent',
            padding: '5px 16px',
            flexWrap: 'nowrap',
            overflow: 'hidden'
          }}>
            {affiliateProfilePic && (
              <div style={{
                position: 'relative',
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0
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
              whiteSpace: 'nowrap',
              flexShrink: 1
            }}>
              {affiliateFirstName}
            </span>
            
            {linkData?.theme && (
              <ThemeBadge themeName={linkData.theme} />
            )}
          </div>
        </div>
      </div>

      {/* Win Screen - Full screen overlay */}
      {showWinScreen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(16, 185, 129, 1)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          {/* Close button */}
          <button
            onClick={() => setShowWinScreen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={32} color="white" strokeWidth={3} />
          </button>

          {/* Win amount */}
          <div style={{
            marginBottom: '40px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '18px',
              color: 'white',
              marginBottom: '20px',
              fontWeight: '600'
            }}>
              You Won
            </div>
            <div style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '15px',
              marginBottom: '15px'
            }}>
              <span>+{displayedEarnings}</span>
              <Gem size={60} color="white" strokeWidth={2} />
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '600',
              color: 'white',
              opacity: 0.9
            }}>
              $50 Prize Pool
            </div>
          </div>

          {/* Download button */}
          <button
            onClick={handleContinuePlaying}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '20px',
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '200px',
              color: 'black',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <span>Claim Winnings</span>
          </button>
        </div>
      )}

      {/* Winnings Footer - shown after user has voted and win screen is closed */}
      {hasAlreadyVoted && !showWinScreen && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#1A2245',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          zIndex: 30,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Winnings Display */}
          <div style={{
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '10px',
              fontWeight: '600'
            }}>
              You Won
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <span>+{totalEarnings}</span>
              <Gem size={42} color="#10B981" strokeWidth={2} />
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'white'
            }}>
              $50 Prize Pool
            </div>
          </div>

          {/* Claim Winnings Button */}
          <button
            onClick={handleContinuePlaying}
            style={{
              width: '100%',
              padding: '18px',
              backgroundColor: '#4169E1',
              border: 'none',
              borderRadius: '200px',
              color: '#FFF',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'transform 0.2s ease'
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
            <span>Claim Winnings</span>
          </button>
        </div>
      )}


      {/* Earnings Notification - slides up behind slot machine footer */}
      <div 
        key={notificationKey}
        style={{
          position: 'absolute',
          bottom: showEarningsNotification ? 0 : '-100%',
          left: 0,
          right: 0,
          height: '300px',
          background: '#10B981',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          zIndex: 25,
          transition: 'bottom 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
          pointerEvents: 'none'
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: '18px',
          gap: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              fontSize: '25px',
              fontWeight: 'bold',
              color: 'white'
            }}>
              +{Math.round(currentSpinEarnings)}
            </div>
            <Gem size={38} color="white" strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Slot Machine Footer */}
      <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#1A2245',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          zIndex: 30,
          padding: '20px',
          display: (hasAlreadyVoted && !showWinScreen) ? 'none' : 'flex',
          flexDirection: 'column',
          gap: '20px',
          pointerEvents: selectedRatingIndex !== null ? 'none' : 'auto'
        }}>
          {/* Instruction Text */}
          <div style={{
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 1)',
            fontSize: '17px',
            fontWeight: '600'
          }}>
            {!hasStartedSpinning && 'Tap spin'}
            {hasStartedSpinning && spinsRemaining > 0 && 'Spinning...'}
            {spinsRemaining === 0 && 'Pick a rating'}
          </div>

          {/* Spin Results */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '15px',
            minHeight: '70px',
            alignItems: 'center'
          }}>
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                onClick={() => spinsRemaining === 0 && spins[index] && handleSelectRating(index, spins[index])}
                disabled={spinsRemaining > 0 || selectedRatingIndex !== null || !spins[index]}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '5px',
                  backgroundColor: '#2A3A6B',
                  border: spinsRemaining === 0 && spins[index] ? '2px solid rgba(255, 255, 255, 0.3)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: spinsRemaining === 0 && spins[index] && selectedRatingIndex === null ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  transform: selectedRatingIndex === index ? 'scale(1.1)' : 'scale(1)',
                  opacity: spins[index] ? 1 : 0.3
                }}
              >
                {spins[index] && (
                  <>
                    <span style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: 'white'
                    }}>
                      {spins[index]}
                    </span>
                    <span style={{
                      fontSize: '16px',
                      color: 'white'
                    }}>
                      ★
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Spin Button */}
          <button
            onClick={handleSpin}
            disabled={isSpinning || spinsRemaining === 0}
            style={{
              width: '100%',
              padding: '18px',
              backgroundColor: spinsRemaining > 0 && !isSpinning ? '#4169E1' : '#666',
              border: 'none',
              borderRadius: '200px',
              color: spinsRemaining > 0 && !isSpinning ? '#FFF' : '#c2c2c2',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: spinsRemaining > 0 && !isSpinning ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'transform 0.2s ease',
              opacity: 1
            }}
            onMouseDown={(e) => {
              if (spinsRemaining > 0 && !isSpinning) {
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
            <RefreshCw 
              size={22} 
              strokeWidth={2.5}
              style={{ 
                animation: isSpinning ? 'spin 0.8s linear infinite' : 'none'
              }} 
            />
            <span>
              {isSpinning ? 'Spinning...' : 'Spin'}
            </span>
          </button>
        </div>


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