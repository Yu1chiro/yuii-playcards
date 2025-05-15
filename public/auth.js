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
googleLoginBtn.addEventListener('click', () => {
  loginStatus.classList.remove('hidden');
  errorMessage.classList.add('hidden');
  
  const provider = new firebase.auth.GoogleAuthProvider();
  
  firebase.auth()
    .signInWithPopup(provider)
    .then((result) => {
      return result.user.getIdToken(true); // Force token refresh
    })
    .then(idToken => {
      return fetch('/api/loginbygoogle', {
        method: 'POST',
        credentials: 'include', // Penting untuk session cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken })
      });
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        // Redirect ke dashboard setelah 1 detik untuk memastikan session tersimpan
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        throw new Error(data.message || 'Login failed');
      }
    })
    .catch((error) => {
      console.error('Login error:', error);
      loginStatus.classList.add('hidden');
      errorMessage.textContent = error.message || 'An error occurred during sign in';
      errorMessage.classList.remove('hidden');
      // Sign out dari Firebase jika login gagal
      firebase.auth().signOut();
    });
});