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
import { Star } from 'lucide-react';

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
  const [pageOpenTracked, setPageOpenTracked] = useState(false);

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
        
        setLinkData(linkData);

        // Load affiliate data including profile picture
        const affiliateDoc = await getDoc(doc(db, 'affiliates', affiliateId));
        if (affiliateDoc.exists()) {
          const affiliateData = affiliateDoc.data();
          setAffiliateData(affiliateData);
        }

        // Track page open (only once per load)
        if (!pageOpenTracked) {
          // Update link stats
          await updateDoc(doc(db, 'rating_links', linkDoc.id), {
            totalPageOpens: increment(1),
            lastOpenedAt: serverTimestamp()
          });
          
          setPageOpenTracked(true);
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
  }, [affiliateId, linkId, pageOpenTracked]);

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

  const submitRating = async (selectedRating = rating) => {
    const finalRating = selectedRating || rating;
    if (finalRating === 0) {
      alert('Please select a star rating first!');
      return;
    }

    setSubmitting(true);

    try {
      const ratingData = {
        linkId: linkData.id,
        linkIdString: linkData.linkId,
        affiliateId: affiliateId,
        rating: finalRating,
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'ratings'), ratingData);
      
      // Update stats
      await updateDoc(doc(db, 'rating_links', linkData.id), {
        totalRatings: increment(1),
        lastRatedAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'affiliates', affiliateId), {
        totalRatings: increment(1)    
      });
      
      await calculateAverageRating();
      setSubmitted(true);

    } catch (error) {
      console.error('Error submitting rating:', error);
      setError(error.message);
    }

    setSubmitting(false);
  };

  // Handle continue button click
  const handleContinueClick = async () => {
    window.open('https://apps.apple.com/app/socialstar-app/id6473705189', '_blank');

    // Update link stats
    await updateDoc(doc(db, 'rating_links', linkData.id), {
      totalContinueClicks: increment(1)
    });
  };

  // Updated Prediction Row Component with actual affiliate profile picture
  const PredictionRow = ({ prediction, userRating, isCorrect }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        width: '100%',
      }}
    >
      {/* Left section: profile + prediction */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1,
        }}
      >
        {/* Profile Picture - Now using actual affiliate profile picture */}
        <div
          style={{
            width: '35px',
            height: '35px',
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {affiliateData?.profilePictureUrl ? (
            <img
              src={affiliateData.profilePictureUrl}
              alt={`${affiliateData?.firstName || 'Affiliate'} profile`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                // Fallback if image fails to load
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#4169E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '50%',
              }}
            >
              {affiliateData?.firstName?.charAt(0) || 'A'}
            </div>
          )}
        </div>

        {/* Prediction section */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '5px',
            }}
          >
            Prediction
          </div>

          <div style={{ display: 'flex', alignItems: 'center', height: '28px' }}>
            {/* Prediction tab */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                height: '100%',
                padding: '0 8px',
                backgroundColor: isCorrect ? 'rgba(0, 255, 0, 0.6)' : '#FF4444',
                borderRadius: '6px',
              }}
            >
              <Star size={11} color="#fff" fill="#fff" />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#fff',
                }}
              >
                {prediction}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Win/Lost badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: isCorrect ? 'rgba(0, 255, 0, 0.15)' : 'rgba(255, 68, 68, 0.15)',
          borderRadius: '20px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isCorrect ? '#00FF00' : '#FF4444',
          }}
        ></div>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: isCorrect ? '#00FF00' : '#FF4444',
          }}
        >
          {isCorrect ? 'Win' : 'Lost'}
        </span>
      </div>
    </div>
  );

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

  if (submitted) {
    const prediction = linkData?.predictedRating;
    const userRating = rating;
    const hasPrediction = prediction && prediction > 0;
    const isCorrect = hasPrediction && prediction === userRating;
    
    // NEW: Get parlay amounts from linkData instead of fake data
    const parlayData = {
      entry: linkData?.parlayEntry || 25, // Fallback to old values if not set
      win: linkData?.parlayWin || 100,
      profit: linkData?.parlayProfit || 75
    };
    
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
            padding: '10px 0px 0px 0px',
            marginBottom: '30px',
            overflow: 'hidden'
          }}>
            {/* Header - Updated to show affiliate's actual name */}
            <div style={{ 
              padding: '0px 30px 20px 20px'
            }}>
              <p style={{ 
                color: '#fff',
                fontSize: '17px',
                marginBottom: '0px',
                fontWeight: '600',
                textAlign: 'left',
                lineHeight: '20px'
              }}>
                {affiliateData?.firstName || 'The affiliate'} predicted your rating
              </p>
            </div>

            {/* Parlay Slip Style Container */}
            <div style={{ 
              backgroundColor: '#243055',
              borderRadius: '12px',
              padding: '20px',
              margin: '0px 20px 20px 20px',
              position: 'relative'
            }}>
              {/* Prediction Row - iOS Style with actual profile picture */}
              {hasPrediction && (
                <PredictionRow 
                  prediction={prediction}
                  userRating={userRating}
                  isCorrect={isCorrect}
                />
              )}

              {/* Divider */}
              <div style={{ 
                height: '1px',
                backgroundColor: 'rgba(184, 197, 209, 0.2)',
                margin: '15px 0'
              }}></div>

              {/* Parlay Entry Data - Now using stored data from Firestore */}
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                {/* Entry */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    color: '#B8C5D1',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    Bet
                  </span>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ 
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#fff'
                    }}>
                      {parlayData.entry}
                    </span>
                    <img 
                      src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/dollar.png?alt=media&token=a1fccb79-e00b-474e-9411-577c0624e81f" 
                      alt="Coin" 
                      style={{ width: '16px', height: '16px' }}
                    />
                  </div>
                </div>

                {/* Win */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    color: '#B8C5D1',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    Win
                  </span>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ 
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#fff'
                    }}>
                      {isCorrect ? parlayData.win : 0}
                    </span>
                    <img 
                      src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/dollar.png?alt=media&token=a1fccb79-e00b-474e-9411-577c0624e81f" 
                      alt="Coin" 
                      style={{ width: '16px', height: '16px' }}
                    />
                  </div>
                </div>

                {/* Profit - Only show when won */}
                {isCorrect && (
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ 
                      color: '#B8C5D1',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      Profit
                    </span>
                    <span style={{ 
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#00FF00'
                    }}>
                      +{parlayData.profit}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinueClick}
              style={{
                padding: '23px 30px',
                backgroundColor: '#4169E1',
                color: 'white',
                border: 'none',
                borderRadius: '0px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%',
                marginTop: '0px'
              }}
            >
              Continue
            </button>
          </div>

          {/* SocialStar Branding - Floated to the left */}
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
              <h1 style={{ margin: '2px 0px 0px 0px', fontSize: '18px', color: 'white' }}> SocialStar </h1>
            </div>
          </a>
        </div>
      </div>
    );
  }

  // Original rating selection UI remains the same
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
        
        {/* SocialStar Branding - Floated to the left */}
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