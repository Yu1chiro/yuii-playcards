document.addEventListener('DOMContentLoaded', () => {
  // Share Deck Elements
  const shareDecksBtn = document.getElementById('share-decks');
  const shareDecksModal = document.getElementById('shareDecksModal');
  const closeShareModal = document.getElementById('closeShareModal');
  const selectDeck = document.getElementById('selectDeck');
  const deckIdToCopy = document.getElementById('deckIdToCopy');
  const copyDeckIdBtn = document.getElementById('copyDeckId');

  // Import Deck Elements
  const importDecksBtn = document.getElementById('import-decks'); // Anda perlu menambahkan tombol ini di nav
  const importDeckModal = document.getElementById('importDeckModal');
  const closeImportModal = document.getElementById('closeImportModal');
  const deckIdToImport = document.getElementById('deckIdToImport');
  const importDeckBtn = document.getElementById('importDeckBtn');

  // Open Share modal
  shareDecksBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await loadDecksForSharing();
    shareDecksModal.classList.remove('hidden');
  });

  // Close Share modal
  closeShareModal.addEventListener('click', () => {
    shareDecksModal.classList.add('hidden');
  });

  // Open Import modal
  importDecksBtn.addEventListener('click', (e) => {
    e.preventDefault();
    importDeckModal.classList.remove('hidden');
  });

  // Close Import modal
  closeImportModal.addEventListener('click', () => {
    importDeckModal.classList.add('hidden');
  });

  // Load decks for sharing
  async function loadDecksForSharing() {
    try {
      const response = await fetch('/api/decks', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load decks');
      
      const decks = await response.json();
      
      // Clear existing options
      selectDeck.innerHTML = '<option value="">-- Select a Deck --</option>';
      
      // Add deck options
      decks.forEach(deck => {
        const option = document.createElement('option');
        option.value = deck._id;
        option.textContent = deck.name;
        selectDeck.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading decks:', error);
      showToast('error', 'Failed to load decks');
    }
  }

  // Update deck ID to copy when selection changes
  selectDeck.addEventListener('change', () => {
    deckIdToCopy.value = selectDeck.value;
  });

  // Copy Deck ID
  copyDeckIdBtn.addEventListener('click', () => {
    const deckId = deckIdToCopy.value;
    if (!deckId) {
      showToast('warning', 'Please select a deck first');
      return;
    }
    
    navigator.clipboard.writeText(deckId)
      .then(() => {
        showToast('success', 'Deck ID copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        showToast('error', 'Failed to copy Deck ID');
      });
  });
// Add this function to your shared.js file
async function loadUserDecks() {
  try {
    const response = await fetch('/api/decks', {
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to load decks');
    
    const decks = await response.json();
    const decksContainer = document.getElementById('decksContainer');
    
    // Clear existing decks
    decksContainer.innerHTML = '';
    
    // Add decks to the container
    decks.forEach(deck => {
      const deckElement = document.createElement('div');
      deckElement.className = 'bg-white shadow rounded-lg p-4 border-t-4 border-indigo-500';
      deckElement.innerHTML = `
        <h3 class="font-medium text-gray-900">${deck.name}</h3>
        ${deck.description ? `<p class="text-sm text-gray-500 mt-1">${deck.description}</p>` : ''}
        <div class="mt-3 flex space-x-2">
          <button data-deck-id="${deck._id}" class="view-deck-btn text-sm text-indigo-600 hover:text-indigo-800">
            View Flashcards
          </button>
        </div>
      `;
      decksContainer.appendChild(deckElement);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-deck-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const deckId = e.target.getAttribute('data-deck-id');
        viewDeck(deckId);
      });
    });
    
  } catch (error) {
    console.error('Error loading decks:', error);
    showToast('error', 'Failed to load decks');
  }
}
  // Import Deck
 // Import Deck - Perbaikan untuk hindari duplikasi
importDeckBtn.addEventListener('click', async () => {
  const deckId = deckIdToImport.value.trim();
  
  if (!deckId) {
    showToast('warning', 'Please enter a Deck ID');
    return;
  }
  
  try {
    // Disable button selama proses
    importDeckBtn.disabled = true;
    importDeckBtn.textContent = 'Importing...';
    
    // Check if deck exists
    const checkResponse = await fetch(`/api/decks/${deckId}/check`, {
      credentials: 'include'
    });
    
    if (!checkResponse.ok) {
      throw new Error('Deck not found or not shareable');
    }
    
    // Import the deck
    const importResponse = await fetch('/api/decks/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ deckId })
    });
    
    if (!importResponse.ok) {
      throw new Error('Failed to import deck');
    }
    
    const result = await importResponse.json();
    showToast('success', 'Check deck in your daashboard!');

    // Close modal and reset
    importDeckModal.classList.add('hidden');
    deckIdToImport.value = '';
    
    // Refresh decks list hanya sekali
    await loadUserDecks();
       setTimeout(() => {
      window.location.reload();
    }, 1000);

  } catch (error) {
    console.error('Error importing deck:', error);
    showToast('error', error.message || 'Failed to import deck');
  } finally {
    // Reset button state
    importDeckBtn.disabled = false;
    importDeckBtn.textContent = 'Import Deck';
  }
});

  // Helper function for toast notifications
  function showToast(icon, message) {
    Swal.fire({
      icon: icon,
      title: message,
      timer: 1000,
      showConfirmButton: false
    });
  }
});