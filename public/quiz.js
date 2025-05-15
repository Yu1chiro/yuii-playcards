        // Global variables
        let allFlashcards = [];
        let currentQuestionIndex = 0;
        let score = 0;
        let quizInProgress = false;
        let selectedDecks = []; // Array to store selected deck IDs
        let allDecks = [];
        let quizScope = 'all'; // 'all' or 'selected'

        // DOM elements
        const startQuizBtn = document.getElementById('start-quiz-btn');
        const filterBtn = document.getElementById('filter-btn');
        const filterModal = document.getElementById('filter-modal');
        const allDecksRadio = document.getElementById('all-decks');
        const selectedDecksRadio = document.getElementById('selected-decks');
        const deckSelectionContainer = document.getElementById('deck-selection-container');
        const deckList = document.getElementById('deck-list');
        const cancelFilterBtn = document.getElementById('cancel-filter-btn');
        const applyFilterBtn = document.getElementById('apply-filter-btn');
        const quizContainer = document.getElementById('quiz-container');
        const questionElement = document.getElementById('question');
        const optionsElement = document.getElementById('options');
        const resultContainer = document.getElementById('result-container');
        const resultMessage = document.getElementById('result-message');
        const nextButton = document.getElementById('next-btn');
        const scoreContainer = document.getElementById('score-container');
        const finalScoreElement = document.getElementById('final-score');
        const restartButton = document.getElementById('restart-btn');
        const newQuizButton = document.getElementById('new-quiz-btn');
        const progressElement = document.getElementById('progress');
        const progressBar = document.getElementById('progress-bar');
        const deckInfoElement = document.getElementById('deck-info');
        const loadingContainer = document.getElementById('loading-container');
        const errorContainer = document.getElementById('error-container');
        const errorMessage = document.getElementById('error-message');
        const retryBtn = document.getElementById('retry-btn');

    async function initApp() {
            try {
                showLoading();
                await fetchAllDecksAndFlashcards();
                hideLoading();
                
                // By default, select all decks
                selectedDecks = allDecks.map(deck => deck._id);
                updateDeckInfoText();
            } catch (error) {
                showError('Failed to load flashcards. Please try again.');
                console.error('Initialization error:', error);
            }
        }

        // Fetch all decks and flashcards
        async function fetchAllDecksAndFlashcards() {
            try {
                const [decksResponse, flashcardsResponse] = await Promise.all([
                    fetch('/api/decks'),
                    fetch('/api/flashcards') // You might need to create this endpoint
                ]);

                if (!decksResponse.ok || !flashcardsResponse.ok) {
                    throw new Error('Failed to fetch data');
                }

                allDecks = await decksResponse.json();
                allFlashcards = await flashcardsResponse.json();

                // Populate deck filter modal
                populateDeckFilter();
            } catch (error) {
                throw error;
            }
        }

        // Populate deck filter modal
        function populateDeckFilter() {
            deckList.innerHTML = '';
            
            allDecks.forEach(deck => {
                const deckItem = document.createElement('div');
                deckItem.className = 'flex items-center';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `deck-${deck._id}`;
                checkbox.className = 'mr-2';
                checkbox.checked = selectedDecks.includes(deck._id);
                checkbox.value = deck._id;
                
                const label = document.createElement('label');
                label.htmlFor = `deck-${deck._id}`;
                label.textContent = deck.name;
                label.className = 'text-gray-700';
                
                deckItem.appendChild(checkbox);
                deckItem.appendChild(label);
                deckList.appendChild(deckItem);
            });
        }

        // Start the quiz
       // Start the quiz
        function startQuiz() {
            // Filter flashcards based on quiz scope
            let filteredFlashcards;
            
            if (quizScope === 'all') {
                // Use all flashcards
                filteredFlashcards = [...allFlashcards];
            } else {
                // Use only selected decks
                filteredFlashcards = allFlashcards.filter(card => 
                    selectedDecks.includes(card.deckId)
                );
            }

            if (filteredFlashcards.length < 4) {
                showError('You need at least 4 flashcards to start a quiz');
                return;
            }

            // Reset quiz state
            currentQuestionIndex = 0;
            score = 0;
            quizInProgress = true;
            usedFlashcards = [];
            
            // Create a pool of flashcards for this quiz session
            quizFlashcards = [...filteredFlashcards];
            
            // Shuffle the flashcards for the quiz
            quizFlashcards = shuffleArray(quizFlashcards);
            
            quizContainer.classList.remove('hidden');
            scoreContainer.classList.add('hidden');
            startQuizBtn.classList.add('hidden');
            filterBtn.classList.add('hidden');
            
            showQuestion();
        }

        // Show current question
        function showQuestion() {
            if (currentQuestionIndex >= quizFlashcards.length) {
                endQuiz();
                return;
            }

            const currentFlashcard = quizFlashcards[currentQuestionIndex];
            questionElement.textContent = currentFlashcard.front;

            // Generate options (1 correct + 3 random incorrect)
            const options = generateOptions(currentFlashcard);

            // Clear previous options
            optionsElement.innerHTML = '';

            // Add new options (shuffled)
            shuffleArray(options).forEach(option => {
                const button = document.createElement('button');
                button.className = 'w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition';
                button.textContent = option.text;
                button.dataset.correct = option.isCorrect;
                button.addEventListener('click', selectAnswer);
                optionsElement.appendChild(button);
            });

            // Update progress
            progressElement.textContent = `${currentQuestionIndex + 1}/${quizFlashcards.length}`;
            progressBar.style.width = `${((currentQuestionIndex + 1) / quizFlashcards.length) * 100}%`;

            // Hide result container
            resultContainer.classList.add('hidden');
        }

        // Generate answer options with better randomization
        function generateOptions(correctFlashcard) {
            const options = [
                { text: correctFlashcard.back, isCorrect: true }
            ];

            // Get other flashcards that could be used as incorrect answers
            let otherFlashcards = quizFlashcards.filter(f => 
                f._id !== correctFlashcard._id && 
                f.back !== correctFlashcard.back // Ensure no duplicate answers
            );

            // If we don't have enough unique answers, use all flashcards
            if (otherFlashcards.length < 3) {
                otherFlashcards = quizFlashcards.filter(f => f._id !== correctFlashcard._id);
            }

            // Get 3 random incorrect answers
            const shuffled = shuffleArray([...otherFlashcards]);
            const incorrectOptions = shuffled.slice(0, 3).map(f => ({
                text: f.back,
                isCorrect: false
            }));

            options.push(...incorrectOptions);
            
            return options;
        }

        // Improved shuffle function using Fisher-Yates algorithm
        function shuffleArray(array) {
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        }


        // Handle answer selection
        function selectAnswer(e) {
            if (!quizInProgress) return;

            const selectedButton = e.target;
            const isCorrect = selectedButton.dataset.correct === 'true';

            // Disable all buttons
            Array.from(optionsElement.children).forEach(button => {
                button.disabled = true;
                if (button.dataset.correct === 'true') {
                    button.classList.add('correct');
                } else {
                    button.classList.add('incorrect');
                }
                button.classList.remove('hover:bg-gray-50');
            });

            // Add shake animation if incorrect
            if (!isCorrect) {
                selectedButton.classList.add('shake');
            }

            // Show result
            if (isCorrect) {
                resultMessage.textContent = 'Correct! 🎉';
                resultMessage.className = 'text-lg font-semibold mb-4 text-green-600';
                score++;
            } else {
                resultMessage.textContent = 'Incorrect 😢';
                resultMessage.className = 'text-lg font-semibold mb-4 text-red-600';
            }

            resultContainer.classList.remove('hidden');
        }

        // Move to next question
        function nextQuestion() {
            currentQuestionIndex++;
            showQuestion();
        }

        // End the quiz
        function endQuiz() {
            quizInProgress = false;
            questionElement.textContent = 'Quiz completed!';
            optionsElement.innerHTML = '';
            resultContainer.classList.add('hidden');
            
            finalScoreElement.textContent = `Your score: ${score}/${allFlashcards.length}`;
            scoreContainer.classList.remove('hidden');
        }

        // Update deck info text
        function updateDeckInfoText() {
            if (quizScope === 'all') {
                deckInfoElement.textContent = 'All Decks (Global Quiz)';
            } else if (selectedDecks.length === 1) {
                const deck = allDecks.find(d => d._id === selectedDecks[0]);
                deckInfoElement.textContent = `Deck: ${deck.name}`;
            } else {
                deckInfoElement.textContent = `${selectedDecks.length} Selected Decks`;
            }
        }

        // Show loading state
        function showLoading() {
            loadingContainer.classList.remove('hidden');
            quizContainer.classList.add('hidden');
            errorContainer.classList.add('hidden');
        }

        // Hide loading state
        function hideLoading() {
            loadingContainer.classList.add('hidden');
        }

        // Show error message
        function showError(message) {
            errorMessage.textContent = message;
            errorContainer.classList.remove('hidden');
            loadingContainer.classList.add('hidden');
            quizContainer.classList.add('hidden');
        }

        // Event listeners
        startQuizBtn.addEventListener('click', startQuiz);
        filterBtn.addEventListener('click', () => filterModal.classList.remove('hidden'));
        
        allDecksRadio.addEventListener('change', function() {
            if (this.checked) {
                deckSelectionContainer.classList.add('hidden');
                quizScope = 'all';
            }
        });
        
        selectedDecksRadio.addEventListener('change', function() {
            if (this.checked) {
                deckSelectionContainer.classList.remove('hidden');
                quizScope = 'selected';
            }
        });
        
        cancelFilterBtn.addEventListener('click', () => filterModal.classList.add('hidden'));
        applyFilterBtn.addEventListener('click', applyDeckFilter);
        nextButton.addEventListener('click', nextQuestion);
        restartButton.addEventListener('click', startQuiz);
        newQuizButton.addEventListener('click', () => {
            quizContainer.classList.add('hidden');
            scoreContainer.classList.add('hidden');
            startQuizBtn.classList.remove('hidden');
            filterBtn.classList.remove('hidden');
        });
        retryBtn.addEventListener('click', initApp);

        // Apply deck filter
        function applyDeckFilter() {
            if (selectedDecksRadio.checked) {
                const checkboxes = deckList.querySelectorAll('input[type="checkbox"]');
                selectedDecks = Array.from(checkboxes)
                    .filter(checkbox => checkbox.checked)
                    .map(checkbox => checkbox.value);
                
                if (selectedDecks.length === 0) {
                    alert('Please select at least one deck');
                    return;
                }
            } else {
                // All decks selected
                selectedDecks = allDecks.map(deck => deck._id);
            }
            
            updateDeckInfoText();
            filterModal.classList.add('hidden');
        }

        // Initialize the app when the page loads
        document.addEventListener('DOMContentLoaded', initApp);
