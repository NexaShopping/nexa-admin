import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Firebase web config for project `nexashopping-a3bdd`. This is public client
// config (it ships in the browser bundle by design) — it is NOT a secret. The
// server verifies the resulting ID token against its private service-account key.
const firebaseConfig = {
  apiKey: "AIzaSyC7kQ3WU2mBhTFaRiI4_hVOYECvag8lqdk",
  authDomain: "nexashopping-a3bdd.firebaseapp.com",
  projectId: "nexashopping-a3bdd",
  storageBucket: "nexashopping-a3bdd.firebasestorage.app",
  messagingSenderId: "535209789556",
  appId: "1:535209789556:web:6b9e64a53ac3b334cda921",
  measurementId: "G-NEVN9GFK6X",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

// Opens the Google sign-in popup and returns the Firebase ID token, which the
// server exchanges for a NexaShopping session.
export async function signInWithGoogle(): Promise<string> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user.getIdToken();
}

export function firebaseSignOut(): Promise<void> {
  return auth.signOut();
}
