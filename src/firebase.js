import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

// ss-web-rate — marketing project (ratings, affiliates, pending_wins)
const marketingConfig = {
  apiKey: "AIzaSyCbofaQa-No-oxgTUsHPV1ZGl7XTekgCro",
  authDomain: "ss-web-rate.firebaseapp.com",
  projectId: "ss-web-rate",
  storageBucket: "ss-web-rate.firebasestorage.app",
  messagingSenderId: "620089536789",
  appId: "1:620089536789:web:59a52c173bed01ecccf91c",
  measurementId: "G-E71Y9TK6ZJ"
};

// pingbear-96b4c — product project (auth, user accounts)
const productConfig = {
  apiKey: "AIzaSyBaDGtcm8Rx2q137wLDQGtql79YACXEdrs",
  authDomain: "pingbear-96b4c.firebaseapp.com",
  projectId: "pingbear-96b4c",
  storageBucket: "pingbear-96b4c.appspot.com",
  messagingSenderId: "958676880670",
  appId: "1:958676880670:web:42b987340032d4804a0d0f",
  measurementId: "G-WRC2L6C41S"
};

const marketingApp = initializeApp(marketingConfig);
const productApp = initializeApp(productConfig, 'product');

// ss-web-rate exports — all existing code uses these, nothing changes
export const db = getFirestore(marketingApp);
export const auth = getAuth(marketingApp);
export const functions = getFunctions(marketingApp);
export default marketingApp;

// pingbear-96b4c exports — only used in the new signup flow
export const productAuth = getAuth(productApp);
export const productDb = getFirestore(productApp);
export const productFunctions = getFunctions(productApp);