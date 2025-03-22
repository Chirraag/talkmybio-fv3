import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC2OdsRqao8sFfE9trQ0MYQe21BDNH1qJI",
  authDomain: "estomes-32558.firebaseapp.com",
  projectId: "estomes-32558",
  storageBucket: "estomes-32558.firebasestorage.app",
  messagingSenderId: "271128729695",
  appId: "1:271128729695:web:8efb6a0e16f852fa87e3ea",
  measurementId: "G-44JBXRZH10"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Firestore with persistence
(async () => {
  try {
    await enableIndexedDbPersistence(db, {
      synchronizeTabs: true
    });
    console.log('Firestore persistence enabled');
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence disabled');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser does not support persistence');
    } else {
      console.error('Error enabling persistence:', err);
    }
  }
})();