import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  get,
  push
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCjQeYb1LfTz2P2klF5oeyjR_DB7b1K57E",
  authDomain: "smartspend-ai-6012d.firebaseapp.com",
  databaseURL: "https://smartspend-ai-6012d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartspend-ai-6012d",
  storageBucket: "smartspend-ai-6012d.firebasestorage.app",
  messagingSenderId: "517199572634",
  appId: "1:517199572634:web:a800e98e16651692cbb923"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

export const provider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  ref,
  set,
  get,
  push
};
