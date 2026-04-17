// NamePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

const NamePage = () => {
  const navigate = useNavigate();
  const { affiliateId, linkId } = useParams();
  const location = useLocation();

  const { selectedThemes } = location.state || {};

  const [competitionName, setCompetitionName] = useState('');
  const [linkDocId, setLinkDocId] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);

  const canContinue = competitionName.trim().length > 0;

  // useEffect MUST come before any early return
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

  // Guard comes AFTER all hooks
  if (!selectedThemes || selectedThemes.length < 3) {
    navigate(`/themes/${affiliateId}/${linkId}`, { replace: true });
    return null;
  }

  const trackNameContinueClick = async (ldId, fp) => {
    if (!ldId || !fp) return;
    try {
      const trackingDocId = `${ldId}_${fp}`;
      const trackingRef = doc(db, 'unique_name_continue_clicks', trackingDocId);
      const trackingDoc = await getDoc(trackingRef);

      if (!trackingDoc.exists()) {
        await setDoc(trackingRef, {
          linkId: ldId,
          fingerprint: fp,
          firstClickedAt: serverTimestamp(),
          clickCount: 1
        });
        await updateDoc(doc(db, 'rating_links', ldId), {
          totalNameContinueClicks: increment(1),
          lastNameContinueClickAt: serverTimestamp()
        });
      } else {
        await updateDoc(trackingRef, {
          clickCount: increment(1),
          lastClickedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error('Error tracking name continue click:', e);
    }
  };

  const handleContinue = () => {
    if (!canContinue) return;

    if (linkDocId && fingerprint) {
      trackNameContinueClick(linkDocId, fingerprint);
    }

    navigate(`/phone/${affiliateId}/${linkId}`, {
      state: { selectedThemes, competitionName: competitionName.trim() }
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#10183C',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input { outline: none; caret-color: white; }
        input::placeholder { color: rgba(255,255,255,0.4); }
        .grecaptcha-badge { visibility: hidden !important; }
      `}</style>

      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          padding: 0, marginBottom: 0,
        }}
      >
        <ArrowLeft size={27} color="white" strokeWidth={2} />
      </button>

      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        width: '100%',
      }}>
        <div style={{
          width: '100%', maxWidth: '500px',
          animation: 'fadeUp 0.4s ease forwards',
        }}>
          <div style={{
            backgroundColor: '#1A2245',
            borderRadius: 10,
            padding: '30px 20px',
            width: '100%',
          }}>
            <p style={{
              color: 'white', fontSize: 18, fontWeight: 'bold',
              textAlign: 'center', margin: '0 0 8px',
            }}>
              Name your competition
            </p>

            <p style={{
              color: 'rgba(255,255,255,0.6)', fontSize: 14,
              textAlign: 'center', margin: '0 0 25px',
            }}>
              This is what your friends will see when they join
            </p>

            <input
              autoFocus
              type="text"
              value={competitionName}
              onChange={e => setCompetitionName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canContinue) handleContinue(); }}
              placeholder="e.g. Besties"
              maxLength={40}
              style={{
                width: '100%', height: 60,
                backgroundColor: '#3B4374',
                border: 'none', borderRadius: 10,
                padding: '0 16px',
                color: 'white', fontSize: 16, fontWeight: 'bold',
              }}
            />

            <button
              onClick={handleContinue}
              disabled={!canContinue}
              style={{
                width: '100%', height: 58,
                background: canContinue ? '#4169E1' : 'rgba(65,105,225,0.35)',
                border: 'none', borderRadius: 200,
                color: canContinue ? 'white' : 'rgba(255,255,255,0.4)',
                fontSize: 20, fontWeight: 'bold',
                cursor: canContinue ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 20,
              }}
              onMouseDown={e => { if (canContinue) e.currentTarget.style.opacity = '0.85'; }}
              onMouseUp={e => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              onTouchStart={e => { if (canContinue) e.currentTarget.style.opacity = '0.85'; }}
              onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
            >
              Continue
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 30 }}>
            <img
              src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a"
              alt="Star" style={{ width: 22, height: 22 }}
            />
            <span style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>SocialStar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NamePage;