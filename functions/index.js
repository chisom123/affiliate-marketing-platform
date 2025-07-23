const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.validateRating = functions.https.onCall(async (data, context) => {
  // 1. Block non-Instagram/Snapchat browsers
  const userAgent = context.rawRequest.headers["user-agent"] || "";
  const isSocial = /instagram|snapchat/i.test(userAgent.toLowerCase());
  if (!isSocial) throw new functions.https.HttpsError("permission-denied", "Use Instagram/Snapchat to rate");

  // 2. Rate limiting (3 ratings/hour per IP + fingerprint)
  const ip = context.rawRequest.ip;
  const rateKey = `rate:${ip.slice(0, 8)}:${data.fingerprintHash.slice(0, 8)}`;
  const rateRef = admin.firestore().collection("rateLimits").doc(rateKey);
  
  const rateData = (await rateRef.get()).data() || { count: 0 };
  if (rateData.count >= 3) throw new functions.https.HttpsError("resource-exhausted", "Too many ratings");

  // 3. Approve and update rate limit
  await rateRef.set({
    count: admin.firestore.FieldValue.increment(1),
    expiresAt: new Date(Date.now() + 3600000) // 1-hour expiry
  }, { merge: true });

  return { approved: true };
});