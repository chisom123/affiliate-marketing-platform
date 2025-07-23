// RATING PAGE COMPONENT
// Enhanced with social media in-app browser detection
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
  serverTimestamp
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';

// Utility function to generate device fingerprint for fraud prevention
const generateFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Device fingerprint', 2, 2);
  
  return {
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    userAgent: navigator.userAgent.substring(0, 100),
    canvas: canvas.toDataURL().substring(0, 100),
    timestamp: Date.now()
  };
};

// Hash function for IP/fingerprint
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// Detect social media in-app browsers
const isSocialMediaApp = () => {
  const ua = navigator.userAgent.toLowerCase();
  
  // Instagram detection
  const isInstagram = /instagram/i.test(ua);
  
  // Snapchat detection - uses WebView with specific identifiers
  const isSnapchat = ua.includes('snapchat') || 
                     ua.includes('snap_ios') || 
                     ua.includes('snap_android');
  
  // Facebook in-app browser (optional)
  const isFacebook = /fban|fbav|fb_iab|fb4a/i.test(ua);
  
  return isInstagram || isSnapchat || isFacebook;
};

// Generate a client token that persists across sessions
const getClientToken = () => {
  let token = localStorage.getItem('socialstar_client_token');
  if (!token) {
    token = 'ct_' + Math.random().toString(36).substr(2, 12);
    localStorage.setItem('socialstar_client_token', token);
  }
  return token;
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

  // Check if user is in a social media app
  const [isValidBrowser, setIsValidBrowser] = useState(false);

  useEffect(() => {
    // Check browser environment immediately
    const validBrowser = isSocialMediaApp();
    setIsValidBrowser(validBrowser);
    
    if (!validBrowser) {
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

  // Submit rating with enhanced fraud prevention
  const submitRating = async () => {
    if (!isValidBrowser) {
      setError('Invalid browser detected. Please rate from Instagram or Snapchat.');
      return;
    }

    if (rating === 0) {
      alert('Please select a star rating first!');
      return;
    }

    setSubmitting(true);

    try {
      // Check if user has already rated this link
      const clientToken = getClientToken();
      const alreadyRated = localStorage.getItem(`rated_${linkId}`);
      
      if (alreadyRated) {
        setError('You have already rated this story!');
        setSubmitting(false);
        return;
      }

      // Generate device fingerprint
      const fingerprint = generateFingerprint();
      const fingerprintHash = simpleHash(JSON.stringify(fingerprint));

      // Create rating document
      const ratingData = {
        linkId: linkData.id,
        linkIdString: linkData.linkId,
        affiliateId: affiliateId,
        rating: rating,
        createdAt: serverTimestamp(),
        fingerprint: fingerprint,
        fingerprintHash: fingerprintHash,
        referrer: document.referrer,
        validated: true,
        earnings: 0.01,
        clientToken: clientToken,
        sourceApp: isSocialMediaApp() ? 
          (navigator.userAgent.includes('Instagram') ? 'instagram' : 'snapchat') : 
          'unknown'
      };

      await addDoc(collection(db, 'ratings'), ratingData);

      // Update rating link stats
      await updateDoc(doc(db, 'rating_links', linkData.id), {
        totalRatings: increment(1),
        earnings: increment(0.01),
        lastRatedAt: serverTimestamp()
      });

      // Update affiliate total stats
      await updateDoc(doc(db, 'affiliates', affiliateId), {
        totalRatings: increment(1),
        totalEarnings: increment(0.01)
      });

      // Mark as rated in localStorage
      localStorage.setItem(`rated_${linkId}`, 'true');
      setSubmitted(true);

    } catch (error) {
      console.error('Error submitting rating:', error);
      setError('Failed to submit rating. Please try again.');
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
                <div style={{fontSize: '24px'}}></div>
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
          {navigator.userAgent.includes('Instagram') ? 'Instagram' : 'Snapchat'}
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