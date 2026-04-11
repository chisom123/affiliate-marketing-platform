import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { productAuth } from './firebase';
import { setConfirmationResult } from './authState';
import { Gem } from 'lucide-react';

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

const PromoPage = () => {
  const navigate = useNavigate();
  const { affiliateId, linkId } = useParams();

  const [selectedCountry, setSelectedCountry] = useState(detectCountry());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
      navigate(`/verify/${affiliateId}/${linkId}`, {
        state: { phoneNumber: formattedPhone }
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
      position: 'fixed', inset: 0, overflow: 'hidden',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
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

      {/* Hero background */}
      <div style={{
        position: 'absolute', inset: 0,
      }}>
        <img
          src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/partner-website%2F6b6357f22a2bcff580b0c9b6870a0868-2.jpg?alt=media&token=3de53fa0-cc5c-47c2-992c-9e1a79e9ae42"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        animation: 'fadeIn 0.6s ease forwards',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 10,
        height: '100%',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Top — headline + badge + features */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: '60px 24px 24px',
          gap: 20,
          overflowY: 'auto',
        }}>
          <h1 style={{
            fontSize: 'clamp(28px, 8vw, 38px)', fontWeight: 800,
            color: 'white', margin: 0, lineHeight: 1.15,
            letterSpacing: '-0.5px',
            animation: 'fadeUp 0.5s ease 0.1s both',
          }}>
            Photo competitions<br />with friends
          </h1>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            backgroundColor: '#6A5ACD', borderRadius: 200,
            padding: '8px 15px', alignSelf: 'flex-start',
            animation: 'fadeUp 0.5s ease 0.2s both',
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.3px', lineHeight: 1 }}>
              Win More Points
            </span>
            <Gem size={23} color="white" strokeWidth={2} />
          </div>


        </div>

        {/* Bottom — phone entry + button */}
        <div style={{
          padding: '20px 24px 40px',
          display: 'flex', flexDirection: 'column', gap: 12,
          animation: 'fadeUp 0.5s ease 0.4s both',
          backgroundColor: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)',
        }}>

          {/* Phone input row */}
          <div style={{ display: 'flex', height: 56 }}>
            <button
              onClick={() => setShowCountryPicker(true)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
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
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderLeft: 'none',
                borderRadius: '0 10px 10px 0',
                padding: '0 16px',
                color: 'white', fontSize: 16, fontWeight: 'bold',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <p style={{ color: '#FF6B6B', fontSize: 14, fontWeight: '600', margin: 0, textAlign: 'center' }}>
              {error}
            </p>
          )}

          {/* Get Started button */}
          <button
            onClick={handleGetStarted}
            disabled={isLoading}
            style={{
              width: '100%', height: 55,
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

      {/* Country picker modal */}
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

export default PromoPage;