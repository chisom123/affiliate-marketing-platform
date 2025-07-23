// RATING PAGE COMPONENT
// Purpose: Mobile-optimized page for rating Instagram/Snapchat stories
// Features: Star rating, fraud prevention, app download prompt, analytics
// URL Format: /rate/:affiliateId/:linkId

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
    userAgent: navigator.userAgent.substring(0, 100), // Truncate for storage
    canvas: canvas.toDataURL().substring(0, 100), // Truncate canvas fingerprint
    timestamp: Date.now()
  };
};

// Hash function for IP/fingerprint (client-side approximation)
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
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

  // Load rating link and affiliate data
  useEffect(() => {
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

    if (affiliateId && linkId) {
      loadData();
    }
  }, [affiliateId, linkId]);

  // Submit rating with fraud prevention
  const submitRating = async () => {
    if (rating === 0) {
      alert('Please select a star rating first!');
      return;
    }

    setSubmitting(true);

    try {
      // Generate device fingerprint
      const fingerprint = generateFingerprint();
      const fingerprintHash = simpleHash(JSON.stringify(fingerprint));

      // Check for recent ratings from same fingerprint (basic fraud prevention)
      const recentRatingsQuery = query(
        collection(db, 'ratings'),
        where('fingerprintHash', '==', fingerprintHash)
      );
      const recentRatings = await getDocs(recentRatingsQuery);
      
      // Check if this fingerprint has rated in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentRating = recentRatings.docs.find(doc => {
        const ratingTime = doc.data().createdAt?.toDate();
        return ratingTime && ratingTime > oneHourAgo;
      });

      if (recentRating) {
        setError('You can only rate once per hour. Thanks for your enthusiasm!');
        setSubmitting(false);
        return;
      }

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
        validated: true, // Will be updated by fraud detection later
        earnings: 0.01 // £0.01 per rating
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
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>Oops!</h2>
          <p style={{ color: '#6c757d', marginBottom: '30px' }}>{error}</p>
          <a 
            href="https://socialstar.app" 
            style={{ 
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 'bold'
            }}
          >
            Download SocialStar App
          </a>
        </div>
      </div>
    );
  }

  // Success state - show app download prompt
  if (submitted) {
    return (
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
          {/* Success animation */}
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

          {/* App Store Buttons */}
          <div style={{ marginBottom: '20px' }}>
            <a 
              href="https://apps.apple.com/app/socialstar" 
              style={{ 
                display: 'inline-block',
                margin: '0 10px 10px 0',
                textDecoration: 'none'
              }}
            >
              <img 
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTIwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiByeD0iNSIgZmlsbD0iYmxhY2siLz4KPHRleHQgeD0iNjAiIHk9IjI1IiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RG93bmxvYWQgb24gQXBwIFN0b3JlPC90ZXh0Pgo8L3N2Zz4K"
                alt="Download on App Store"
                style={{ height: '40px' }}
              />
            </a>
            
            <a 
              href="https://play.google.com/store/apps/details?id=com.socialstar" 
              style={{ 
                display: 'inline-block',
                margin: '0 0 10px 10px',
                textDecoration: 'none'
              }}
            >
              <img 
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTIwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiByeD0iNSIgZmlsbD0iYmxhY2siLz4KPHRleHQgeD0iNjAiIHk9IjI1IiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+R2V0IGl0IG9uIEdvb2dsZSBQbGF5PC90ZXh0Pgo8L3N2Zz4K"
                alt="Get it on Google Play"
                style={{ height: '40px' }}
              />
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
      {/* Header */}
      <div style={{ 
        backgroundColor: 'white',
        padding: '20px',
        borderBottom: '1px solid #dee2e6',
        textAlign: 'center'
      }}>
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

      {/* Content Preview */}
      <div style={{ 
        padding: '30px 20px',
        textAlign: 'center'
      }}>
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
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

          {/* Placeholder for story content */}
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

          {/* Star Rating */}
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

          {/* Submit Button */}
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

        {/* Footer */}
        <p style={{ 
          color: '#adb5bd',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          Powered by SocialStar • Rate friends and win prizes!
        </p>
      </div>

      {/* Inline CSS for animations */}
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