import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { productAuth } from './firebase';
import { setConfirmationResult } from './authState';
import { Lock } from 'lucide-react';
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

// ── Tracking ──────────────────────────────────────────────────────────────────
const trackPromoCtaClick = async (ldId, fp) => {
  if (!ldId || !fp) return;
  try {
    const trackingDocId = `${ldId}_${fp}`;
    const trackingRef = doc(db, 'unique_promo_cta_clicks', trackingDocId);
    const trackingDoc = await getDoc(trackingRef);
    if (!trackingDoc.exists()) {
      await setDoc(trackingRef, { linkId: ldId, fingerprint: fp, firstClickedAt: serverTimestamp(), clickCount: 1 });
      await updateDoc(doc(db, 'rating_links', ldId), { totalPromoCtaClicks: increment(1), lastPromoCtaClickAt: serverTimestamp() });
    } else {
      await updateDoc(trackingRef, { clickCount: increment(1), lastClickedAt: serverTimestamp() });
    }
  } catch (e) { console.error(e); }
};

// ── Main PromoPage ────────────────────────────────────────────────────────────
const PromoPage = () => {
  const { affiliateId, linkId } = useParams();
  const navigate = useNavigate();

  const [selectedCountry, setSelectedCountry] = useState(detectCountry());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [linkDocId, setLinkDocId] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);
  const [unseenPhotoUrl, setUnseenPhotoUrl] = useState(null);
  const [affiliateFirstName, setAffiliateFirstName] = useState('');
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch) ||
    c.iso.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Load link doc, affiliate data, unseen photo
  useEffect(() => {
    const fp = localStorage.getItem(`info_fingerprint_${linkId}`);
    if (fp) setFingerprint(fp);

    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'rating_links'), where('linkId', '==', linkId)));
        if (!snap.empty) {
          const ldId = snap.docs[0].id;
          setLinkDocId(ldId);
        }

        const affiliateDoc = await getDoc(doc(db, 'affiliates', affiliateId));
        if (affiliateDoc.exists()) {
          const data = affiliateDoc.data();
          if (data.firstName) setAffiliateFirstName(data.firstName);
          if (data.unseenPhotoUrl) setUnseenPhotoUrl(data.unseenPhotoUrl);
        }
      } catch (e) { console.error(e); } finally {
        setLoading(false);
      }
    })();
  }, [linkId, affiliateId]);

  // Set up reCAPTCHA — only after data has loaded and container is in the DOM
  useEffect(() => {
    if (loading) return;
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(productAuth, 'recaptcha-container', { size: 'invisible' });
    }
    return () => {
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    };
  }, [loading]);

  const handleContinue = async () => {
    setError('');
    const digits = phoneNumber.replace(/\D/g, '');
    if (!digits || digits.length < 6) { setError('Please enter a valid phone number'); return; }
    setIsLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = `+${selectedCountry.code}${digits}`;
      const confirmationResult = await signInWithPhoneNumber(productAuth, formattedPhone, appVerifier);
      setConfirmationResult(confirmationResult);
      if (linkDocId && fingerprint) trackPromoCtaClick(linkDocId, fingerprint);
      navigate(`/verify/${affiliateId}/${linkId}`, { state: { phoneNumber: formattedPhone } });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send code. Please try again');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
        window.recaptchaVerifier = new RecaptchaVerifier(productAuth, 'recaptcha-container', { size: 'invisible' });
      }
    }
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', backgroundColor: '#10183C'
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid rgba(255,255,255,0.2)',
          borderTop: '3px solid white',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const possessive = affiliateFirstName ? `${affiliateFirstName}'s` : '';

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      backgroundColor: '#10183C',
      display: 'flex', flexDirection: 'column'
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: rgba(255,255,255,0.35); }
        input { outline: none; caret-color: white; }
        .grecaptcha-badge { visibility: hidden !important; }
      `}</style>

      <div id="recaptcha-container" />

      {/* Hero photo section */}
      <div style={{ flex: 1, position: 'relative' }}>

        {/* Blurred photo background — fills full screen behind footer */}
        {unseenPhotoUrl ? (
          <>
            <img
              src={unseenPhotoUrl}
              alt=""
              onLoad={() => setPhotoLoaded(true)}
              style={{
                position: 'fixed', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                filter: 'blur(40px)',
                transform: 'scale(1.18)',
                opacity: photoLoaded ? 1 : 0,
                transition: 'opacity 0.5s ease',
                zIndex: 0
              }}
            />
            <div style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(16, 24, 60, 0.52)',
              zIndex: 1
            }} />
          </>
        ) : (
          <div style={{
            position: 'fixed', inset: 0,
            backgroundColor: '#10183C',
            zIndex: 0
          }} />
        )}

        {/* Lock card */}
        <div style={{
          position: 'absolute', inset: 0, justifyContent: 'center',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 18, paddingBottom: 40,
          animation: 'fadeUp 0.5s ease 0.15s both',
          zIndex: 2
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1.5px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Lock size={32} color="white" strokeWidth={2.5} />
          </div>

          <p style={{
            color: 'white', fontSize: 22, fontWeight: 700,
            margin: 0, lineHeight: 1.35, letterSpacing: '-0.3px',
            textAlign: 'center', padding: '0 40px'
          }}>
            Rate {possessive} bonus photo
          </p>
        </div>


      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#1A2245',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        padding: '20px 20px 40px',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
        animation: 'fadeUp 0.5s ease 0.25s both'
      }}>
        <div style={{ display: 'flex', height: 56, marginBottom: 12 }}>
          <button
            onClick={() => setShowCountryPicker(true)}
            style={{
              backgroundColor: '#323862', border: 'none',
              borderRadius: '12px 0 0 12px',
              padding: '0 14px', color: 'white', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit'
            }}
          >
            {selectedCountry.flag} +{selectedCountry.code}
          </button>
          <input
            type="tel"
            placeholder="Enter phone number"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleContinue(); }}
            style={{
              flex: 1, backgroundColor: '#3B4374', border: 'none',
              borderLeft: 'none', borderRadius: '0 12px 12px 0',
              padding: '0 16px', color: 'white', fontSize: 16, fontWeight: 'bold'
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#FF6B6B', fontSize: 14, fontWeight: 600, margin: '0 0 12px', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleContinue}
          disabled={isLoading}
          style={{
            width: '100%', height: 58,
            backgroundColor: isLoading ? '#2A3A6B' : '#4169E1',
            border: 'none', borderRadius: 200,
            color: 'white', fontSize: 20, fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit', letterSpacing: '-0.2px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseDown={e => { if (!isLoading) e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          onTouchStart={e => { if (!isLoading) e.currentTarget.style.opacity = '0.85'; }}
          onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
        >
          {isLoading
            ? <div style={{ width: 24, height: 24, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : 'Continue'
          }
        </button>
      </div>

      {/* Country picker */}
      {showCountryPicker && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowCountryPicker(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxHeight: '70vh', backgroundColor: '#1A2245', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div style={{ padding: '16px 16px 8px', flexShrink: 0 }}>
              <input
                autoFocus
                placeholder="Search country..."
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                style={{ width: '100%', height: 44, backgroundColor: '#3B4374', border: 'none', borderRadius: 10, padding: '0 16px', fontWeight: 'bold', color: 'white', fontSize: 16, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredCountries.map((country, i) => (
                <div key={country.iso}>
                  <button
                    onClick={() => { setSelectedCountry(country); setShowCountryPicker(false); setCountrySearch(''); }}
                    style={{ width: '100%', padding: '14px 20px', backgroundColor: selectedCountry.iso === country.iso ? '#2A3255' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontFamily: 'inherit' }}
                  >
                    <span style={{ fontSize: 22 }}>{country.flag}</span>
                    <span style={{ flex: 1, color: 'white', fontSize: 16, fontWeight: 600 }}>{country.name}</span>
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