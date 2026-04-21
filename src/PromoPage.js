// PromoPage.jsx
// Combines: PromoPage + ThemesPage + PhonePage into one screen
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Gem, X } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { productAuth } from './firebase';
import { setConfirmationResult } from './authState';
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

// ── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_THEMES = [
  { name: 'OOTD',             imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F3992207a92b1378d9d6a4b711f4b1189-2.jpg?alt=media&token=7923d0e1-2b1c-489e-b7ad-744a3131865b' },
  { name: 'Mood',             imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F07d3c9a11e7539d2410ffba6fc1b969a-2.jpg?alt=media&token=c88d655d-6548-48bf-bd9a-0d1067ea2718' },
  { name: 'Out n about',      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F7fe4ac7d95e7adbd454164b1ff561cf8-2.jpg?alt=media&token=7de3722b-33fa-494e-844c-1f1a79c0882a' },
  { name: 'Food',             imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F373c672b221c21f630b8c5601fde8a24-2.jpg?alt=media&token=0f8f0026-1521-4e90-b27d-06af04286481' },
  { name: 'Selfie',           imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F7dff83b50d757c446a0b32bf00964af9-2.jpg?alt=media&token=c47a7ca5-3bf7-436b-bff8-9142d4171e5e' },
  { name: 'Getting ready',    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2Fb77e4c2ff5e677c6aec0707bdf52ada2-2.jpg?alt=media&token=f5cffd04-ee83-4c96-9008-69e68ae2f04d' },
  { name: 'Golden hour',      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2Ffeb407d9c1580f8a7608e2fb43d3a059-2-2.jpg?alt=media&token=1835be03-231c-45dc-84d6-a5c738386da9' },
  { name: 'Woke up like this',imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F60de91dff3951a060cbfc7c065fecb46-2.jpg?alt=media&token=78df393a-15be-4d62-a19e-18246ce83ed3' },
  { name: 'Caught in 4K',     imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F9f0aceb82a7f9360d5bc93d5173c0500-2.jpg?alt=media&token=f2f42a17-06bc-4e79-858e-07771374d612' },
  { name: 'WTF',              imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F66a00648f5ad9bc0f332f5e79d3779ed-2.jpg?alt=media&token=3e19c738-3af7-452a-8c06-891d3361fc92' },
];

const COUNTRIES = [
  { iso: 'US', name: 'United States', code: '1',  flag: '🇺🇸' },
  { iso: 'GB', name: 'United Kingdom', code: '44', flag: '🇬🇧' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const detectCountry = () => {
  try {
    const region = new Intl.Locale(navigator.language || 'en-US').region;
    return COUNTRIES.find(c => c.iso === region) || COUNTRIES[0];
  } catch {
    return COUNTRIES[0];
  }
};

// ── Main component ───────────────────────────────────────────────────────────

const PromoPage = () => {
  const navigate = useNavigate();
  const { affiliateId, linkId } = useParams();

  // Firestore
  const [linkDocId,   setLinkDocId]   = useState(null);
  const [fingerprint, setFingerprint] = useState(null);

  // Themes — pick as many as you want, just need at least 1
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // Phone
  const [selectedCountry,   setSelectedCountry]   = useState(detectCountry());
  const [phoneNumber,       setPhoneNumber]       = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch,     setCountrySearch]     = useState('');
  const [isLoading,         setIsLoading]         = useState(false);
  const [error,             setError]             = useState('');

  const canDone   = selectedThemes.length >= 1;
  const canSubmit = phoneNumber.replace(/\D/g, '').length >= 6;

  // Resolve fingerprint + linkDocId
  useEffect(() => {
    const fp = localStorage.getItem(`info_fingerprint_${linkId}`);
    if (fp) setFingerprint(fp);
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'rating_links'), where('linkId', '==', linkId)));
        if (!snap.empty) setLinkDocId(snap.docs[0].id);
      } catch (e) {
        console.error('Error resolving link doc ID:', e);
      }
    })();
  }, [linkId]);

  // reCAPTCHA
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(productAuth, 'recaptcha-container', { size: 'invisible' });
    }
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // ── Tracking ────────────────────────────────────────────────────────────────

  const trackThemesContinueClick = async (ldId, fp) => {
    if (!ldId || !fp) return;
    try {
      const trackingDocId = `${ldId}_${fp}`;
      const trackingRef   = doc(db, 'unique_themes_continue_clicks', trackingDocId);
      const trackingDoc   = await getDoc(trackingRef);
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

  const trackPhoneCtaClick = async (ldId, fp) => {
    if (!ldId || !fp) return;
    try {
      const trackingDocId = `${ldId}_${fp}`;
      const trackingRef   = doc(db, 'unique_phone_cta_clicks', trackingDocId);
      const trackingDoc   = await getDoc(trackingRef);
      if (!trackingDoc.exists()) {
        await setDoc(trackingRef, { linkId: ldId, fingerprint: fp, firstClickedAt: serverTimestamp(), clickCount: 1 });
        await updateDoc(doc(db, 'rating_links', ldId), { totalPhoneCtaClicks: increment(1), lastPhoneCtaClickAt: serverTimestamp() });
      } else {
        await updateDoc(trackingRef, { clickCount: increment(1), lastClickedAt: serverTimestamp() });
      }
    } catch (e) {
      console.error('Error tracking phone CTA click:', e);
    }
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleTheme = (name) => {
    setSelectedThemes(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  };

  const handleDone = () => {
    if (!canDone) return;
    setError('');
    if (linkDocId && fingerprint) trackThemesContinueClick(linkDocId, fingerprint);
    setShowPhoneModal(true);
  };

  const handleCloseModal = () => {
    setShowPhoneModal(false);
    setError('');
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch) ||
    c.iso.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleGetStarted = async () => {
    setError('');
    if (!canSubmit) return;
    setIsLoading(true);

    try {
      const appVerifier    = window.recaptchaVerifier;
      const formattedPhone = `+${selectedCountry.code}${phoneNumber.replace(/\D/g, '')}`;
      const confirmationResult = await signInWithPhoneNumber(productAuth, formattedPhone, appVerifier);
      setConfirmationResult(confirmationResult);

      if (linkDocId && fingerprint) trackPhoneCtaClick(linkDocId, fingerprint);

      navigate(`/verify/${affiliateId}/${linkId}`, {
        state: { phoneNumber: formattedPhone, selectedThemes, competitionName: 'Competition' }
      });
    } catch (err) {
      console.error('Phone auth error:', err);
      setError(err.message || 'Failed to send code. Please try again.');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
        window.recaptchaVerifier = new RecaptchaVerifier(productAuth, 'recaptcha-container', { size: 'invisible' });
      }
    }

    setIsLoading(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed', inset: 0, overflowY: 'auto',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      backgroundColor: '#10183C',
    }}>
      <style>{`
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: rgba(255,255,255,0.4); }
        input { outline: none; caret-color: white; }
        .grecaptcha-badge { visibility: hidden !important; }

        .theme-card {
          position: relative; border-radius: 14px; overflow: hidden;
          cursor: pointer; aspect-ratio: 3/4; transition: transform 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .theme-card:active { transform: scale(0.96); }
        .theme-card img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s ease; }
        .theme-card.selected img { transform: scale(1.05); }
        .theme-card-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0) 100%);
          transition: background 0.2s ease;
        }
        .theme-card.selected .theme-card-overlay {
          background: linear-gradient(to top, rgba(65,105,225,0.85) 0%, rgba(65,105,225,0.2) 55%, rgba(0,0,0,0) 100%);
        }
        .theme-card-name {
          position: absolute; bottom: 10px; left: 10px; right: 10px;
          color: white; font-size: 16px; font-weight: 700; line-height: 1.2;
        }
        .theme-card-check {
          position: absolute; top: 8px; right: 8px;
          width: 24px; height: 24px; border-radius: 50%;
          background: transparent;
          border: 2px solid rgba(255,255,255,0.6);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
          transform: scale(1);
        }
        .theme-card.selected .theme-card-check {
          background: #4169E1;
          border-color: #4169E1;
          transform: scale(1.05);
        }
        .theme-card-check svg path {
          stroke: transparent;
          transition: stroke 0.2s ease;
        }
        .theme-card.selected .theme-card-check svg path {
          stroke: white;
        }
      `}</style>

      <div id="recaptcha-container" />

      {/* ── Hero ── */}
      <div style={{ padding: '50px 24px 0px', animation: 'fadeUp 0.5s ease 0.1s both' }}>
        <h1 style={{
          fontSize: 'clamp(28px, 8vw, 38px)', fontWeight: 800,
          color: 'white', margin: '0 0 50px 0', lineHeight: 1.15, letterSpacing: '-0.5px',
        }}>
          Pick Themes
        </h1>
      </div>

      {/* ── Theme picker ── */}
      <div style={{ padding: '0 20px', animation: 'fadeUp 0.5s ease 0.2s both' }}>
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

      {/* Spacer so last theme cards aren't hidden behind sticky footer */}
      <div style={{ height: 100 }} />

      {/* ── Sticky Next button ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 20px 12px',
        backgroundColor: '#10183C',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        zIndex: 50,
        display: 'flex', justifyContent: 'flex-end',
      }}>
        <button
          onClick={handleDone}
          disabled={!canDone}
          style={{
            height: 44, padding: '0 24px',
            backgroundColor: canDone ? '#4169E1' : 'rgba(65,105,225,0.35)',
            border: 'none', borderRadius: 200,
            color: canDone ? 'white' : 'rgba(255,255,255,0.4)',
            fontSize: 16, fontWeight: 700,
            cursor: canDone ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onMouseDown={e => { if (canDone) e.currentTarget.style.opacity = '0.85'; }}
          onMouseUp={e => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          onTouchStart={e => { if (canDone) e.currentTarget.style.opacity = '0.85'; }}
          onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Next
        </button>
      </div>

      {/* ── Phone modal ── */}
      {showPhoneModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 20px',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <button
            onClick={handleCloseModal}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'none', border: 'none',
              cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={26} color="white" strokeWidth={2} />
          </button>

          <div
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: '#1A2245',
              borderRadius: 15,
              padding: '28px 20px 28px',
              animation: 'fadeUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            <p style={{ color: 'white', fontSize: 20, fontWeight: 800, margin: '0 0 28px', letterSpacing: '-0.3px', textAlign: 'center' }}>
              Play with friends
            </p>

            <div style={{ display: 'flex', height: 56, marginBottom: 12 }}>
              <button
                onClick={() => setShowCountryPicker(true)}
                style={{
                  backgroundColor: '#323862',
                  border: 'none', borderRadius: '10px 0 0 10px',
                  padding: '0 14px', color: 'white',
                  fontSize: 16, fontWeight: 'bold',
                  cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {selectedCountry.flag} +{selectedCountry.code}
              </button>
              <input
                type="tel"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleGetStarted(); }}
                style={{
                  flex: 1, backgroundColor: '#3B4374',
                  border: 'none', borderRadius: '0 10px 10px 0',
                  padding: '0 16px', color: 'white', fontSize: 16, fontWeight: 'bold',
                }}
              />
            </div>

            {error && (
              <p style={{ color: '#FF6B6B', fontSize: 14, fontWeight: '600', margin: '0 0 12px', textAlign: 'center' }}>
                {error}
              </p>
            )}

            <button
              onClick={handleGetStarted}
              disabled={!canSubmit || isLoading}
              style={{
                width: '100%', height: 58,
                backgroundColor: canSubmit && !isLoading ? '#4169E1' : 'rgba(65,105,225,0.35)',
                border: 'none', borderRadius: 200,
                color: canSubmit && !isLoading ? 'white' : 'rgba(255,255,255,0.4)',
                fontSize: 20, fontWeight: 700,
                cursor: canSubmit && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background-color 0.2s ease',
              }}
              onMouseDown={e => { if (canSubmit && !isLoading) e.currentTarget.style.opacity = '0.85'; }}
              onMouseUp={e => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              onTouchStart={e => { if (canSubmit && !isLoading) e.currentTarget.style.opacity = '0.85'; }}
              onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {isLoading ? (
                <div style={{
                  width: 24, height: 24,
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTop: '3px solid white',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
              ) : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* ── Country picker (sits above phone modal) ── */}
      {showCountryPicker && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setShowCountryPicker(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxHeight: '70vh',
              backgroundColor: '#1A2245',
              borderRadius: '20px 20px 0 0',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 16px 8px' }}>
              <input
                autoFocus
                placeholder="Search Country"
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                style={{
                  width: '100%', height: 44, backgroundColor: '#3B4374',
                  border: 'none', borderRadius: 10, padding: '0 16px',
                  color: 'white', fontSize: 16, fontWeight: 'bold',
                }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredCountries.map((country, i) => (
                <div key={country.iso}>
                  <button
                    onClick={() => { setSelectedCountry(country); setShowCountryPicker(false); setCountrySearch(''); }}
                    style={{
                      width: '100%', padding: '14px 20px',
                      backgroundColor: selectedCountry.iso === country.iso ? '#2A3255' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{country.flag}</span>
                    <span style={{ flex: 1, color: 'white', fontSize: 16, fontWeight: '600' }}>{country.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>+{country.code}</span>
                  </button>
                  {i < filteredCountries.length - 1 && (
                    <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', margin: '0 20px' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoPage;