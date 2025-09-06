
// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "ramukakamarket",
  "appId": "1:607187252038:web:f094e13778efcd901d6b47",
  "storageBucket": "ramukakamarket.firebasestorage.app",
  "apiKey": "AIzaSyCnapu4Y0vw2UKhwsv4-k1BZyqksWy3pUQ",
  "authDomain": "ramukakamarket.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "607187252038"
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
