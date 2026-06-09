import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD5A6uEfC5kKdQZwuasff2jX-zfeRFKw6g",
  authDomain: "familytree-pcv.firebaseapp.com",
  projectId: "familytree-pcv",
  storageBucket: "familytree-pcv.firebasestorage.app",
  messagingSenderId: "1010061712899",
  appId: "1:1010061712899:web:ae7ca526de5b8010c5f836",
  measurementId: "G-95TX4QBLT7",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };
