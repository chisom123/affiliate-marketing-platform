const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.validateRating = functions.https.onCall(async (data, context) => {
  try {
    // 1. Verify required fields
    if (!data.affiliateId || !data.linkId || !data.fingerprintHash) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required rating data'
      );
    }

    // 2. Social media verification
    const userAgent = context.rawRequest.headers['user-agent'] || '';
    const isInstagram = /instagram.*applewebkit/i.test(userAgent);
    const isSnapchat = /snapchat|snap_ios|snap_android/i.test(userAgent);
    
    if (!isInstagram && !isSnapchat) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Please open this link in Instagram or Snapchat to rate'
      );
    }

    // 3. Rate limiting
    const ip = context.rawRequest.ip;
    const rateKey = `rate:${ip.slice(0,8)}:${data.fingerprintHash.slice(0,8)}`;
    const rateRef = admin.firestore().collection("rateLimits").doc(rateKey);
    
    const rateData = (await rateRef.get()).data() || { count: 0 };
    if (rateData.count >= 3) {
      throw new functions.https.HttpsError(
        'resource-exhausted', 
        'You can only submit 3 ratings per hour'
      );
    }

    // 4. Update rate limits
    await rateRef.set({
      count: admin.firestore.FieldValue.increment(1),
      expiresAt: new Date(Date.now() + 3600000)
    }, { merge: true });

    return { approved: true };

  } catch (error) {
    console.error('Validation error:', error);
    // Convert unexpected errors to user-friendly messages
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw existing HttpsErrors
    }
    throw new functions.https.HttpsError(
      'internal',
      'We encountered an issue. Please try again later.'
    );
  }
});