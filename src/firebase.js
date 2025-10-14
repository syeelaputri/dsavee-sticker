// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDI0Ga3Isun5EYU0IDHNyolKDyHeJKRTjA",
  authDomain: "dsavee-sticker.firebaseapp.com",
  databaseURL: "https://dsavee-sticker-default-rtdb.firebaseio.com",
  projectId: "dsavee-sticker",
  storageBucket: "dsavee-sticker.firebasestorage.app",
  messagingSenderId: "814509065289",
  appId: "1:814509065289:web:4002b627805525934d6b98",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
export default app;
