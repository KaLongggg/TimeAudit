// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
// To enable cross-device sync:
// 1. Go to console.firebase.google.com
// 2. Create a new project & Create a Firestore Database (Test Mode)
// 3. Register a Web App and copy the config below
// ==========================================

export const firebaseConfig = {
  apiKey: "", 
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "" && firebaseConfig.projectId !== "";
};