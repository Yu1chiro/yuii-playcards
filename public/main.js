// DOM elements
const deckForm = document.getElementById('deckForm');
const decksContainer = document.getElementById('decksContainer');
const flashcardSection = document.getElementById('flashcardSection');
const flashcardsSection = document.getElementById('flashcardsSection');
const flashcardForm = document.getElementById('flashcardForm');
const flashcardsContainer = document.getElementById('flashcardsContainer');
const currentDeckName = document.getElementById('currentDeckName');
const viewingDeckName = document.getElementById('viewingDeckName');
const backToDecks = document.getElementById('backToDecks');
const currentDeckId = document.getElementById('currentDeckId');

// Main app container sections
const mainAppSection = document.getElementById('mainAppSection');
const studyModeSection = document.getElementById('studyModeSection');

// Card swipe and interaction state
let currentCardIndex = 0;
let flashcardsArray = [];
let hammerManager = null;

// Check auth status and fetch user data
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  fetchDecks();
  
  // Load GSAP library dynamically
  loadGSAP();
});

// Load GSAP library
function loadGSAP() {
  const gsapScript = document.createElement('script');
  gsapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.4/gsap.min.js';
  gsapScript.onload = () => {
    console.log('GSAP loaded successfully');
    
    // Load Hammer.js for swipe gestures
    const hammerScript = document.createElement('script');
    hammerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js';
    hammerScript.onload = () => {
      console.log('Hammer.js loaded successfully');
    };
    document.head.appendChild(hammerScript);
  };
  document.head.appendChild(gsapScript);
}

// Create a new deck
deckForm.addEventListener('submit', function(e) {
  e.preventDefault();
  
  const deckName = document.getElementById('deckName').value.trim();
  const deckDescription = document.getElementById('deckDescription').value.trim();
  
  if (!deckName) {
   showToast('info', 'Please input deck name');
    return;
  }
  
  fetch('/api/decks', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({
      name: deckName,
      description: deckDescription
    })
  })
  .then(response => response.json())
  .then(data => {
    // Clear form
    deckForm.reset();
    
    // Refresh decks
    fetchDecks();
    showToast('success', 'Created');
  })
  .catch(error => {
    console.error('Failed to create deck:', error);
    showToast('error', 'Gagal menambahkan flashcard. Coba lagi.');
  });
});

// Fetch decks from the server
function fetchDecks() {
  fetch('/api/decks', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => response.json())
  .then(decks => {
    displayDecks(decks);
  })
  .catch(error => {
    console.error('Failed to fetch decks:', error);
    decksContainer.innerHTML = `
      <div class="bg-white shadow rounded-lg p-4 border-t-4 border-red-500 col-span-full">
        <p class="text-red-500">Failed to load decks. Please try again later.</p>
      </div>
    `;
  });
}

