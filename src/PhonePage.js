// PhonePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Gem } from 'lucide-react';
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

const COUNTRIES = [
  { iso: 'US', name: 'United States', code: '1', flag: '🇺🇸' },
  { iso: 'GB', name: 'United Kingdom', code: '44', flag: '🇬🇧' },
];

const THEME_IMAGES = {
  'Selfie':            'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F7dff83b50d757c446a0b32bf00964af9-2.jpg?alt=media&token=c47a7ca5-3bf7-436b-bff8-9142d4171e5e',
  'Outfit of the day': 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F3992207a92b1378d9d6a4b711f4b1189-2.jpg?alt=media&token=7923d0e1-2b1c-489e-b7ad-744a3131865b',
  'Mood':              'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F07d3c9a11e7539d2410ffba6fc1b969a-2.jpg?alt=media&token=c88d655d-6548-48bf-bd9a-0d1067ea2718',
  'Food':              'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F373c672b221c21f630b8c5601fde8a24-2.jpg?alt=media&token=0f8f0026-1521-4e90-b27d-06af04286481',
  'Getting ready':     'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2Fb77e4c2ff5e677c6aec0707bdf52ada2-2.jpg?alt=media&token=f5cffd04-ee83-4c96-9008-69e68ae2f04d',
  'Woke up like this': 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F60de91dff3951a060cbfc7c065fecb46-2.jpg?alt=media&token=78df393a-15be-4d62-a19e-18246ce83ed3',
  'Golden hour':       'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2Ffeb407d9c1580f8a7608e2fb43d3a059-2-2.jpg?alt=media&token=1835be03-231c-45dc-84d6-a5c738386da9',
  'Out n about':       'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F7fe4ac7d95e7adbd454164b1ff561cf8-2.jpg?alt=media&token=7de3722b-33fa-494e-844c-1f1a79c0882a',
  'Caught in 4K':      'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F9f0aceb82a7f9360d5bc93d5173c0500-2.jpg?alt=media&token=f2f42a17-06bc-4e79-858e-07771374d612',
  'WTF':               'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2F66a00648f5ad9bc0f332f5e79d3779ed-2.jpg?alt=media&token=3e19c738-3af7-452a-8c06-891d3361fc92',
};

const detectCountry = () => {
  try {
    const locale = navigator.language || 'en-US';
    const region = new Intl.Locale(locale).region;
    return COUNTRIES.find(c => c.iso === region) || COUNTRIES.find(c => c.iso === 'US');
  } catch {
    return COUNTRIES.find(c => c.iso === 'US');
  }
};

