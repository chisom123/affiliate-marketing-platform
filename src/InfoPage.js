import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { Gem } from 'lucide-react';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';

const isDevelopment = process.env.NODE_ENV === 'development';

const isInstagramApp = () => {
  if (isDevelopment) return true;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /instagram/i.test(ua) || (/instagram.*applewebkit/i.test(ua) && !/safari/i.test(ua)) || /instagram.*android/i.test(ua);
};

const generateFingerprint = async () => {
  const components = [
    `screen:${window.screen.width}x${window.screen.height}`,
    `colorDepth:${window.screen.colorDepth}`,
    `pixelRatio:${window.devicePixelRatio}`,
    `timezone:${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
    `language:${navigator.language}`,
    `platform:${navigator.platform}`,
    `hardwareConcurrency:${navigator.hardwareConcurrency || 'unknown'}`,
    `mobile:${/Mobile|Android|iPhone/i.test(navigator.userAgent)}`,
  ];
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200; canvas.height = 50;
    ctx.textBaseline = 'top'; ctx.font = '14px Arial';
    ctx.fillStyle = '#f60'; ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069'; ctx.fillText('Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)'; ctx.fillText('Fingerprint', 4, 17);
    components.push(`canvas:${canvas.toDataURL().length}`);
  } catch { components.push('canvas:error'); }
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      const di = gl.getExtension('WEBGL_debug_renderer_info');
      components.push(`webglVendor:${gl.getParameter(di.UNMASKED_VENDOR_WEBGL)?.substring(0, 20) || 'unknown'}`);
      components.push(`webglRenderer:${gl.getParameter(di.UNMASKED_RENDERER_WEBGL)?.substring(0, 20) || 'unknown'}`);
    }
  } catch { components.push('webgl:error'); }
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
  return Math.abs(hash).toString(36);
};

const FUNCTIONS_BASE_URL = 'https://us-central1-pingbear-96b4c.cloudfunctions.net';
const APP_STORE_URL = 'https://apps.apple.com/app/socialstar-app/id6473705189';

const Spinner = ({ size = 40 }) => (
  <div style={{
    width: `${size}px`, height: `${size}px`, flexShrink: 0,
    border: `${size > 20 ? 3 : 2}px solid rgba(255,255,255,0.2)`,
    borderTop: `${size > 20 ? 3 : 2}px solid #fff`,
    borderRadius: '50%', animation: 'spin 0.8s linear infinite'
  }} />
);

const ProfilePicture = ({ url, size = 40 }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: '#2A3A6B', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url ? (
        <img
          src={url} alt=""
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }}
        />
      ) : (
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
      )}
    </div>
  );
};

const calcPrizeCents = (rank, firstPlacePrize, decayRate, minPayout) => {
  if (decayRate === 0) return rank === 1 ? Math.floor(firstPlacePrize * 100) : 0;
  const cents = Math.floor(firstPlacePrize * 100 * Math.pow(decayRate, rank - 1));
  return cents < Math.floor(minPayout * 100) ? 0 : cents;
};

const calcMaxPrizePool = (firstPlacePrize, decayRate, minPayout, maxParticipants) => {
  let total = 0;
  for (let rank = 1; rank <= maxParticipants; rank++) {
    const c = calcPrizeCents(rank, firstPlacePrize, decayRate, minPayout);
    if (c === 0 && decayRate !== 0) break;
    if (c === 0) continue;
    total += c;
  }
  return Math.ceil(total / 100);
};