// Display decks in the container
function displayDecks(decks) {
  if (!decks || decks.length === 0) {
    decksContainer.innerHTML = `
      <div class="bg-white shadow rounded-lg p-4 border-t-4 border-yellow-500 col-span-full text-center">
        <p class="text-gray-600">You don't have any decks yet. Create one above!</p>
      </div>
    `;
    return;
  }

  let decksHTML = '';
  
  decks.forEach(deck => {
    decksHTML += `
      <div class="bg-white shadow rounded-lg p-4 border-t-4 border-indigo-500 hover:shadow-md transition-shadow cursor-pointer" data-id="${deck._id}">
        <h3 class="font-medium text-lg text-gray-800 mb-2">${escapeHTML(deck.name)}</h3>
        ${deck.description ? `<p class="text-gray-600 text-sm mb-3">${escapeHTML(deck.description)}</p>` : ''}
        <div class="flex justify-between items-center">
          <div class="flex space-x-2">
            <button class="view-deck-btn px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
              Manage Decks
            </button>
          </div>
          <div>
            <button class="delete-deck-btn text-sm text-red-600 hover:text-red-800">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  });
  
  decksContainer.innerHTML = decksHTML;
  
  // Add event listeners to view deck buttons
  document.querySelectorAll('.view-deck-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const deck = this.closest('[data-id]');
      const deckId = deck.dataset.id;
      const deckName = deck.querySelector('h3').textContent;
      viewDeck(deckId, deckName);
    });
  });
  
  // Add event listeners to study deck buttons
  document.querySelectorAll('.study-deck-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const deck = this.closest('[data-id]');
      const deckId = deck.dataset.id;
      const deckName = deck.querySelector('h3').textContent;
      startStudyMode(deckId, deckName); // New function to enter study mode
    });
  });
  
  // Add event listeners to delete deck buttons
  document.querySelectorAll('.delete-deck-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const deck = this.closest('[data-id]');
      const deckId = deck.dataset.id;
      
      Swal.fire({
  title: 'Yakin ingin menghapus?',
  text: 'Deck dan semua flashcard di dalamnya akan dihapus secara permanen.',
  icon: 'warning',
  showCancelButton: true,
  confirmButtonColor: '#d33',
  cancelButtonColor: '#3085d6',
  confirmButtonText: 'Ya, hapus!',
  cancelButtonText: 'Batal'
}).then((result) => {
  if (result.isConfirmed) {
    deleteDeck(deckId);
    Swal.fire({
      icon: 'success',
      title: 'Deck berhasil dihapus',
      showConfirmButton: false,
      timer: 1500,
      toast: true,
      position: 'top-end'
    });
  }
});

    });
  });
  
  // Click on deck card to manage flashcards
  document.querySelectorAll('[data-id]').forEach(deck => {
    deck.addEventListener('click', function() {
      const deckId = this.dataset.id;
      const deckName = this.querySelector('h3').textContent;
      viewDeck(deckId, deckName);
    });
  });
}

// View deck flashcards (for management)
function viewDeck(deckId, deckName) {
  // Hide decks and show flashcards section
  document.querySelector('#decksContainer').closest('div').classList.add('hidden');
  document.querySelector('#deckForm').closest('div').classList.add('hidden');
  flashcardsSection.classList.remove('hidden');
  
  // Set current deck info
  viewingDeckName.textContent = deckName;
  currentDeckId.value = deckId;
  
  // Always show the add flashcard form inside the flashcards view
  showInlineFlashcardForm();
  
  // Fetch and display flashcards for this deck in management view
  fetchFlashcardsForManagement(deckId);
}

// New function: Fetch flashcards for the management view
function fetchFlashcardsForManagement(deckId) {
  fetch(`/api/decks/${deckId}/flashcards`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => response.json())
  .then(flashcards => {
    displayFlashcardsForManagement(flashcards);
  })
  .catch(error => {
    console.error('Failed to fetch flashcards:', error);
    flashcardsContainer.innerHTML = `
      <div class="bg-white shadow rounded-lg p-4 border-t-4 border-red-500 col-span-full">
        <p class="text-red-500">Failed to load flashcards. Please try again later.</p>
      </div>
    `;
  });
}

// New function: Display flashcards in management view
function displayFlashcardsForManagement(flashcards) {
  if (!flashcards || flashcards.length === 0) {
    flashcardsContainer.innerHTML = `
      <div class="bg-white shadow rounded-lg p-4 border-t-4 border-yellow-500 col-span-full text-center">
        <p class="text-gray-600">Add your first flashcard using the form above!</p>
        <div class="mt-4 flex justify-center">
          <button id="startStudyEmptyBtn" class="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed" disabled>
            Study Cards (No cards yet)
          </button>
        </div>
      </div>
    `;
    return;
  }

  let html = '<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">';
    html += `</div>
    <div class="mt-6 flex justify-center mb-5">
      <button id="startStudyBtn" class="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-md flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
        </svg>
        Start Study Mode
      </button>
    </div>
  `;
  flashcards.forEach((card, index) => {
    html += `
      <div class="bg-white shadow rounded-lg p-4 hover:shadow-md" data-id="${card._id}">
        <div class="h-32 overflow-auto p-2 border border-gray-200 rounded-md mb-2">
          <p class="font-medium text-gray-700">Front:</p>
          <p class="text-gray-800">${escapeHTML(card.front)}</p>
        </div>
        <div class="h-32 overflow-auto p-2 border border-gray-200 rounded-md mb-4">
          <p class="font-medium text-gray-700">Back:</p>
          <p class="text-gray-800">${escapeHTML(card.back)}</p>
        </div>
        <div class="flex justify-end space-x-2">
          <button class="edit-card-btn px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Edit</button>
          <button class="delete-card-btn px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200">Delete</button>
        </div>
      </div>
    `;
  });
  

  
  flashcardsContainer.innerHTML = html;
  
  // Add event listener to the study button
  document.getElementById('startStudyBtn')?.addEventListener('click', () => {
    startStudyMode(currentDeckId.value, viewingDeckName.textContent);
  });
  
  // Set up edit and delete event handlers
  document.querySelectorAll('.edit-card-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const card = this.closest('[data-id]');
      const cardId = card.dataset.id;
      
      // Find the card in flashcards array
      const cardData = flashcards.find(c => c._id === cardId);
      if (cardData) {
        editFlashcard(cardId, cardData.front, cardData.back);
      }
    });
  });
  
  document.querySelectorAll('.delete-card-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const card = this.closest('[data-id]');
      const cardId = card.dataset.id;
      
      Swal.fire({
  title: 'Yakin ingin menghapus card ini?',
  icon: 'warning',
  showCancelButton: true,
  confirmButtonColor: '#d33',
  cancelButtonColor: '#3085d6',
  confirmButtonText: 'Ya, hapus!',
  cancelButtonText: 'Batal'
}).then((result) => {
  if (result.isConfirmed) {
      deleteFlashcard(cardId);
    Swal.fire({
      icon: 'success',
      title: 'Deck berhasil dihapus',
      showConfirmButton: false,
      timer: 1500,
      toast: true,
      position: 'top-end'
    });
  }
});

    });
  });
}

// Show inline flashcard form in the flashcards view
function showInlineFlashcardForm() {
  // Create form if it doesn't exist
  if (!document.getElementById('inlineFlashcardForm')) {
    const formHTML = `
      <div id="inlineFlashcardForm" class="bg-white shadow rounded-lg p-6 mb-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Create New Flashcard</h3>
        <form id="inlineForm">
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label for="inlineFront" class="block text-sm font-medium text-gray-700">Front</label>
              <textarea id="inlineFront" name="front" required 
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" rows="4"></textarea>
            </div>
            <div>
              <label for="inlineBack" class="block text-sm font-medium text-gray-700">Back</label>
              <textarea id="inlineBack" name="back" required 
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" rows="4"></textarea>
            </div>
          </div>
          <div class="mt-4">
            <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Create Flashcard
            </button>
          </div>
        </form>
      </div>
    `;
    
    // Insert form at the beginning of flashcardsSection
    const insertPoint = document.querySelector('#flashcardsSection .flex.justify-between');
    insertPoint.insertAdjacentHTML('afterend', formHTML);
    
    // Add event listener to the inline form
    document.getElementById('inlineForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const frontValue = document.getElementById('inlineFront').value.trim();
      const backValue = document.getElementById('inlineBack').value.trim();
      const deckId = currentDeckId.value;
      
      if (!frontValue || !backValue) {
        alert('Please fill in both sides of the flashcard');
        return;
      }
      
      createFlashcard(frontValue, backValue, deckId);
    });
  }
}

// NEW FUNCTION: Start Study Mode
function startStudyMode(deckId, deckName) {
  // Save current deck info
  currentDeckId.value = deckId;
  
  // Create study mode section if it doesn't exist
  if (!document.getElementById('studyModeSection')) {
    const studyModeSectionHTML = `
      <div id="studyModeSection" class="fixed inset-0 bg-gray-100 z-50 flex flex-col hidden">
        <div class="bg-indigo-600 text-white py-4 px-6 flex justify-between items-center shadow-md">
          <div class="flex items-center">
            <button id="exitStudyMode" class="mr-4 focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h2 class="text-xl font-medium" id="studyModeDeckName"></h2>
          </div>
          <div class="text-sm" id="studyModeProgress">Card 0 of 0</div>
        </div>
        
        <div class="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
          <div class="max-w-lg w-full">
            <div id="studyModeContainer" class="relative w-full" style="height: 60vh;"></div>
            
            <div class="mt-6 flex justify-center space-x-4">
              <button id="prevStudyCardBtn" class="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 shadow flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Previous
              </button>
              <button id="flipStudyCardBtn" class="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                </svg>
                Flip Card
              </button>
              <button id="nextStudyCardBtn" class="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 shadow flex items-center">
                Next
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div class="mt-4 text-center text-gray-500 text-sm">
              <p>Swipe left/right to navigate cards or tap to flip</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', studyModeSectionHTML);
    
    // Add exit study mode handler
    document.getElementById('exitStudyMode').addEventListener('click', () => {
      document.getElementById('studyModeSection').classList.add('hidden');
      
      // Clean up Hammer.js instances
      if (hammerManager) {
        hammerManager.destroy();
        hammerManager = null;
      }
    });
  }
  
  // Set study mode deck name
  document.getElementById('studyModeDeckName').textContent = deckName;
  
  // Reset card index
  currentCardIndex = 0;
  
  // Show study mode section
  document.getElementById('studyModeSection').classList.remove('hidden');
  
  // Fetch flashcards for study mode
  fetchFlashcardsForStudy(deckId);
}

// Fetch flashcards for study mode
function fetchFlashcardsForStudy(deckId) {
  fetch(`/api/decks/${deckId}/flashcards`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => response.json())
  .then(flashcards => {
    flashcardsArray = flashcards;
    displayFlashcardsForStudy(flashcards);
    setupStudyModeControls();
  })
  .catch(error => {
    console.error('Failed to fetch flashcards for study:', error);
    document.getElementById('studyModeContainer').innerHTML = `
      <div class="bg-white shadow rounded-lg p-4 border-t-4 border-red-500">
        <p class="text-red-500">Failed to load flashcards. Please try again later.</p>
      </div>
    `;
  });
}

// Display flashcards in study mode
function displayFlashcardsForStudy(flashcards) {
  const studyModeContainer = document.getElementById('studyModeContainer');
  
  if (!flashcards || flashcards.length === 0) {
    studyModeContainer.innerHTML = `
      <div class="bg-white shadow rounded-lg p-4 border-t-4 border-yellow-500 text-center h-full flex items-center justify-center">
        <div>
          <p class="text-gray-600">No flashcards found in this deck.</p>
          <button id="exitEmptyStudyBtn" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Return to Decks
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('exitEmptyStudyBtn')?.addEventListener('click', () => {
      document.getElementById('studyModeSection').classList.add('hidden');
    });
    
    return;
  }

  // Update progress indicator
  document.getElementById('studyModeProgress').textContent = `Card 1 of ${flashcards.length}`;
  
  // Create card deck viewer
  let html = `<div class="flashcard-study-deck relative h-full w-full">`;
  
  flashcards.forEach((card, index) => {
    const isActive = index === 0;
    html += `
      <div class="flashcard-study-card absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-lg ${isActive ? 'active' : ''}" 
           data-index="${index}" data-id="${card._id}" style="${isActive ? '' : 'display: none;'}">
        <div class="flashcard-study-inner relative w-full h-full transition-transform duration-700 transform-style-preserve-3d">
          <div class="flashcard-study-front absolute w-full h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 flex items-center justify-center backface-hidden overflow-auto">
            <div class="text-center text-white text-5xl font-bold">${escapeHTML(card.front)}</div>
          </div>
          <div class="flashcard-study-back absolute w-full h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 flex items-center justify-center backface-hidden overflow-auto transform rotate-y-180">
            <div class="text-center text-white text-3xl font-bold">${escapeHTML(card.back)}</div>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  
  studyModeContainer.innerHTML = html;
  
  // Add CSS for study mode cards
  if (!document.getElementById('study-mode-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'study-mode-styles';
    styleElement.textContent = `
      .transform-style-preserve-3d {
        transform-style: preserve-3d;
      }
      .backface-hidden {
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }
      .rotate-y-180 {
        transform: rotateY(180deg);
      }
      .flashcard-study-card {
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      .flashcard-study-inner {
        transition: transform 0.3s;
      }
      .flashcard-study-card.flipped .flashcard-study-inner {
        transform: rotateY(180deg);
      }
    `;
    document.head.appendChild(styleElement);
  }
}

// Setup study mode controls
function setupStudyModeControls() {
  if (flashcardsArray.length === 0) return;
  
  const flipStudyCardBtn = document.getElementById('flipStudyCardBtn');
  const nextStudyCardBtn = document.getElementById('nextStudyCardBtn');
  const prevStudyCardBtn = document.getElementById('prevStudyCardBtn');
  
  // Update handlers
  flipStudyCardBtn?.addEventListener('click', () => {
    const currentCard = document.querySelector('.flashcard-study-card.active');
    flipStudyCard(currentCard);
  });
  
  nextStudyCardBtn?.addEventListener('click', () => {
    navigateStudyCards(1);
  });
  
  prevStudyCardBtn?.addEventListener('click', () => {
    navigateStudyCards(-1);
  });
  
  // Set up touch swipe using Hammer.js if available
  if (window.Hammer && flashcardsArray.length > 0) {
    const container = document.querySelector('.flashcard-study-deck');
    
    if (container) {
      // Clean up previous instance
      if (hammerManager) {
        hammerManager.destroy();
      }
      
      hammerManager = new Hammer.Manager(container);
      
      // Add swipe recognizer
      const swipe = new Hammer.Swipe({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 10, velocity: 0.3 });
      hammerManager.add(swipe);
      
      // Tap recognizer for flipping
      const tap = new Hammer.Tap();
      hammerManager.add(tap);
      
      // Handle swipe events
      hammerManager.on('swipeleft', () => {
        navigateStudyCards(1);
      });
      
      hammerManager.on('swiperight', () => {
        navigateStudyCards(-1);
      });
      
      // Handle tap for flip
      hammerManager.on('tap', () => {
        const currentCard = document.querySelector('.flashcard-study-card.active');
        flipStudyCard(currentCard);
      });
    }
  }
}

// Flip study card
function flipStudyCard(card) {
  if (!card) return;
  
  card.classList.toggle('flipped');
  
  // Use GSAP if available for smoother animation
  if (window.gsap) {
    const inner = card.querySelector('.flashcard-study-inner');
    
    gsap.to(inner, {
      rotationY: card.classList.contains('flipped') ? 180 : 0,
      duration: 0.3,
      ease: "power1.inOut"
    });
  }
}

// Navigate study cards
function navigateStudyCards(direction) {
  if (flashcardsArray.length <= 1) return;
  
  const currentCard = document.querySelector('.flashcard-study-card.active');
  if (!currentCard) return;
  
  // Get current index
  let index = parseInt(currentCard.dataset.index);
  
  // Calculate next index with wrapping
  let nextIndex = index + direction;
  if (nextIndex < 0) nextIndex = flashcardsArray.length - 1;
  if (nextIndex >= flashcardsArray.length) nextIndex = 0;
  
  // Update current card index
  currentCardIndex = nextIndex;
  
  // Update progress indicator
  document.getElementById('studyModeProgress').textContent = 
    `Card ${currentCardIndex + 1} of ${flashcardsArray.length}`;
  
  // Get next card
  const nextCard = document.querySelector(`.flashcard-study-card[data-index="${nextIndex}"]`);
  if (!nextCard) return;

  // Use GSAP for smooth transition if available
  if (window.gsap) {
    // Animate current card out
    gsap.to(currentCard, {
      x: direction > 0 ? -100 : 100,
      opacity: 0,
      duration: 0.3,
      ease: "power1.out",
      onComplete: () => {
        currentCard.classList.remove('active');
        currentCard.style.display = 'none';
        currentCard.style.transform = '';
        currentCard.style.opacity = '';
        
        // Reset flipped state if it was flipped
        if (currentCard.classList.contains('flipped')) {
          currentCard.classList.remove('flipped');
          const inner = currentCard.querySelector('.flashcard-study-inner');
          if (inner) inner.style.transform = '';
        }
        
        // Animate next card in
        nextCard.style.display = 'block';
        nextCard.style.opacity = 0;
        nextCard.style.x = direction > 0 ? 100 : -100;
        
        gsap.to(nextCard, {
          x: 0,
          opacity: 1,
          duration: 0.3,
          ease: "power1.in",
          onComplete: () => {
            nextCard.classList.add('active');
          }
        });
      }
    });
  } else {
    // Fallback animation
    currentCard.classList.remove('active');
    currentCard.style.display = 'none';
    
    nextCard.style.display = 'block';
    nextCard.classList.add('active');
  }
}

// Create a new flashcard
function createFlashcard(front, back, deckId) {
  fetch('/api/flashcards', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({
      front,
      back,
      deckId
    })
  })
  .then(response => response.json())
  .then(data => {
    // Clear form
    document.getElementById('inlineFront').value = '';
    document.getElementById('inlineBack').value = '';
    
    // Refresh flashcards
    fetchFlashcardsForManagement(deckId);
    showToast('success', 'Flashcard berhasil ditambahkan!');
  })
  .catch(error => {
    console.error('Failed to create flashcard:', error);
   showToast('error', 'Gagal menambahkan refresh browser');
  });
}

// Edit flashcard
function editFlashcard(cardId, currentFront, currentBack) {
  // Create edit form modal
  const modalHTML = `
    <div id="editFlashcardModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Edit Flashcard</h3>
          <button id="closeEditModal" class="text-gray-400 hover:text-gray-500">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form id="editFlashcardForm">
          <div class="space-y-4">
            <div>
              <label for="editFront" class="block text-sm font-medium text-gray-700">Front</label>
              <textarea id="editFront" name="front" required rows="4" 
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">${escapeHTML(currentFront)}</textarea>
            </div>
            <div>
              <label for="editBack" class="block text-sm font-medium text-gray-700">Back</label>
              <textarea id="editBack" name="back" required rows="4" 
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">${escapeHTML(currentBack)}</textarea>
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-3">
            <button type="button" id="cancelEditFlashcard" class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Cancel
            </button>
            <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add event listeners
  document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
  document.getElementById('cancelEditFlashcard').addEventListener('click', closeEditModal);
  
  document.getElementById('editFlashcardForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const newFront = document.getElementById('editFront').value.trim();
    const newBack = document.getElementById('editBack').value.trim();
    
    if (!newFront || !newBack) {
        showToast('error', 'Please fill in both sides of the flashcard');
      return;
    }
    
    updateFlashcard(cardId, newFront, newBack);
     showToast('success', 'Updated successfully');
  });
}

// Close edit modal
function closeEditModal() {
  document.getElementById('editFlashcardModal')?.remove();
}
function showToast(type, message) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: type,
    title: message,
    showConfirmButton: false,
    timer: 1000,
    timerProgressBar: true
  });
}

// Update flashcard
function updateFlashcard(cardId, front, back) {
  fetch(`/api/flashcards/${cardId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({
      front,
      back
    })
  })
  .then(response => response.json())
  .then(data => {
    closeEditModal();
    fetchFlashcardsForManagement(currentDeckId.value);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Flashcard updated successfully',
      showConfirmButton: false,
      timer: 1500
    });
  })
  .catch(error => {
    console.error('Failed to update flashcard:', error);
    Swal.fire({
      icon: 'error',
      title: 'Update failed',
      text: 'Failed to update flashcard. Please try again.',
    });
  });
}

