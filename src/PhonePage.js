// PhonePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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

  const { selectedThemes, competitionName } = location.state || {};

  const [selectedCountry, setSelectedCountry] = useState(detectCountry());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkDocId, setLinkDocId] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);

  const canContinue = phoneNumber.replace(/\D/g, '').length > 0;

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

  // Guard comes after all hooks
  if (!selectedThemes || selectedThemes.length < 3 || !competitionName) {
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
        await setDoc(trackingRef, {
          linkId: ldId,
          fingerprint: fp,
          firstClickedAt: serverTimestamp(),
          clickCount: 1
        });
        await updateDoc(doc(db, 'rating_links', ldId), {
          totalPhoneCtaClicks: increment(1),
          lastPhoneCtaClickAt: serverTimestamp()
        });
      } else {
        await updateDoc(trackingRef, {
          clickCount: increment(1),
          lastClickedAt: serverTimestamp()
        });
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
      const confirmationResult = await signInWithPhoneNumber(
        productAuth,
        formattedPhone,
        appVerifier
      );

      setConfirmationResult(confirmationResult);

      if (linkDocId && fingerprint) {
        trackPhoneCtaClick(linkDocId, fingerprint);
      }

      navigate(`/verify/${affiliateId}/${linkId}`, {
        state: { phoneNumber: formattedPhone, selectedThemes, competitionName }
      });
    } catch (err) {
      console.error('Phone auth error:', err);
      setError(err.message || 'Failed to send code. Please try again.');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
        window.recaptchaVerifier = new RecaptchaVerifier(
          productAuth,
          'recaptcha-container',
          { size: 'invisible' }
        );
      }
    }

    setIsLoading(false);
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
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: rgba(255,255,255,0.4); }
        input { outline: none; caret-color: white; }
        .grecaptcha-badge { visibility: hidden !important; }
      `}</style>

      <div id="recaptcha-container" />

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
              Enter your phone number
            </p>

            <p style={{
              color: 'rgba(255,255,255,0.6)', fontSize: 14,
              textAlign: 'center', margin: '0 0 25px',
            }}>
              We'll send you a verification code
            </p>

            <div style={{ display: 'flex', height: 60 }}>
              <button
                onClick={() => setShowCountryPicker(true)}
                style={{
                  backgroundColor: '#3B4374',
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
                onKeyDown={e => { if (e.key === 'Enter' && canContinue) handleGetStarted(); }}
                style={{
                  flex: 1,
                  backgroundColor: '#3B4374',
                  border: 'none',
                  borderLeft: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0 10px 10px 0',
                  padding: '0 16px',
                  color: 'white', fontSize: 16, fontWeight: 'bold',
                }}
              />
            </div>

            {error && (
              <p style={{
                color: '#FF6B6B', fontSize: 14, fontWeight: '600',
                margin: '12px 0 0', textAlign: 'center',
              }}>
                {error}
              </p>
            )}

            <button
              onClick={handleGetStarted}
              disabled={isLoading || !canContinue}
              style={{
                width: '100%', height: 58,
                marginTop: 20,
                backgroundColor: canContinue && !isLoading ? '#4169E1' : 'rgba(65,105,225,0.35)',
                border: 'none', borderRadius: 200,
                color: canContinue && !isLoading ? 'white' : 'rgba(255,255,255,0.4)',
                fontSize: 20, fontWeight: 700,
                cursor: canContinue && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseDown={e => { if (canContinue && !isLoading) e.currentTarget.style.opacity = '0.85'; }}
              onMouseUp={e => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              onTouchStart={e => { if (canContinue && !isLoading) e.currentTarget.style.opacity = '0.85'; }}
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
              ) : 'Continue'}
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
                placeholder="Search country..."
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                style={{
                  width: '100%', height: 44,
                  backgroundColor: '#2A3A6B',
                  border: 'none', borderRadius: 10,
                  padding: '0 16px',
                  color: 'white', fontSize: 16,
                }}
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredCountries.map((country, i) => (
                <div key={country.iso}>
                  <button
                    onClick={() => {
                      setSelectedCountry(country);
                      setShowCountryPicker(false);
                      setCountrySearch('');
                    }}
                    style={{
                      width: '100%', padding: '14px 20px',
                      backgroundColor: selectedCountry.iso === country.iso ? '#2A3255' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{country.flag}</span>
                    <span style={{ flex: 1, color: 'white', fontSize: 16, fontWeight: '600' }}>
                      {country.name}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
                      +{country.code}
                    </span>
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