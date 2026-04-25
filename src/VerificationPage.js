import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, productFunctions } from './firebase';
import { getConfirmationResult, clearConfirmationResult } from './authState';

const VerificationPage = () => {
  const navigate = useNavigate();
  const { affiliateId, linkId } = useParams();
  const location = useLocation();
  const { phoneNumber } = location.state || {};
  const confirmationResult = getConfirmationResult();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [linkDocId, setLinkDocId] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);

  useEffect(() => {
    const fp = localStorage.getItem(`info_fingerprint_${linkId}`);
    if (fp) setFingerprint(fp);
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'rating_links'), where('linkId', '==', linkId)));
        if (!snap.empty) setLinkDocId(snap.docs[0].id);
      } catch (e) { console.error(e); }
    })();
  }, [linkId]);

  const hashPhoneNumber = async (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    const salt = '5Ax1HpaMDwxIv15M6t4ZdGuC8';
    const input = salt + cleaned;
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const fetchWinCode = async () => {
    try {
      const fp = localStorage.getItem(`info_fingerprint_${linkId}`);
      if (!fp) return null;
      const linksSnap = await getDocs(query(collection(db, 'rating_links'), where('linkId', '==', linkId)));
      if (linksSnap.empty) return null;
      const ldId = linksSnap.docs[0].id;
      const winDoc = await getDoc(doc(db, 'pending_wins', `${ldId}_${fp}`));
      if (!winDoc.exists()) return null;
      return winDoc.data().code || null;
    } catch (e) { console.error(e); return null; }
  };

  const trackVerifySuccess = async (ldId, fp) => {
    if (!ldId || !fp) return;
    try {
      const trackingDocId = `${ldId}_${fp}`;
      const trackingRef = doc(db, 'unique_verify_successes', trackingDocId);
      const trackingDoc = await getDoc(trackingRef);
      if (!trackingDoc.exists()) {
        await setDoc(trackingRef, { linkId: ldId, fingerprint: fp, verifiedAt: serverTimestamp(), count: 1 });
        await updateDoc(doc(db, 'rating_links', ldId), { totalVerifySuccesses: increment(1), lastVerifySuccessAt: serverTimestamp() });
      } else {
        await updateDoc(trackingRef, { count: increment(1), lastVerifiedAt: serverTimestamp() });
      }
    } catch (e) { console.error(e); }
  };

  const handleVerify = async () => {
    setError('');
    if (!code || code.length < 4) { setError('Please enter the verification code'); return; }
    if (!confirmationResult) { setError('Session expired. Please go back and try again'); return; }

    setIsLoading(true);

    try {
      setStatusMessage('Verifying...');
      const userCredential = await confirmationResult.confirm(code);
      const userId = userCredential.user.uid;

      const phoneNumberHash = await hashPhoneNumber(phoneNumber);
      const winCode = await fetchWinCode();

      // Fetch affiliate data from marketing project
      let unseenPhotoUrl = null;
      let affiliateFirstName = null;
      try {
        const affiliateDoc = await getDoc(doc(db, 'affiliates', affiliateId));
        if (affiliateDoc.exists()) {
          unseenPhotoUrl = affiliateDoc.data()?.unseenPhotoUrl || null;
          affiliateFirstName = affiliateDoc.data()?.firstName || null;
        }
      } catch (e) { console.error('Error fetching affiliate data:', e); }

      setStatusMessage('Saving your profile...');
      const saveUserProfile = httpsCallable(productFunctions, 'saveUserProfile');
      await saveUserProfile({ winCode, phoneNumberHash, affiliateId, unseenPhotoUrl, affiliateFirstName });

      if (linkDocId && fingerprint) trackVerifySuccess(linkDocId, fingerprint);

      clearConfirmationResult();
      setIsLoading(false);
      setStatusMessage('');
      window.location.href = 'itms-apps://apps.apple.com/app/socialstar-photo-competitions/id6473705189?ppid=e9023d29-f1f3-41cc-8d27-89e179d3251b';

    } catch (err) {
      console.error('Verification error:', err);
      setIsLoading(false);
      setStatusMessage('');
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid code. Please check and try again');
      } else if (err.code === 'auth/code-expired') {
        setError('Code expired. Please resend and try again');
      } else {
        setError(err.message || 'Verification failed. Please try again');
      }
    }
  };

  const handleResend = async () => {
    setError('');
    setIsResending(true);
    try {
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
      const { productAuth } = await import('./firebase');
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
      window.recaptchaVerifier = new RecaptchaVerifier(productAuth, 'recaptcha-container', { size: 'invisible' });
      await signInWithPhoneNumber(productAuth, phoneNumber, window.recaptchaVerifier);
    } catch (err) {
      console.error('Resend error:', err);
      setError('Failed to resend code. Please try again');
    }
    setIsResending(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#10183C', display: 'flex', flexDirection: 'column', padding: '20px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: rgba(255,255,255,0.4); }
        input[type="number"]::placeholder { letter-spacing: 0; }
        input { outline: none; caret-color: white; }
        .grecaptcha-badge { visibility: hidden !important; }
      `}</style>

      <div id="recaptcha-container" />

      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
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
              color: 'white', fontSize: 19, fontWeight: 'bold',
              textAlign: 'center', margin: '0 0 30px',
            }}>
              Enter verification code
            </p>

            <input
              type="number"
              inputMode="numeric"
              placeholder="Enter verification code"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleVerify(); }}
              style={{ width: '100%', height: 60, backgroundColor: '#3B4374', border: 'none', borderRadius: 10, padding: '0 16px', color: 'white', fontSize: 16, fontWeight: 'bold' }}
            />

            {error && (
              <p style={{ color: '#FF6B6B', fontSize: 16, fontWeight: 'bold', textAlign: 'center', margin: '20px 0 0', lineHeight: 1.5 }}>
                {error}
              </p>
            )}

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: 12 }}>
                <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.2)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                {statusMessage && (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600', margin: 0 }}>
                    {statusMessage}
                  </p>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={handleVerify}
                  style={{ width: '100%', height: 58, backgroundColor: '#4169E1', border: 'none', borderRadius: 200, color: 'white', fontSize: 20, fontWeight: 'bold', cursor: 'pointer', marginTop: 15 }}
                  onMouseDown={e => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseUp={e => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  onTouchStart={e => { e.currentTarget.style.opacity = '0.85'; }}
                  onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  Continue
                </button>

                <button
                  onClick={handleResend}
                  disabled={isResending}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: isResending ? 'not-allowed' : 'pointer', marginTop: 25, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>Didn't receive a code?</span>
                  <span style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>{isResending ? 'Sending...' : 'Resend Code'}</span>
                </button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 30 }}>
            <img src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a" alt="Star" style={{ width: 22, height: 22 }} />
            <span style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>SocialStar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;