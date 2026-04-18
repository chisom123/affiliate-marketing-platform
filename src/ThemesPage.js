// ThemesPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const SUGGESTED_THEMES = [
  {
    name: 'Selfie',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F7dff83b50d757c446a0b32bf00964af9-2.jpg?alt=media&token=c47a7ca5-3bf7-436b-bff8-9142d4171e5e',
  },
  {
    name: 'Outfit of the day',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F3992207a92b1378d9d6a4b711f4b1189-2.jpg?alt=media&token=7923d0e1-2b1c-489e-b7ad-744a3131865b',
  },
  {
    name: 'Mood',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F07d3c9a11e7539d2410ffba6fc1b969a-2.jpg?alt=media&token=c88d655d-6548-48bf-bd9a-0d1067ea2718',
  },
  {
    name: 'Food',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F373c672b221c21f630b8c5601fde8a24-2.jpg?alt=media&token=0f8f0026-1521-4e90-b27d-06af04286481',
  },
  {
    name: 'Getting ready',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2Fb77e4c2ff5e677c6aec0707bdf52ada2-2.jpg?alt=media&token=f5cffd04-ee83-4c96-9008-69e68ae2f04d',
  },
  {
    name: 'Woke up like this',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F60de91dff3951a060cbfc7c065fecb46-2.jpg?alt=media&token=78df393a-15be-4d62-a19e-18246ce83ed3',
  },
  {
    name: 'Golden hour',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2Ffeb407d9c1580f8a7608e2fb43d3a059-2-2.jpg?alt=media&token=1835be03-231c-45dc-84d6-a5c738386da9',
  },
  {
    name: 'Out n about',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F7fe4ac7d95e7adbd454164b1ff561cf8-2.jpg?alt=media&token=7de3722b-33fa-494e-844c-1f1a79c0882a',
  },
  {
    name: 'Caught in 4K',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F9f0aceb82a7f9360d5bc93d5173c0500-2.jpg?alt=media&token=f2f42a17-06bc-4e79-858e-07771374d612',
  },
  {
    name: 'WTF',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F66a00648f5ad9bc0f332f5e79d3779ed-2.jpg?alt=media&token=3e19c738-3af7-452a-8c06-891d3361fc92',
  },
];

const ThemesPage = () => {
  const navigate = useNavigate();
  const { affiliateId, linkId } = useParams();

  const [selectedThemes, setSelectedThemes] = useState([]);
  const [linkDocId, setLinkDocId] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);

  const remaining = Math.max(0, 3 - selectedThemes.length);
  const canContinue = selectedThemes.length >= 3;

  useEffect(() => {
    const fp = localStorage.getItem(`info_fingerprint_${linkId}`);
    if (fp) setFingerprint(fp);

    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'rating_links'), where('linkId', '==', linkId))
        );
        if (!snap.empty) setLinkDocId(snap.docs[0].id);
      } catch (e) {
        console.error('Error resolving link doc ID:', e);
      }
    })();
  }, [linkId]);

  const trackThemesContinueClick = async (ldId, fp) => {
    if (!ldId || !fp) return;
    try {
      const trackingDocId = `${ldId}_${fp}`;
      const trackingRef = doc(db, 'unique_themes_continue_clicks', trackingDocId);
      const trackingDoc = await getDoc(trackingRef);
      if (!trackingDoc.exists()) {
        await setDoc(trackingRef, { linkId: ldId, fingerprint: fp, firstClickedAt: serverTimestamp(), clickCount: 1 });
        await updateDoc(doc(db, 'rating_links', ldId), { totalThemesContinueClicks: increment(1), lastThemesContinueClickAt: serverTimestamp() });
      } else {
        await updateDoc(trackingRef, { clickCount: increment(1), lastClickedAt: serverTimestamp() });
      }
    } catch (e) {
      console.error('Error tracking themes continue click:', e);
    }
  };

  const toggleTheme = (name) => {
    setSelectedThemes(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  };

  const handleContinue = () => {
    if (!canContinue) return;
    if (linkDocId && fingerprint) trackThemesContinueClick(linkDocId, fingerprint);
    navigate(`/phone/${affiliateId}/${linkId}`, { state: { selectedThemes } });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#10183C',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .grecaptcha-badge { visibility: hidden !important; }

        .theme-card {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          aspect-ratio: 3/4;
          transition: transform 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .theme-card:active {
          transform: scale(0.96);
        }
        .theme-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }
        .theme-card.selected img {
          transform: scale(1.05);
        }
        .theme-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0) 100%);
          transition: background 0.2s ease;
        }
        .theme-card.selected .theme-card-overlay {
          background: linear-gradient(to top, rgba(65,105,225,0.85) 0%, rgba(65,105,225,0.2) 55%, rgba(0,0,0,0) 100%);
        }
        .theme-card-name {
          position: absolute;
          bottom: 10px;
          left: 10px;
          right: 10px;
          color: white;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.2;
        }
        .theme-card-check {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #4169E1;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.6);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .theme-card.selected .theme-card-check {
          opacity: 1;
          transform: scale(1);
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '20px 20px 12px', flexShrink: 0 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            padding: 0, marginBottom: 16,
          }}
        >
          <ArrowLeft size={27} color="white" strokeWidth={2} />
        </button>

        <p style={{
          color: 'white',
          fontSize: 22,
          fontWeight: 800,
          margin: 0,
          letterSpacing: '-0.3px',
        }}>
          Pick 3 Themes
        </p>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {SUGGESTED_THEMES.map((theme) => {
            const isSelected = selectedThemes.includes(theme.name);
            return (
              <div
                key={theme.name}
                className={`theme-card${isSelected ? ' selected' : ''}`}
                onClick={() => toggleTheme(theme.name)}
              >
                <img src={theme.imageUrl} alt={theme.name} loading="lazy" />
                <div className="theme-card-overlay" />
                <div className="theme-card-name">{theme.name}</div>
                <div className="theme-card-check">
                  <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                    <path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '12px 16px', flexShrink: 0, backgroundColor: '#10183C' }}>
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
            transition: 'background 0.2s ease',
          }}
          onMouseDown={e => { if (canContinue) e.currentTarget.style.opacity = '0.85'; }}
          onMouseUp={e => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          onTouchStart={e => { if (canContinue) e.currentTarget.style.opacity = '0.85'; }}
          onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
        >
          {canContinue ? 'Continue' : `${remaining} more to go`}
        </button>
      </div>
    </div>
  );
};

export default ThemesPage;