const PhonePage = () => {
  const navigate = useNavigate();
  const { affiliateId, linkId } = useParams();
  const location = useLocation();

  const { selectedThemes } = location.state || {};

  const [selectedCountry, setSelectedCountry] = useState(detectCountry());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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
        if (!snap.empty) setLinkDocId(snap.docs[0].id);
      } catch (e) {
        console.error('Error resolving link doc ID:', e);
      }
    })();
  }, [linkId]);

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        productAuth,
        'recaptcha-container',
        { size: 'invisible' }
      );
    }
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  if (!selectedThemes || selectedThemes.length < 3) {
    navigate(`/themes/${affiliateId}/${linkId}`, { replace: true });
    return null;
  }

  const formattedPhone = `+${selectedCountry.code}${phoneNumber.replace(/\D/g, '')}`;

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch) ||
    c.iso.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const trackPhoneCtaClick = async (ldId, fp) => {
    if (!ldId || !fp) return;
    try {
      const trackingDocId = `${ldId}_${fp}`;
      const trackingRef = doc(db, 'unique_phone_cta_clicks', trackingDocId);
      const trackingDoc = await getDoc(trackingRef);
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

  const handleGetStarted = async () => {
    setError('');
    const digits = phoneNumber.replace(/\D/g, '');
    if (!digits || digits.length < 6) {
      setError('Please enter a valid phone number.');
      return;
    }

    setIsLoading(true);

    try {
      const appVerifier = window.recaptchaVerifier;
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

  const renderThemeName = (name) => {
    if (name === 'Outfit of the day') {
      return <><span>Outfit of</span><br /><span>the day</span></>;
    }
    return name;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      backgroundColor: '#10183C',
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: rgba(255,255,255,0.4); }
        input { outline: none; caret-color: white; }
        .grecaptcha-badge { visibility: hidden !important; }
        .theme-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <div id="recaptcha-container" />

      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Back button */}
        <div style={{ padding: '20px 20px 0' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
          >
            <ArrowLeft size={27} color="white" strokeWidth={2} />
          </button>
        </div>

        {/* Title + badge */}
        <div style={{ padding: '32px 20px 0px', animation: 'fadeUp 0.5s ease 0.1s both' }}>
          <h1 style={{
            fontSize: 'clamp(28px, 8vw, 38px)', fontWeight: 800,
            color: 'white', margin: '0 0 16px 0', lineHeight: 1.15, letterSpacing: '-0.5px',
          }}>
            My Competition
          </h1>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            backgroundColor: '#6A5ACD', borderRadius: 200,
            padding: '8px 15px',
            marginBottom: 24,
            animation: 'fadeUp 0.5s ease 0.2s both',
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.3px', lineHeight: 1 }}>
              Win Points
            </span>
            <Gem size={23} color="white" strokeWidth={2} />
          </div>
        </div>

        {/* Selected theme cards */}
        <div style={{ marginBottom: 8, animation: 'fadeUp 0.5s ease 0.3s both' }}>
          <div
            className="theme-scroll"
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 4,
              scrollbarWidth: 'none',
            }}
          >
            {selectedThemes.map(name => (
              <div
                key={name}
                style={{
                  flexShrink: 0,
                  width: 140,
                  height: 180,
                  borderRadius: 14,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <img
                  src={THEME_IMAGES[name]}
                  alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* Full overlay with centered large text */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 100%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-start',
                  padding: '10px 10px',
                }}>
                  <div style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: 800,
                    lineHeight: 1.2,
                    textAlign: 'left',
                  }}>
                    {renderThemeName(name)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Phone input + CTA */}
        <div style={{
          padding: '20px 20px 40px',
          display: 'flex', flexDirection: 'column', gap: 12,
          animation: 'fadeUp 0.5s ease 0.4s both',
          backgroundColor: '#1A2245',
        }}>
          <div style={{ display: 'flex', height: 56 }}>
            <button
              onClick={() => setShowCountryPicker(true)}
              style={{
                backgroundColor: '#323862',
                border: 'none',
                borderRadius: '10px 0 0 10px',
                padding: '0 14px',
                color: 'white', fontSize: 16, fontWeight: 'bold',
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
                flex: 1,
                backgroundColor: '#3B4374',
                border: 'none',
                borderRadius: '0 10px 10px 0',
                padding: '0 16px',
                color: 'white', fontSize: 16, fontWeight: 'bold',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#FF6B6B', fontSize: 14, fontWeight: '600', margin: 0, textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleGetStarted}
            disabled={isLoading}
            style={{
              width: '100%', height: 58,
              backgroundColor: '#4169E1',
              border: 'none', borderRadius: 200,
              color: 'white', fontSize: 20, fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '-0.2px',
            }}
            onMouseDown={e => { if (!isLoading) e.currentTarget.style.opacity = '0.85'; }}
            onMouseUp={e => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            onTouchStart={e => { if (!isLoading) e.currentTarget.style.opacity = '0.85'; }}
            onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {isLoading ? (
              <div style={{
                width: 24, height: 24,
                border: '3px solid rgba(255,255,255,0.3)',
                borderTop: '3px solid white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : 'Get Started'}
          </button>
        </div>
      </div>

      {/* Country picker */}
      {showCountryPicker && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
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
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 16px 8px' }}>
              <input
                autoFocus
                placeholder="Search Country"
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                style={{
                  width: '100%', height: 44,
                  backgroundColor: '#3B4374',
                  border: 'none', borderRadius: 10,
                  padding: '0 16px',
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
                      display: 'flex', alignItems: 'center', gap: 12,
                      textAlign: 'left',
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

export default PhonePage;