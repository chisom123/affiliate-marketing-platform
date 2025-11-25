import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { Check } from 'lucide-react';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment,
  query,
  where,
  getDocs,
  collection,
  serverTimestamp
} from 'firebase/firestore';

const ReserveUsername = () => {
  const { affiliateId, linkId } = useParams();
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [linkData, setLinkData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch link data on mount
  useEffect(() => {
    const loadLinkData = async () => {
      try {
        const linksQuery = query(
          collection(db, 'rating_links'),
          where('linkId', '==', linkId)
        );
        const linkSnapshot = await getDocs(linksQuery);
        
        if (!linkSnapshot.empty) {
          const linkDoc = linkSnapshot.docs[0];
          setLinkData({ id: linkDoc.id, ...linkDoc.data() });
        }
      } catch (error) {
        console.error('Error loading link data:', error);
      }
      setLoading(false);
    };

    if (linkId) {
      loadLinkData();
    }
  }, [linkId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that username is not empty
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Track username reservation click
      if (linkData) {
        await updateDoc(doc(db, 'rating_links', linkData.id), {
          totalUsernameReservations: increment(1),
          lastUsernameReservationAt: serverTimestamp()
        });
      }

      // Simulate submission (no actual saving for now)
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmitted(true);
      }, 500);
    } catch (error) {
      console.error('Error tracking username reservation:', error);
      // Continue anyway even if tracking fails
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmitted(true);
      }, 500);
    }
  };

  if (submitted) {
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
            <h2 style={{ 
              color: '#fff',
              marginTop: '0px',
              marginBottom: '20px',
              fontSize: '22px',
              fontWeight: 'bold'
            }}>
              <Check size={40} strokeWidth={5} />
            </h2>

            <p style={{ 
              color: '#fff',
              marginBottom: '30px',
              fontSize: '19px',
              fontWeight: '600',
              lineHeight: '1.4'
            }}>
              {username} is reserved for 24 hours
            </p>

            <button
              onClick={async () => {
                try {
                  // Track download click FIRST
                  if (linkData) {
                    await updateDoc(doc(db, 'rating_links', linkData.id), {
                      totalDownloadClicks: increment(1),
                      lastDownloadClickAt: serverTimestamp()
                    });
                    
                    // Small delay to ensure Firebase write completes
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                } catch (error) {
                  console.error('Error tracking download click:', error);
                } finally {
                  // ALWAYS open App Store, even if tracking fails
                  window.location.href = 'https://apps.apple.com/app/socialstar-app/id6473705189';
                }
              }}
              style={{
                padding: '17px 32px',
                backgroundColor: '#4169E1',
                color: 'white',
                border: 'none',
                borderRadius: '200px',
                fontSize: '17px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Download SocialStar
            </button>
          </div>

          {/* SocialStar Branding */}
          <a href="https://apps.apple.com/gb/app/socialstar-app/id6473705189" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', cursor: 'pointer' }}>
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
              <h1 style={{ margin: '2px 0px 0px 0px', fontSize: '18px', color: 'white' }}>SocialStar</h1>
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
          <h2 style={{ 
            color: '#fff',
            marginTop: '0px',
            marginBottom: '10px',
            fontSize: '22px',
            fontWeight: 'bold'
          }}>
            Reserve Your Username
          </h2>
          
          <p style={{ 
            color: '#B8C5D1',
            marginBottom: '30px',
            fontSize: '15px',
            fontWeight: '600'
          }}>
            Claim your username before someone else does
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  // Format: lowercase and remove all whitespace as user types
                  const formatted = e.target.value.toLowerCase().replace(/\s+/g, '');
                  setUsername(formatted);
                }}
                placeholder="Enter username"
                disabled={isSubmitting}
                autoCapitalize="none"
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  fontSize: '16px',
                  fontWeight: '600',
                  backgroundColor: '#3B4374',
                  border: '0px',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  caretColor: '#fff'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '17px 32px',
                backgroundColor: isSubmitting ? '#323862' : '#4169E1',
                color: 'white',
                border: 'none',
                borderRadius: '200px',
                fontSize: '17px',
                fontWeight: 'bold',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                width: '100%'
              }}
            >
              {isSubmitting ? 'Reserving...' : 'Reserve Username'}
            </button>
          </form>
        </div>

        {/* SocialStar Branding */}
        <a href="https://apps.apple.com/gb/app/socialstar-app/id6473705189" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', cursor: 'pointer' }}>
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
            <h1 style={{ margin: '2px 0px 0px 0px', fontSize: '18px', color: 'white' }}>SocialStar</h1>
          </div>
        </a>
      </div>
    </div>
  );
};

export default ReserveUsername;