// Delete flashcard
// Delete flashcard
function deleteFlashcard(cardId) {
  fetch(`/api/flashcards/${cardId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => {
    if (response.ok) {
      fetchFlashcardsForManagement(currentDeckId.value);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Flashcard deleted',
        showConfirmButton: false,
        timer: 1500
      });
    } else {
      throw new Error('Failed to delete flashcard');
    }
  })
  .catch(error => {
    console.error('Failed to delete flashcard:', error);
    Swal.fire({
      icon: 'error',
      title: 'Delete failed',
      text: 'Failed to delete flashcard. Please try again.',
    });
  });
}
// Delete deck
function deleteDeck(deckId) {
  fetch(`/api/decks/${deckId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => {
    if (response.ok) {
      fetchDecks();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      throw new Error('Failed to delete deck');
    }
  })
  .catch(error => {
    console.error('Failed to delete deck:', error);
    Swal.fire({
      icon: 'error',
      title: 'Delete failed',
      text: 'Failed to delete deck. Please try again.',
    });
  });
}


// Back to decks view
backToDecks.addEventListener('click', function() {
  flashcardsSection.classList.add('hidden');
  document.querySelector('#decksContainer').closest('div').classList.remove('hidden');
  document.querySelector('#deckForm').closest('div').classList.remove('hidden');
  
  // Remove the inline flashcard form if it exists
  document.getElementById('inlineFlashcardForm')?.remove();
});

// Utility function to escape HTML
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag]));
}

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
  .then(response => response.json())
  .then(data => {
    if (!data.authenticated) {
      window.location.href = '/login';
    }
  })
  .catch(error => {
    console.error('Failed to check auth status:', error);
    window.location.href = '/login';
  });
}