import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { productAuth } from './firebase';
import { setConfirmationResult } from './authState';
import { Gem } from 'lucide-react';
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

// Replace imageUrl with your real assets. Theme + ratings show as overlay on each card.
const CAROUSEL_PHOTOS = [
  { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2Fb5e8e167f3bba281d0da3cc6d386f08f-2.jpg?alt=media&token=ca7700c0-9a2e-4c62-b54f-9921dd735d74', theme: 'McDinner', ratings: 18 },
  { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/themes%2Ffeb407d9c1580f8a7608e2fb43d3a059-2-2.jpg?alt=media&token=1835be03-231c-45dc-84d6-a5c738386da9', theme: 'Night Out', ratings: 22 },
  { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/carousel%2F655f4315a879b0dec798fda69813857c-2.jpg?alt=media&token=7cb94bdf-f5ab-4191-9067-f61f399f3991', theme: 'OOTD', ratings: 20 },
  { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/carousel%2Fed80ca57adbd8b105ebd9ae951e76bd6-2.jpg?alt=media&token=70cf0c6c-10fe-4cb2-ba1a-2ffde7056232', theme: 'Power Nap', ratings: 27 },
  { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/carousel%2F4d0bf56bcaf63c1ec70ac1fadb616930-2-2.jpg?alt=media&token=b9530927-737b-4f1c-a900-a2f7f8e527fd', theme: 'Getting Ready', ratings: 13 },
  { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/carousel%2Fb60808458f326f4b3b2b0ab98f901239-2.jpg?alt=media&token=4e6c12df-cbb2-4950-a70c-c3d44b4b62b5', theme: 'Class', ratings: 14 },
];

const CARD_WIDTH = 140;
const CARD_GAP = 10;
const CARD_STEP = CARD_WIDTH + CARD_GAP;
const SPEED = 0.6; // px per frame

const PhotoStrip = () => {
  // Duplicate for seamless infinite loop
  const photos = [...CAROUSEL_PHOTOS, ...CAROUSEL_PHOTOS];
  const stripRef = useRef(null);
  const posRef = useRef(0);
  const rafRef = useRef(null);
  const LOOP_WIDTH = CAROUSEL_PHOTOS.length * CARD_STEP;

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    const animate = () => {
      posRef.current += SPEED;
      if (posRef.current >= LOOP_WIDTH) {
        posRef.current -= LOOP_WIDTH;
      }
      strip.style.transform = `translateX(-${posRef.current}px)`;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [LOOP_WIDTH]);

  return (
    <div style={{ overflow: 'hidden', width: '100%' }}>
      <div
        ref={stripRef}
        style={{
          display: 'flex',
          gap: CARD_GAP,
          willChange: 'transform',
        }}
      >
        {photos.map((photo, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: CARD_WIDTH,
              height: 180,
              borderRadius: 14,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <img
              src={photo.imageUrl}
              alt={photo.theme}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Gradient + info overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0) 100%)',
              padding: '28px 8px 8px',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                backgroundColor: '#DAA520', borderRadius: 200,
                padding: '2px 7px',
              }}>
                <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>
                  {photo.ratings.toLocaleString()}
                </span>
                <span style={{ fontSize: '14px', color: 'white', lineHeight: 1 }}>★</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PromoPage = () => {
  const navigate = useNavigate();
  const { affiliateId, linkId } = useParams();

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

  const formattedPhone = `+${selectedCountry.code}${phoneNumber.replace(/\D/g, '')}`;

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch) ||
    c.iso.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const trackPromoCtaClick = async (ldId, fp) => {
    if (!ldId || !fp) return;
    try {
      const trackingDocId = `${ldId}_${fp}`;
      const trackingRef = doc(db, 'unique_promo_cta_clicks', trackingDocId);
      const trackingDoc = await getDoc(trackingRef);

      if (!trackingDoc.exists()) {
        await setDoc(trackingRef, {
          linkId: ldId,
          fingerprint: fp,
          firstClickedAt: serverTimestamp(),
          clickCount: 1
        });
        await updateDoc(doc(db, 'rating_links', ldId), {
          totalPromoCtaClicks: increment(1),
          lastPromoCtaClickAt: serverTimestamp()
        });
      } else {
        await updateDoc(trackingRef, {
          clickCount: increment(1),
          lastClickedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error('Error tracking promo CTA click:', e);
    }
  };

  const handleGetStarted = async () => {
    setError('');
    const digits = phoneNumber.replace(/\D/g, '');
    if (!digits || digits.length < 6) {
      setError('Please enter a valid phone number');
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
        trackPromoCtaClick(linkDocId, fingerprint);
      }

      navigate(`/verify/${affiliateId}/${linkId}`, {
        state: { phoneNumber: formattedPhone }
      });
    } catch (err) {
      console.error('Phone auth error:', err);
      setError(err.message || 'Failed to send code. Please try again');
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
      position: 'fixed', inset: 0, overflow: 'hidden',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      backgroundColor: '#10183C',
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: rgba(255,255,255,0.4); }
        input { outline: none; caret-color: white; }
        .grecaptcha-badge { visibility: hidden !important; }
      `}</style>

      <div id="recaptcha-container" />

      <div style={{
        position: 'relative', zIndex: 10,
        height: '100%',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Headline + badge */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          padding: '60px 24px 0px',
        }}>
          <h1 style={{
            fontSize: 'clamp(28px, 8vw, 38px)', fontWeight: 800,
            color: 'white', margin: '0 0 16px 0', lineHeight: 1.15,
            letterSpacing: '-0.5px',
            animation: 'fadeUp 0.5s ease 0.1s both',
          }}>
            Continue Playing<br />with Friends
          </h1>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            backgroundColor: '#6A5ACD', borderRadius: 200,
            padding: '8px 15px', alignSelf: 'flex-start',
            marginBottom: 28,
            animation: 'fadeUp 0.5s ease 0.2s both',
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.3px', lineHeight: 1 }}>
              Win More Points
            </span>
            <Gem size={23} color="white" strokeWidth={2} />
          </div>
        </div>

        {/* Infinite scrolling photo strip — bleeds edge to edge */}
        <div style={{
          animation: 'fadeUp 0.5s ease 0.3s both',
          margin: '0 -24px',
        }}>
          <PhotoStrip />
        </div>

        <div style={{ flex: 1 }} />

        {/* Phone input + CTA */}
        <div style={{
          padding: '20px 24px 40px',
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
                borderLeft: 'none',
                borderRadius: '0 10px 10px 0',
                padding: '0 16px',
                color: 'white', fontSize: 16, fontWeight: 'bold',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#FF0000', fontSize: 14, fontWeight: 'bold', margin: 0, textAlign: 'center' }}>
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
            ) : 'Continue'}
          </button>
        </div>
      </div>

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
                  backgroundColor: '#3B4374',
                  border: 'none', borderRadius: 10,
                  padding: '0 16px',
                  fontWeight: 'bold',
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

export default PromoPage;