import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAYofhAW-v8P2xZVAL4Qe6tbch4aWnbRXg",
  authDomain: "working-hours-b60e7.firebaseapp.com",
  projectId: "working-hours-b60e7",
  storageBucket: "working-hours-b60e7.firebasestorage.app",
  messagingSenderId: "768602417994",
  appId: "1:768602417994:web:2700839023e38dfbdf2fb3",
  measurementId: "G-7E8JEMNX2E"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
