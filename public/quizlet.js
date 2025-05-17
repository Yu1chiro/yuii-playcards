        document.addEventListener('DOMContentLoaded', function() {
            const importButton = document.getElementById('quizlet-import');
            const modalBackdrop = document.getElementById('import-modal-backdrop');
            const closeModalButton = document.getElementById('close-modal');
            const cancelButton = document.getElementById('cancel-import');
            const fileInput = document.getElementById('file-input');
            const fileNameDisplay = document.getElementById('file-name');
            const submitButton = document.getElementById('submit-import');
            
            // Open modal
            importButton.addEventListener('click', function() {
                modalBackdrop.classList.remove('hidden');
                modalBackdrop.classList.add('flex');
            });
            
            // Close modal functions
            function closeModal() {
                modalBackdrop.classList.add('hidden');
                modalBackdrop.classList.remove('flex');
                fileInput.value = '';
                fileNameDisplay.textContent = 'No file selected';
                submitButton.disabled = true;
            }
            
            closeModalButton.addEventListener('click', closeModal);
            cancelButton.addEventListener('click', closeModal);
            
            // Handle file selection
            fileInput.addEventListener('change', function() {
                if (fileInput.files.length > 0) {
                    const fileName = fileInput.files[0].name;
                    fileNameDisplay.textContent = fileName;
                    submitButton.disabled = false;
                } else {
                    fileNameDisplay.textContent = 'No file selected';
                    submitButton.disabled = true;
                }
            });
            
            // Handle import submission
            submitButton.addEventListener('click', function() {
                if (!fileInput.files[0]) return;
                
                const file = fileInput.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    try {
                        // Parse JSON content
                        const flashcardsData = JSON.parse(e.target.result);
                        
                        // Create FormData
                        const formData = new FormData();
                        formData.append('fileName', file.name);
                        formData.append('flashcardsData', JSON.stringify(flashcardsData));
                        
                        // Show loading indicator
                        Swal.fire({
                            title: 'Importing...',
                            text: 'Please wait while we import your flashcards',
                            allowOutsideClick: false,
                            didOpen: () => {
                                Swal.showLoading();
                            }
                        });
                        
                        // Send to API
                        fetch('/api/import-flashcards', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                fileName: file.name.replace('.json', ''),
                                flashcardsData: flashcardsData
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Import Successful!',
                                    text: `let's check your deck in your dashboard!`,
                                    confirmButtonColor: '#3085d6'
                                });
                                closeModal();
                            } else {
                                throw new Error(data.error || 'Failed to import flashcards');
                            }
                        })
                        .catch(error => {
                            console.error('Import error:', error);
                            Swal.fire({
                                icon: 'error',
                                title: 'Import Failed',
                                text: error.message || 'There was an error importing your flashcards',
                                confirmButtonColor: '#3085d6'
                            });
                        });
                    } catch (error) {
                        console.error('JSON parsing error:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Invalid JSON File',
                            text: 'The file you uploaded is not a valid JSON file',
                            confirmButtonColor: '#3085d6'
                        });
                    }
                };
                
                reader.readAsText(file);
            });
        });
