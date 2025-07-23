import React, { useState, useEffect } from 'react';
import { db, functions } from './firebase';
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
import { httpsCallable } from 'firebase/functions';
import { useParams } from 'react-router-dom';

// Enhanced fingerprint generation
const generateFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('SocialStar Rating', 2, 2);
  
  return {
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    userAgent: navigator.userAgent.substring(0, 100),
    canvas: canvas.toDataURL().substring(0, 100),
    deviceMemory: navigator.deviceMemory || 'unknown',
    cpuCores: navigator.hardwareConcurrency || 'unknown',
    timestamp: Date.now()
  };
};

const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
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

  // Social media browser detection
  const isSocialMediaBrowser = () => {
    const ua = navigator.userAgent.toLowerCase();
    return /instagram|snapchat|fb_iab|fbav/i.test(ua);
  };

  useEffect(() => {
    if (!isSocialMediaBrowser()) {
      setError('Please open this link in Instagram or Snapchat to rate');
      setLoading(false);
      return;
    }

    const loadData = async () => {
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
        
        if (linkData.expiresAt && linkData.expiresAt.toDate() < new Date()) {
          setError('This rating link has expired');
          setLoading(false);
          return;
        }

        setLinkData(linkData);

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

  const submitRating = async () => {
    if (rating === 0) {
      alert('Please select a star rating first!');
      return;
    }
  
    setSubmitting(true);
    setError('');
  
    try {
      const fingerprint = generateFingerprint();
      const fingerprintHash = simpleHash(JSON.stringify(fingerprint));
  
      // Call Cloud Function with timeout
      const validationPromise = httpsCallable(functions, 'validateRating')({
        affiliateId,
        linkId,
        fingerprintHash,
        ratingValue: rating
      });
  
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Validation timeout')), 10000)
      );
  
      await Promise.race([validationPromise, timeoutPromise]);
  
      // Proceed with Firestore writes...
      const ratingRef = await addDoc(collection(db, 'ratings'), {
        // ... your rating data
      });
  
      setSubmitted(true);
  
    } catch (error) {
      let errorMessage = 'Failed to submit rating';
      
      // Handle different error types
      switch (error.code) {
        case 'permission-denied':
          errorMessage = 'Please open in Instagram/Snapchat to rate';
          break;
        case 'resource-exhausted':
          errorMessage = 'Rating limit reached (3/hour)';
          break;
        case 'invalid-argument':
          errorMessage = 'Invalid rating data';
          break;
        case 'internal':
          errorMessage = 'Temporary system issue. Please try again.';
          break;
        default:
          if (error.message.includes('timeout')) {
            errorMessage = 'Request timed out. Check your connection.';
          }
      }
  
      setError(errorMessage);
      console.error('Rating error:', error.code, error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading rating page...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
          .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-top: 4px solid #007bff;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">!</div>
        <h2>Oops!</h2>
        {error && (
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            {error.includes('Instagram') && (
              <button 
                onClick={() => window.location.href = 'instagram://user?username=socialstar'}
                className="social-retry-button"
              >
                Open Instagram
              </button>
            )}
          </div>
        )}
        <div className="social-buttons">
          <a href="instagram://user?username=socialstar" className="instagram-button">
            Open Instagram
          </a>
          <a href="snapchat://add/socialstar" className="snapchat-button">
            Open Snapchat
          </a>
        </div>
        <style jsx>{`
          .error-container {
            text-align: center;
            padding: 2rem;
            max-width: 500px;
            margin: 0 auto;
          }
          .error-icon {
            background: #ff6b6b;
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            margin: 0 auto 20px;
          }
          .error-message {
            background: #fff3f3;
            border-left: 4px solid #ff6b6b;
            padding: 12px;
            margin: 20px 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .error-icon {
            font-size: 24px;
          }
          .social-retry-button {
            background: #e1306c;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            margin-top: 10px;
            cursor: pointer;
          }
          .social-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 25px;
          }
          .instagram-button {
            background: #e1306c;
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            text-decoration: none;
          }
          .snapchat-button {
            background: #fffc00;
            color: black;
            padding: 10px 15px;
            border-radius: 6px;
            text-decoration: none;
          }
        `}</style>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="success-container">
        <div className="success-icon">✓</div>
        <h2>Thanks for rating!</h2>
        <p>You gave {affiliateData?.name || 'this story'} {rating} star{rating !== 1 ? 's' : ''}!</p>
        <div className="app-promo">
          <p>Want to create your own rating links?</p>
          <div className="download-buttons">
            <a href="https://apps.apple.com/app/socialstar" className="app-store-button">
              Download on App Store
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.socialstar" className="play-store-button">
              Get on Google Play
            </a>
          </div>
        </div>
        <style jsx>{`
          .success-container {
            text-align: center;
            padding: 2rem;
          }
          .success-icon {
            background: #28a745;
            color: white;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin: 0 auto 30px;
          }
          .app-promo {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
          }
          .download-buttons {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 20px;
          }
          .app-store-button, .play-store-button {
            padding: 10px 15px;
            border-radius: 6px;
            text-decoration: none;
            color: white;
            background: #000;
            display: flex;
            align-items: center;
            gap: 8px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="rating-page">
      <header className="rating-header">
        <h1>Rate this story</h1>
        <p>by {affiliateData?.name || 'a friend'}</p>
        <span className="social-badge">
          {navigator.userAgent.includes('Instagram') ? 'Instagram' : 'Snapchat'}
        </span>
      </header>

      <div className="content-preview">
        <h2>"{linkData.title}"</h2>
        {linkData.description && <p>{linkData.description}</p>}
        <div className="story-preview">
          <p>📸 Story content preview</p>
        </div>
      </div>

      <div className="rating-section">
        <p>How would you rate this story?</p>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className={`star ${(hoveredStar >= star || rating >= star) ? 'active' : ''}`}
            >
              ★
            </button>
          ))}
        </div>
        {rating > 0 && <p className="rating-selected">You selected {rating} star{rating !== 1 ? 's' : ''}!</p>}
      </div>

      <button 
        onClick={submitRating}
        disabled={rating === 0 || submitting}
        className="submit-button"
      >
        {submitting ? 'Submitting...' : 'Submit Rating'}
      </button>

      <footer className="rating-footer">
        <p>Powered by SocialStar</p>
      </footer>

      <style jsx>{`
        .rating-page {
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .rating-header {
          text-align: center;
          position: relative;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .social-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #28a745;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .content-preview {
          background: white;
          border-radius: 12px;
          padding: 30px;
          margin: 30px 0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .story-preview {
          background: #f8f9fa;
          border: 2px dashed #ddd;
          padding: 40px;
          text-align: center;
          color: #999;
          margin: 20px 0;
        }
        .rating-section {
          text-align: center;
          margin: 30px 0;
        }
        .stars {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin: 20px 0;
        }
        .star {
          background: none;
          border: none;
          font-size: 36px;
          cursor: pointer;
          color: #ddd;
          padding: 5px;
          transition: color 0.2s;
        }
        .star.active {
          color: #ffc107;
        }
        .rating-selected {
          color: #28a745;
          margin: 20px 0;
        }
        .submit-button {
          background: ${rating === 0 ? '#6c757d' : '#007bff'};
          color: white;
          border: none;
          border-radius: 25px;
          padding: 15px 40px;
          font-size: 16px;
          font-weight: bold;
          cursor: ${rating === 0 ? 'not-allowed' : 'pointer'};
          display: block;
          width: 100%;
          max-width: 200px;
          margin: 0 auto;
          transition: all 0.3s;
        }
        .rating-footer {
          text-align: center;
          color: #999;
          font-size: 12px;
          margin-top: 40px;
        }
      `}</style>
    </div>
  );
};

export default RatingPage;