import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
    apiKey: "AIzaSyCbofaQa-No-oxgTUsHPV1ZGl7XTekgCro",
    authDomain: "ss-web-rate.firebaseapp.com",
    projectId: "ss-web-rate",
    storageBucket: "ss-web-rate.firebasestorage.app",
    messagingSenderId: "620089536789",
    appId: "1:620089536789:web:59a52c173bed01ecccf91c",
    measurementId: "G-E71Y9TK6ZJ"
  };

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export default app;