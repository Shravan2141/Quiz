// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyA0Fny16pT8RTtrjCXXku88xys1hxSzLDM",
    authDomain: "quiz-bf9e1.firebaseapp.com",
    projectId: "quiz-bf9e1",
    storageBucket: "quiz-bf9e1.firebasestorage.app",
    messagingSenderId: "628778114510",
    appId: "1:628778114510:web:b2ce2d603d6bee4b355f9f",
    measurementId: "G-J4FJS97586"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, db }; 