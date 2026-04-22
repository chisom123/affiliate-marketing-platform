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

const APP_STORE_URL = 'https://apps.apple.com/app/socialstar-app/id6473705189';

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
          linkId: ldId,
          fingerprint: fp,
          firstTappedAt: serverTimestamp(),
          count: 1
        });
        await updateDoc(doc(db, 'rating_links', ldId), {
          totalDownloadTaps: increment(1),
          lastDownloadTapAt: serverTimestamp()
        });
      } else {
        await updateDoc(trackingRef, {
          count: increment(1),
          lastTappedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error('Error tracking download tap:', e);
    }
  };

  const handleDownload = () => {
    if (openingApp) return;
    setOpeningApp(true);

    // Fire and forget — don't block the redirect
    if (linkDocId && fingerprint) {
      trackDownloadTap(linkDocId, fingerprint);
    }

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
        <div style={{
          backgroundColor: '#1A2245',
          borderRadius: 12, padding: '30px 24px',
          width: '100%', textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: 20,
          animation: 'fadeUp 0.5s ease 0.1s both',
        }}>
          <div style={{ fontSize: 60, animation: 'scaleIn 0.5s ease forwards' }}>
            🎉
          </div>

          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 'bold', margin: '0 0 4px' }}>
            You're all set!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
            Download SocialStar and start your first photo competition with friends
          </p>

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
          padding: '15px 0px'
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