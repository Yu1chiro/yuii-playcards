const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

// Firebase configuration
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
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// Panggil fungsi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
  checkAuthStatus();
  fetchUserData();
});

// Check authentication status
function checkAuthStatus() {
  fetch('/api/auth/status', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  })
  .then(data => {
    if (!data.isAuthenticated) {
      // Redirect to login page if not authenticated
      window.location.href = '/';
    }
  })
  .catch(error => {
    console.error('Auth status check failed:', error);
    // Redirect to login on error for security
    window.location.href = '/';
  });
}

// Fetch user data from server
function fetchUserData() {
  fetch('/api/user', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to fetch user data: ' + response.statusText);
    return response.json();
  })
  .then(data => {
  console.log('User data response:', data); // Debug log
  if (data.user) {
    updateUserUI(data.user);
    fetchUserStats(data.user.uid); // <-- PANGGIL INI DI SINI
  } else {
    console.error('No user data in response');
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      updateUserUI(user);
      fetchUserStats(user.uid); // <-- PANGGIL DI SINI JUGA
    }
  }
}).catch(error => {
    console.error('Failed to fetch user data:', error);
    // Fallback to localStorage if available
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      updateUserUI(JSON.parse(savedUser));
    }
  });
}

// Update user UI elements
function updateUserUI(user) {
  // Display user info
  const displayName = user.name || user.email.split('@')[0];
  userName.textContent = displayName;
  
  // Set avatar
  if (user.picture) {
    userAvatar.src = user.picture;
    userAvatar.alt = displayName;
    userAvatar.style.display = 'block';
  } else {
    // Use initials as avatar if no picture
    const name = user.name || user.email;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random`;
    userAvatar.alt = initials;
    userAvatar.style.display = 'block';
  }
  
  // Store user data in localStorage for quick access
  localStorage.setItem('user', JSON.stringify(user));
}
let startTime = Date.now();

// Hitung waktu aktif setiap 30 detik
setInterval(() => {
  const now = Date.now();
  const minutes = Math.floor((now - startTime) / 60000);
  document.getElementById('activeTime').textContent = `Active Time: ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}, 30000); // Update setiap 30 detik

// Setelah user data berhasil di-load, panggil fetchStats

function fetchUserStats(uid) {
  fetch(`/api/stats/${uid}`, {
    method: 'GET',
    credentials: 'include'
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    })
    .then(data => {
      document.getElementById('deckCount').textContent = `Decks: ${data.deckCount}`;
      document.getElementById('cardCount').textContent = `Cards: ${data.cardCount}`;
    })
    .catch(err => {
      console.error('Error fetching stats:', err);
      document.getElementById('deckCount').textContent = `Decks: Error`;
      document.getElementById('cardCount').textContent = `Cards: Error`;
    });
}

// Enhanced logout functionality
if (logoutBtn) {
  logoutBtn.addEventListener('click', function () {
    Swal.fire({
      title: 'Are you sure you want to logout?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        // Tampilkan loading state
        const originalText = logoutBtn.textContent;
        logoutBtn.textContent = 'Logging out...';
        logoutBtn.disabled = true;

        // Logout dari Firebase
        auth.signOut().then(() => {
          return fetch('/api/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
        })
        .then(response => {
          if (!response.ok) throw new Error('Logout failed with status: ' + response.status);
          return response.json();
        })
        .then(data => {
          localStorage.removeItem('user');
          window.location.href = '/';
        })
        .catch(error => {
          console.error('Logout error:', error);
          logoutBtn.textContent = originalText;
          logoutBtn.disabled = false;

          Swal.fire({
            title: 'Logout Failed',
            text: 'Please try again.',
            icon: 'error'
          });
        });
      }
      // else: do nothing, user canceled
    });
  });
}

// Helper function to escape HTML
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Export functions for use in other files
window.AuthModule = {
  checkAuthStatus,
  fetchUserData,
  fetchUserStats,
  escapeHTML
};