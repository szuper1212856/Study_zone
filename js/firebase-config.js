// ============================================================
//  PASTE YOUR FIREBASE CONFIG HERE
//  Go to: Firebase Console → Your Project → Project Settings
//  → Scroll down to "Your apps" → Copy the config object
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCEiATl24JGNIQiFXTgRvdTN_2B0VoJGxo",
  authDomain: "studyzone-c2bd9.firebaseapp.com",
  projectId: "studyzone-c2bd9",
  storageBucket: "studyzone-c2bd9.firebasestorage.app",
  messagingSenderId: "271027032594",
  appId: "1:271027032594:web:af66872989f34d2755becb"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