const InfoPage = () => {
  const { affiliateId, linkId } = useParams();
  const navigate = useNavigate();

  const [fingerprint, setFingerprint]       = useState(null);
  const [isValidEnvironment, setIsValid]    = useState(true);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [pointsWon, setPointsWon]           = useState(0);
  const [pot, setPot]                       = useState(null);
  const [participants, setParticipants]     = useState([]);
  const [leaderboardLoading, setLbLoading]  = useState(true);
  const [timeRemaining, setTimeRemaining]   = useState('');
  const [userPosition, setUserPosition]     = useState(null);
  const [linkDocId, setLinkDocId]           = useState(null); // stored for tracking
  const [continueInProgress, setContinueInProgress] = useState(false);
  const timerRef = useRef(null);

  // Fingerprint
  useEffect(() => {
    (async () => {
      try {
        if (!isInstagramApp() && !isDevelopment) {
          setIsValid(false);
          setError('Please open this link in the Instagram app');
          setLoading(false);
          return;
        }
        const fp = await generateFingerprint();
        setFingerprint(fp);
        localStorage.setItem(`info_fingerprint_${linkId}`, fp);
      } catch {
        setFingerprint(`fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      }
    })();
  }, [linkId]);

  // Win data — also caches linkDocId for tracking
  useEffect(() => {
    if (!fingerprint || !linkId || !isValidEnvironment) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'rating_links'), where('linkId', '==', linkId)));
        if (snap.empty) { setError('Rating link not found'); setLoading(false); return; }
        const ld = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setLinkDocId(ld.id); // cache for use in tracking
        const winDoc = await getDoc(doc(db, 'pending_wins', `${ld.id}_${fingerprint}`));
        if (winDoc.exists()) {
          setPointsWon(winDoc.data().points || 0);
        } else {
          setError('No winnings found. Please rate first.');
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load your winnings');
      }
      setLoading(false);
    })();
  }, [fingerprint, linkId, isValidEnvironment]);

  // Leaderboard
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${FUNCTIONS_BASE_URL}/getCurrentPot`);
        if (!res.ok) throw new Error('Failed');
        const { pot: potData, participants: parts } = await res.json();
        setPot(potData);
        const tiedGroups = {};
        parts.forEach(p => { (tiedGroups[p.rank] = tiedGroups[p.rank] || []).push(p); });
        setParticipants(parts.map((p, i) => ({
          ...p,
          position: i + 1,
          prize: Math.floor(calcPrizeCents(p.rank, potData.firstPlacePrize, potData.decayRate, potData.minPayout) / (tiedGroups[p.rank]?.length || 1)) / 100,
        })));
      } catch (e) { console.error(e); }
      setLbLoading(false);
    })();
  }, []);

  // Project user position
  useEffect(() => {
    if (!participants.length || !pot || pointsWon === 0) return;
    const insertAt = participants.findIndex(p => pointsWon > p.totalStars);
    const userIndex = insertAt === -1 ? participants.length : insertAt;
    const tiedAbove = userIndex > 0 && participants[userIndex - 1].totalStars === pointsWon;
    const projRank = tiedAbove ? participants[userIndex - 1].rank : userIndex + 1;
    const tiedWithUser = participants.filter(p => p.totalStars === pointsWon);
    const tiedCount = tiedWithUser.length + 1;
    const prize = calcPrizeCents(projRank, pot.firstPlacePrize, pot.decayRate, pot.minPayout) / 100 / tiedCount;
    setUserPosition({ position: userIndex + 1, rank: projRank, prize, totalStars: pointsWon });
  }, [participants, pointsWon, pot]);

  // Timer
  useEffect(() => {
    if (!pot?.endDate) return;
    const update = () => {
      const diff = Math.max(0, pot.endDate - Date.now());
      if (!diff) { setTimeRemaining('Ended'); clearInterval(timerRef.current); return; }
      const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000),
            m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => clearInterval(timerRef.current);
  }, [pot]);

  // ── Track info continue click ─────────────────────────────────────────────
  const trackInfoContinueClick = async (ldId, fp) => {
    if (!ldId || !fp) return;
    try {
      const trackingDocId = `${ldId}_${fp}`;
      const trackingRef = doc(db, 'unique_info_continue_clicks', trackingDocId);
      const trackingDoc = await getDoc(trackingRef);

      if (!trackingDoc.exists()) {
        await setDoc(trackingRef, {
          linkId: ldId,
          fingerprint: fp,
          firstClickedAt: serverTimestamp(),
          clickCount: 1
        });
        await updateDoc(doc(db, 'rating_links', ldId), {
          totalInfoContinueClicksDownload: increment(1),
          lastInfoContinueClickAt: serverTimestamp()
        });
      } else {
        await updateDoc(trackingRef, {
          clickCount: increment(1),
          lastClickedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error('Error tracking info continue click:', e);
    }
  };

  const handleContinue = async () => {
    if (continueInProgress) return;
    setContinueInProgress(true);

    // Fire and forget — don't block navigation
    if (linkDocId && fingerprint) {
      trackInfoContinueClick(linkDocId, fingerprint);
    }

    navigate(`/promo/${affiliateId}/${linkId}`);
  };

  const maxPrizePool = pot
    ? calcMaxPrizePool(pot.firstPlacePrize, pot.decayRate, pot.minPayout, pot.maxParticipants)
    : 0;

  const globalStyles = `@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; } .grecaptcha-badge { visibility: hidden !important; }`;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#10183C' }}>
      <style>{globalStyles}</style><Spinner />
    </div>
  );

  if (!isValidEnvironment || error) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#10183C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{globalStyles}</style>
      <div style={{ width: '100%', maxWidth: 500, textAlign: 'center' }}>
        <div style={{ backgroundColor: '#1A2245', borderRadius: 12, padding: '40px 30px', marginBottom: 30 }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 18, margin: 0 }}>{error || 'Something went wrong'}</p>
        </div>
        <a href={APP_STORE_URL} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a" alt="" style={{ width: 22, height: 22 }} />
          <span style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>SocialStar</span>
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#10183C', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{globalStyles}</style>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 20px' }}>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>Prizes</span>
        </div>

        <div style={{ margin: '8px 20px 0', backgroundColor: '#1A2245', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '0 0 6px' }}>Prize Pool</p>
              <div style={{ display: 'inline-block', backgroundColor: '#00AA00', borderRadius: 12, padding: '3px 10px' }}>
                <span style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>
                  {leaderboardLoading ? '$100' : `$${maxPrizePool}`}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '0 0 6px' }}>Ends In</p>
              <p style={{ color: 'white', fontSize: 18, fontWeight: 'bold', margin: 0 }}>{timeRemaining || '—'}</p>
            </div>
          </div>
        </div>

        <div style={{ margin: '20px 20px 0', backgroundColor: '#1A2245', borderRadius: 10, overflow: 'hidden' }}>
          {leaderboardLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
          ) : (() => {
            const list = participants.slice(0, 50).map(p => ({ ...p, isUserRow: false }));

            if (userPosition && pointsWon > 0) {
              const insertAt = list.findIndex(p => pointsWon > p.totalStars);
              const userPos = insertAt === -1 ? list.length + 1 : insertAt + 1;
              const userRow = {
                isUserRow: true,
                position: userPos,
                prize: userPosition.prize,
                totalStars: pointsWon,
              };
              if (insertAt === -1) { list.push(userRow); } else { list.splice(insertAt, 0, userRow); }
            }

            const userRowIndex = list.findIndex(r => r.isUserRow);

            const recalcList = list.map((row, i) => {
              if (row.isUserRow) return row;
              const newRank = (userRowIndex !== -1 && i > userRowIndex) ? row.rank + 1 : row.rank;
              const tiedRealCount = list.filter((r, ri) => {
                if (r.isUserRow) return false;
                const rNewRank = (userRowIndex !== -1 && ri > userRowIndex) ? r.rank + 1 : r.rank;
                return rNewRank === newRank;
              }).length;
              const tiesWithUser = userPosition && row.totalStars === pointsWon;
              const totalTied = tiesWithUser ? tiedRealCount + 1 : tiedRealCount;
              const newPrize = pot
                ? calcPrizeCents(newRank, pot.firstPlacePrize, pot.decayRate, pot.minPayout) / 100 / Math.max(1, totalTied)
                : row.prize;
              return { ...row, prize: newPrize };
            });

            return recalcList.map((row, i) => {
              const displayPosition = (!row.isUserRow && userRowIndex !== -1 && i > userRowIndex)
                ? row.position + 1 : row.position;
              return (
                <div key={row.isUserRow ? 'user-row' : (row.userId || i)}>
                  <div style={{
                    display: 'flex', alignItems: 'center', padding: '25px 20px',
                    backgroundColor: row.isUserRow ? '#2A3255' : 'transparent',
                  }}>
                    <div style={{ width: 30, flexShrink: 0, textAlign: 'center', marginRight: 12 }}>
                      <span style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>{displayPosition}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, minWidth: 0 }}>
                      <ProfilePicture url={row.isUserRow ? null : row.profilePictureUrl} size={40} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 16, fontWeight: 'bold', color: 'white', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.isUserRow ? 'Me' : (row.name || 'Player')}
                        </p>
                        {row.prize > 0 && (
                          <span style={{ fontSize: 14, fontWeight: 'bold', color: 'white', backgroundColor: '#00AA00', borderRadius: 200, padding: '2px 8px', display: 'inline-block' }}>
                            ${row.prize.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#6A5ACD', borderRadius: 200, padding: '2.75px 10px', flexShrink: 0 }}>
                      <span style={{ fontSize: 17, fontWeight: 'bold', color: 'white' }}>{(row.totalStars || 0).toLocaleString()}</span>
                      <Gem size={18} color="white" strokeWidth={2} />
                    </div>
                  </div>
                  {i < recalcList.length - 1 && (
                    <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <div style={{ backgroundColor: '#2A3255', padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 35, flexShrink: 0, textAlign: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
              {userPosition ? userPosition.position : '--'}
            </span>
          </div>
          <ProfilePicture url={null} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 'bold', color: 'white', margin: '0 0 4px' }}>Me</p>
            {userPosition && userPosition.prize > 0 && (
              <span style={{ fontSize: 14, fontWeight: 'bold', color: 'white', backgroundColor: '#00AA00', borderRadius: 200, padding: '2px 8px', display: 'inline-block' }}>
                ${userPosition.prize.toFixed(2)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#6A5ACD', borderRadius: 200, padding: '2.75px 10px', flexShrink: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 'bold', color: 'white' }}>{pointsWon.toLocaleString()}</span>
            <Gem size={18} color="white" strokeWidth={2} />
          </div>
        </div>

        <div style={{ backgroundColor: '#10183C', padding: '12px 20px' }}>
          <button
            onClick={handleContinue}
            disabled={continueInProgress}
            style={{
              width: '100%', height: 55, backgroundColor: '#4169E1',
              border: 'none', borderRadius: 200,
              color: 'white', fontSize: 18, fontWeight: 'bold',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
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

export default InfoPage;