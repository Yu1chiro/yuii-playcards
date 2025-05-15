const firebaseConfig = {
  apiKey: "AIzaSyBclOCH_bzXhuXwSUg3pEuX2m7P9e2Loa0",
  authDomain: "authentication-project-ef7ba.firebaseapp.com",
  projectId: "authentication-project-ef7ba",
  storageBucket: "authentication-project-ef7ba.firebasestorage.app",
  messagingSenderId: "392640529719",
  appId: "1:392640529719:web:0c19588d5d5dc3ff2fc6b2",
  measurementId: "G-G20ED6H33E"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// DOM Elements
const googleLoginBtn = document.getElementById('googleLogin');
const loginStatus = document.getElementById('loginStatus');
const errorMessage = document.getElementById('errorMessage');

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/auth/status', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.isAuthenticated) {
      window.location.href = '/dashboard';
    }
  })
  .catch(error => {
    console.error('Auth check error:', error);
  });
});

// Google Sign-in
// Perbaikan Google Sign-in handler
// Update your Google Sign-in handler to this:
googleLoginBtn.addEventListener('click', async () => {
  loginStatus.classList.remove('hidden');
  errorMessage.classList.add('hidden');
  
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);
    const idToken = await result.user.getIdToken(true);
    
    const response = await fetch('/api/loginbygoogle', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken })
    });
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    
    if (data.success) {
      // For popup window
      if (window.opener) {
        window.opener.postMessage({ 
          type: 'LOGIN_SUCCESS', 
          redirectTo: '/dashboard',
          sessionId: data.sessionId
        }, window.location.origin);
        window.close();
      } 
      // For regular window
      else {
        // Force reload to ensure session is recognized
        window.location.href = '/dashboard?t=' + Date.now();
      }
    } else {
      throw new Error(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    loginStatus.classList.add('hidden');
    errorMessage.textContent = error.message || 'An error occurred during sign in';
    errorMessage.classList.remove('hidden');
    await firebase.auth().signOut();
  }
});

// Add this outside the click handler
window.addEventListener('message', (event) => {
  if (event.origin === window.location.origin && 
      event.data.type === 'LOGIN_SUCCESS') {
    // Set a temporary cookie with session ID
    document.cookie = `session_sync=${event.data.sessionId}; path=/; secure; sameSite=none`;
    window.location.href = event.data.redirectTo;
  }
});