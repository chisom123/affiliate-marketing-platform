import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { db } from './firebase';
import { doc, updateDoc, increment, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';

const InfoPage = () => {
  const { affiliateId, linkId } = useParams();
  const [imageLoading, setImageLoading] = useState(true);

const handleGetSocialStarClick = async () => {
  try {
    // Log the click FIRST
    const linksQuery = query(
      collection(db, 'rating_links'),
      where('linkId', '==', linkId)
    );
    const linkSnapshot = await getDocs(linksQuery);
    
    if (!linkSnapshot.empty) {
      const linkDoc = linkSnapshot.docs[0];
      
      await updateDoc(doc(db, 'rating_links', linkDoc.id), {
        totalGetSocialStarClicks: increment(1),
        lastGetSocialStarClickAt: serverTimestamp()
      });
    }
    
    // Small delay to ensure Firebase write completes (50-100ms is usually enough)
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {
    console.error('Error logging click:', error);
  } finally {
    // ALWAYS navigate, even if logging fails
    window.location.href = 'https://apps.apple.com/gb/app/socialstar-app/id6473705189';
  }
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

  // Add spinner animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  
  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#10183C',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      paddingBottom: '100px',
      paddingTop: '50px'
    }}>
      <div style={{
        maxWidth: '90%',
        width: '100%'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: 'clamp(1.5rem, 6vw, 3rem)',
          fontWeight: '600',
          margin: '0',
          lineHeight: '1.2',
          textAlign: 'left',
          opacity: '0.9'
        }}>
          That was just an appetizer...
        </h1>
        <p style={{
          color: 'white',
          fontSize: 'clamp(1.5rem, 6vw, 3.5rem)',
          marginTop: '15px',
          fontWeight: 'bold',
          lineHeight: '1.3',
          textAlign: 'left'
        }}>
          Continue playing with your friends
        </p>
        
        {/* Image with placeholder */}
        <div style={{
          marginTop: '30px',
          position: 'relative',
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}>
          {imageLoading && (
            <div style={{
              width: '100%',
              maxWidth: '400px',
              height: '444px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Spinner />
            </div>
          )}
          
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/fun_screenshot.png?alt=media&token=2baf5836-dc92-42e8-b630-b3d0caa0275f"
            alt="App screenshot"
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
            style={{
              width: '100%',
              maxWidth: '400px',
              height: 'auto',
              display: imageLoading ? 'none' : 'block'
            }}
          />
        </div>
      </div>
      
      <button
        onClick={handleGetSocialStarClick}
        style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          width: '100%',
          backgroundColor: '#4169E1',
          color: 'white',
          padding: '20px 0',
          margin: '0',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          textDecoration: 'none',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          gap: '10px',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Get SocialStar
        <ArrowRight size={24} strokeWidth={3} />
      </button>
    </div>
  );
};

export default InfoPage;