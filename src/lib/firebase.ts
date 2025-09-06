
// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8k4negis5JJLaH-8Co76-xVF8zvDiYSU",
  authDomain: "ramukakamarket.firebaseapp.com",
  projectId: "ramukakamarket",
  storageBucket: "ramukakamarket.firebasestorage.app",
  messagingSenderId: "607187252038",
  appId: "1:607187252038:web:f094e13778efcd901d6b47"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);
