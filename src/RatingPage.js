// RATING PAGE COMPONENT
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

        // Load affiliate data
        const affiliateDoc = await getDoc(doc(db, 'affiliates', affiliateId));
        if (affiliateDoc.exists()) {
          setAffiliateData(affiliateDoc.data());
        }

        // NEW: Track page open (only once per load)
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

  // NEW: Handle continue button click
  const handleContinueClick = async () => {
    window.open('https://apps.apple.com/app/socialstar-app/id6473705189', '_blank');

    // Update link stats
    await updateDoc(doc(db, 'rating_links', linkData.id), {
      totalContinueClicks: increment(1)
    });
  };

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
            padding: '20px 30px 0px 30px',
            marginBottom: '30px'
          }}>
            <p style={{ 
              color: '#fff',
              fontSize: '17px',
              marginBottom: '30px',
              fontWeight: '600',
              textAlign: 'left',
              lineHeight: '20px'
            }}>
              {affiliateData.firstName} predicted what you would rate
            </p>

          {/* NEW: Prediction vs Your Rating Comparison */}
          {hasPrediction && (
            <div style={{ 
              backgroundColor: '#243055',
              borderRadius: '12px',
              padding: '25px 20px',
              marginBottom: '20px'
            }}>
              
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                gap: '15px'
              }}>
                {/* Creator's Prediction */}
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    color: '#B8C5D1',
                    fontSize: '15px',
                    margin: '0 0 10px 0',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    Prediction
                  </p>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}>
                    <span style={{ 
                      fontSize: '28px',
                      fontWeight: 'bold',
                      color: '#fff'
                    }}>
                      {prediction}
                    </span>
                    <span style={{ 
                      color: '#fff',
                      marginTop: '1.25px'
                    }}>
                      <Star size={28} />
                    </span>
                  </div>
                </div>

                {/* VS Divider */}
                <div style={{ 
                  color: '#B8C5D1',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  opacity: 0.5
                }}>
                  VS
                </div>

                {/* Your Rating */}
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    color: '#B8C5D1',
                    fontSize: '15px',
                    margin: '0 0 10px 0',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    Your Rating
                  </p>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}>
                    <span style={{ 
                      fontSize: '28px',
                      fontWeight: 'bold',
                      color: '#ffc107'
                    }}>
                      {userRating}
                    </span>
                    <span style={{ 
                      color: '#ffc107',
                      marginTop: '1.25px'
                    }}>
                      <Star size={28} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

            <button
              onClick={handleContinueClick}
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