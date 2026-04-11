import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const APP_STORE_URL = 'https://apps.apple.com/app/socialstar-app/id6473705189';

const SuccessPage = () => {
  const { affiliateId, linkId } = useParams();
  const [openingApp, setOpeningApp] = useState(false);

  // Auto-redirect to App Store after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = APP_STORE_URL;
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDownload = () => {
    if (openingApp) return;
    setOpeningApp(true);
    window.location.href = APP_STORE_URL;
    setTimeout(() => setOpeningApp(false), 2000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#10183C',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .grecaptcha-badge { visibility: hidden !important; }
      `}</style>

      <div style={{
        width: '100%', maxWidth: '500px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>

        {/* Card */}
        <div style={{
          backgroundColor: '#1A2245',
          borderRadius: 12, padding: '30px 24px',
          width: '100%', textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: 20,
          animation: 'fadeUp 0.5s ease 0.1s both',
        }}>
          {/* Emoji */}
          <div style={{ fontSize: 60, animation: 'scaleIn 0.5s ease forwards' }}>
            🎉
          </div>

          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 'bold', margin: '0 0 4px' }}>
            You're all set!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
            Download SocialStar and start your first photo competition with friends.
          </p>

          {/* Auto-redirect note */}
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
            Taking you to the App Store...
          </p>

          {/* CTA button */}
          <button
            onClick={handleDownload}
            disabled={openingApp}
            style={{
              width: '100%', height: 55,
              backgroundColor: '#4169E1',
              border: 'none', borderRadius: 200,
              color: 'white', fontSize: 18, fontWeight: 'bold',
              cursor: openingApp ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseDown={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseUp={e => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            onTouchStart={e => { e.currentTarget.style.opacity = '0.85'; }}
            onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {openingApp ? (
              <div style={{
                width: 22, height: 22,
                border: '3px solid rgba(255,255,255,0.2)',
                borderTop: '3px solid white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : 'Download SocialStar'}
          </button>
        </div>

        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start', marginTop: 10 }}>
          <img
            src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a"
            alt="Star" style={{ width: 22, height: 22 }}
          />
          <span style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>SocialStar</span>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;