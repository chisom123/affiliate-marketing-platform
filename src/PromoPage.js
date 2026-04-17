// PromoPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Gem } from 'lucide-react';
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

const CAROUSEL_PHOTOS = [
  { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/carousel%2Fefaaf606a1373ca54f8d115d272cfb91-2.jpg?alt=media&token=1eb2b05c-0955-4866-bfd7-cb85c86d4dd1', theme: 'McDinner', ratings: 18 },
  { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/carousel%2Fcd4b79e5f8015d314f8ec6d2d428c2a5-2.jpg?alt=media&token=5484de1f-d3d2-4705-8b48-10a3a64a836c', theme: 'Night Out', ratings: 22 },
  { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/carousel%2F655f4315a879b0dec798fda69813857c-2.jpg?alt=media&token=7cb94bdf-f5ab-4191-9067-f61f399f3991', theme: 'OOTD', ratings: 20 },
  { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/carousel%2Fed80ca57adbd8b105ebd9ae951e76bd6-2.jpg?alt=media&token=70cf0c6c-10fe-4cb2-ba1a-2ffde7056232', theme: 'Power Nap', ratings: 27 },
  { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/carousel%2F4d0bf56bcaf63c1ec70ac1fadb616930-2-2.jpg?alt=media&token=b9530927-737b-4f1c-a900-a2f7f8e527fd', theme: 'Getting Ready', ratings: 13 },
  { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/carousel%2Fb60808458f326f4b3b2b0ab98f901239-2.jpg?alt=media&token=4e6c12df-cbb2-4950-a70c-c3d44b4b62b5', theme: 'Class', ratings: 14 },
];

const CARD_WIDTH = 140;
const CARD_GAP = 10;
const CARD_STEP = CARD_WIDTH + CARD_GAP;
const SPEED = 0.6;

const PhotoStrip = () => {
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
      if (posRef.current >= LOOP_WIDTH) posRef.current -= LOOP_WIDTH;
      strip.style.transform = `translateX(-${posRef.current}px)`;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [LOOP_WIDTH]);

  return (
    <div style={{ overflow: 'hidden', width: '100%' }}>
      <div ref={stripRef} style={{ display: 'flex', gap: CARD_GAP, willChange: 'transform' }}>
        {photos.map((photo, i) => (
          <div key={i} style={{ flexShrink: 0, width: CARD_WIDTH, height: 180, borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
            <img src={photo.imageUrl} alt={photo.theme} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0) 100%)', padding: '28px 8px 8px' }}>
              <div style={{ color: 'white', fontSize: 11, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>{photo.theme}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: '#DAA520', borderRadius: 200, padding: '2px 7px' }}>
                <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{photo.ratings.toLocaleString()}</span>
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

  const handleContinue = () => {
    if (linkDocId && fingerprint) {
      trackPromoCtaClick(linkDocId, fingerprint);
    }
    navigate(`/themes/${affiliateId}/${linkId}`);
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
        .grecaptcha-badge { visibility: hidden !important; }
      `}</style>

      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Headline + badge */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '60px 24px 0px' }}>
          <h1 style={{
            fontSize: 'clamp(28px, 8vw, 38px)', fontWeight: 800,
            color: 'white', margin: '0 0 16px 0', lineHeight: 1.15,
            letterSpacing: '-0.5px', animation: 'fadeUp 0.5s ease 0.1s both',
          }}>
            Photo competitions<br />with friends
          </h1>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            backgroundColor: '#6A5ACD', borderRadius: 200,
            padding: '8px 15px', alignSelf: 'flex-start', marginBottom: 28,
            animation: 'fadeUp 0.5s ease 0.2s both',
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.3px', lineHeight: 1 }}>
              Win More Points
            </span>
            <Gem size={23} color="white" strokeWidth={2} />
          </div>
        </div>

        {/* Photo strip */}
        <div style={{ animation: 'fadeUp 0.5s ease 0.3s both', margin: '0 -24px' }}>
          <PhotoStrip />
        </div>

        <div style={{ flex: 1 }} />

        {/* CTA */}
        <div style={{
          padding: '20px 24px 40px',
          animation: 'fadeUp 0.5s ease 0.4s both'
        }}>
          <button
            onClick={handleContinue}
            style={{
              width: '100%', height: 58,
              backgroundColor: '#4169E1',
              border: 'none', borderRadius: 200,
              color: 'white', fontSize: 20, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '-0.2px',
            }}
            onMouseDown={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseUp={e => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            onTouchStart={e => { e.currentTarget.style.opacity = '0.85'; }}
            onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoPage;