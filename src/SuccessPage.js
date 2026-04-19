import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const APP_STORE_URL = 'https://apps.apple.com/us/app/socialstar-photo-competitions/id6473705189?ppid=e9023d29-f1f3-41cc-8d27-89e179d3251b';

const CheckItem = ({ label, checked, delay }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14,
    animation: `fadeUp 0.4s ease ${delay}s both`,
  }}>
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      backgroundColor: checked ? '#4169E1' : 'transparent',
      border: checked ? 'none' : '2px solid rgba(255,255,255,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.3s ease',
    }}>
      {checked && (
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
          <path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
    <span style={{
      fontSize: 17, fontWeight: checked ? '600' : '500',
      color: checked ? 'white' : 'rgba(255,255,255,0.65)',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {label}
    </span>
  </div>
);

const SuccessPage = () => {
  const { affiliateId, linkId } = useParams();
  const [openingApp, setOpeningApp] = useState(false);
  const [linkDocId, setLinkDocId] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);

  useEffect(() => {
    const fp = localStorage.getItem(`info_fingerprint_${linkId}`);
    if (fp) setFingerprint(fp);

    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'rating_links'), where('linkId', '==', linkId))
        );
        if (!snap.empty) {
          setLinkDocId(snap.docs[0].id);
        }
      } catch (e) {
        console.error('Error resolving link doc ID:', e);
      }
    })();
  }, [linkId]);

  const trackDownloadTap = async (ldId, fp) => {
    if (!ldId || !fp) return;
    try {
      const trackingDocId = `${ldId}_${fp}`;
      const trackingRef = doc(db, 'unique_download_taps', trackingDocId);
      const trackingDoc = await getDoc(trackingRef);
      if (!trackingDoc.exists()) {
        await setDoc(trackingRef, {
          linkId: ldId, fingerprint: fp,
          firstTappedAt: serverTimestamp(), count: 1
        });
        await updateDoc(doc(db, 'rating_links', ldId), {
          totalDownloadTaps: increment(1),
          lastDownloadTapAt: serverTimestamp()
        });
      } else {
        await updateDoc(trackingRef, { count: increment(1), lastTappedAt: serverTimestamp() });
      }
    } catch (e) {
      console.error('Error tracking download tap:', e);
    }
  };

  const handleDownload = () => {
    if (openingApp) return;
    setOpeningApp(true);
    if (linkDocId && fingerprint) trackDownloadTap(linkDocId, fingerprint);
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
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .grecaptcha-badge { visibility: hidden !important; }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 420,
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>

        {/* Heading */}
        <div style={{ animation: 'fadeUp 0.4s ease 0.05s both' }}>
          <h1 style={{
            color: 'white', fontSize: 30, fontWeight: 800,
            margin: '0 0 6px', letterSpacing: '-0.5px', lineHeight: 1.15,
          }}>
            You're nearly there!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, margin: 0, fontWeight: '500' }}>
            Here's what you've done so far
          </p>
        </div>

        {/* Checklist card */}
        <div style={{
          backgroundColor: '#1A2245',
          borderRadius: 15,
          padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 20,
          animation: 'fadeUp 0.4s ease 0.15s both',
        }}>
          <CheckItem label="Points claimed"              checked delay={0.2} />
          <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <CheckItem label="Competition set up"          checked delay={0.3} />
          <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <CheckItem label="Start playing with friends"  checked={false} delay={0.4} />
        </div>

        {/* CTA */}
        <div style={{ animation: 'fadeUp 0.4s ease 0.45s both' }}>
          <button
            onClick={handleDownload}
            disabled={openingApp}
            style={{
              width: '100%', height: 58,
              backgroundColor: '#4169E1',
              border: 'none', borderRadius: 200,
              color: 'white', fontSize: 20, fontWeight: 700,
              cursor: openingApp ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '-0.2px',
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
            ) : 'Start Playing'}
          </button>
        </div>

        {/* Wordmark */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'fadeUp 0.4s ease 0.5s both',
        }}>
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