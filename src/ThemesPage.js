// ThemesPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
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
  'OOTD',
  'Night Out',
  'Mirror Check',
  'WTF',
  'Getting Ready',
  'Power Nap',
  'Caught in 4K',
  'McDinner',
  'Class',
  'Another Late Night',
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
        if (!snap.empty) {
          setLinkDocId(snap.docs[0].id);
        }
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
        await setDoc(trackingRef, {
          linkId: ldId,
          fingerprint: fp,
          firstClickedAt: serverTimestamp(),
          clickCount: 1
        });
        await updateDoc(doc(db, 'rating_links', ldId), {
          totalThemesContinueClicks: increment(1),
          lastThemesContinueClickAt: serverTimestamp()
        });
      } else {
        await updateDoc(trackingRef, {
          clickCount: increment(1),
          lastClickedAt: serverTimestamp()
        });
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

    if (linkDocId && fingerprint) {
      trackThemesContinueClick(linkDocId, fingerprint);
    }

    navigate(`/name/${affiliateId}/${linkId}`, {
      state: { selectedThemes }
    });
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
      `}</style>

      {/* Header */}
      <div style={{ background: '#1A2245', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
        >
          <ArrowLeft size={27} color="white" strokeWidth={2} />
        </button>
        <span style={{ color: 'white', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
          Pick themes (3+)
        </span>
        <div style={{ width: 27 }} />
      </div>

      {/* Selected theme chips */}
      <div style={{ padding: '12px 20px', flexShrink: 0, minHeight: 52 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {selectedThemes.map(name => (
            <button
              key={name}
              onClick={() => toggleTheme(name)}
              style={{
                background: '#4169E1', border: 'none', borderRadius: 100,
                padding: '6px 12px', color: 'white', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {name}
              <X size={14} color="white" strokeWidth={3} />
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        <div style={{ background: '#1A2245', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>

          <div style={{ padding: '12px 16px 0', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Suggestions
          </div>

          {SUGGESTED_THEMES.map((name, i) => {
            const isSelected = selectedThemes.includes(name);
            return (
              <div key={name}>
                <button
                  onClick={() => toggleTheme(name)}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    padding: '18px 16px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                  onMouseDown={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseUp={e => { e.currentTarget.style.background = 'none'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  onTouchStart={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onTouchEnd={e => { e.currentTarget.style.background = 'none'; }}
                >
                  <span style={{ color: 'white', fontSize: 15, fontWeight: 700 }}>{name}</span>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: isSelected ? '#4169E1' : 'transparent',
                    border: '2px solid rgba(255,255,255,0.3)',
                    transition: 'all 0.15s',
                  }} />
                </button>
                {i < SUGGESTED_THEMES.length - 1 && (
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 16px' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '20px', flexShrink: 0, backgroundColor: '#10183C' }}>
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
          }}
          onMouseDown={e => { if (canContinue) e.currentTarget.style.opacity = '0.85'; }}
          onMouseUp={e => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          onTouchStart={e => { if (canContinue) e.currentTarget.style.opacity = '0.85'; }}
          onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
        >
          {canContinue ? 'Continue' : `Select ${remaining} more`}
        </button>
      </div>
    </div>
  );
};

export default ThemesPage;