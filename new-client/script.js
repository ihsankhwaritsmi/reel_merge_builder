const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('video-upload-input');
const uploadedFileNamesList = document.getElementById('uploaded-file-names');
const videoPreviewSection = document.getElementById('video-preview-section');
const videoPlayer = videoPreviewSection.querySelector('video');
const form = document.querySelector('form');
const submitButton = document.querySelector('button[type="submit"]');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');

// Configuration
const API_BASE_URL = 'http://localhost:5001';
let uploadedFiles = [];
let sessionId = null;

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false); 
});

// Highlight drop area when item is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('active'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('active'), false);
});

// Handle dropped files
dropArea.addEventListener('drop', handleDrop, false);

// Handle file selection via input click
fileInput.addEventListener('change', handleFileSelect, false);

// Handle form submission
form.addEventListener('submit', handleFormSubmit);

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    uploadedFileNamesList.innerHTML = ''; // Clear previous list
    uploadedFiles = Array.from(files); // Store files for later upload

    if (files.length > 0) {
        if (files.length > 5) {
            const listItem = document.createElement('li');
            listItem.textContent = `Too many files selected (${files.length}). Please select exactly 5 videos.`;
            listItem.style.color = 'var(--color-red)';
            uploadedFileNamesList.appendChild(listItem);
            updateSubmitButton();
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const listItem = document.createElement('li');
            
            // Check file type
            if (!file.type.startsWith('video/')) {
                listItem.textContent = `${file.name} (Invalid: not a video file)`;
                listItem.style.color = 'var(--color-red)';
            } else {
                listItem.textContent = `${file.name} (${formatFileSize(file.size)})`;
                listItem.style.color = 'var(--color-text-medium)';
            }
            
            uploadedFileNamesList.appendChild(listItem);
        }
        
        updateSubmitButton();
    } else {
        const listItem = document.createElement('li');
        listItem.textContent = 'No files selected.';
        uploadedFileNamesList.appendChild(listItem);
        updateSubmitButton();
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateSubmitButton() {
    // Don't update button if it's in completed state
    if (submitButton.classList.contains('completed')) {
        return;
    }
    
    const validVideoFiles = uploadedFiles.filter(file => file.type.startsWith('video/'));
    const isFormValid = validVideoFiles.length === 5 && 
                       document.getElementById('title').value.trim() !== '' &&
                       getMomentTitles().every(title => title.trim() !== '');
    
    submitButton.disabled = !isFormValid;
    
    if (!isFormValid) {
        if (validVideoFiles.length !== 5) {
            submitButton.textContent = `Select ${5 - validVideoFiles.length} more video${5 - validVideoFiles.length === 1 ? '' : 's'}`;
        } else {
            submitButton.textContent = 'Fill all fields to merge';
        }
        submitButton.classList.remove('completed', 'error');
    } else {
        submitButton.textContent = 'Merge Videos';
        submitButton.classList.remove('completed', 'error');
    }
}

function getMomentTitles() {
    const titles = [];
    for (let i = 0; i < 5; i++) {
        const title = document.getElementById(`moment-title-${i}`)?.value || '';
        titles.push(title);
    }
    return titles;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Check if this is a reset action (when video is already processed)
    if (submitButton.classList.contains('completed')) {
        resetForm();
        return;
    }
    
    // Validate form
    const validVideoFiles = uploadedFiles.filter(file => file.type.startsWith('video/'));
    if (validVideoFiles.length !== 5) {
        alert('Please select exactly 5 video files.');
        return;
    }
    
    const mainTitle = document.getElementById('title').value.trim();
    if (!mainTitle) {
        alert('Please enter a title for your merged video.');
        return;
    }
    
    const momentTitles = getMomentTitles();
    if (momentTitles.some(title => title.trim() === '')) {
        alert('Please fill in all moment titles.');
        return;
    }
    
    try {
        // Disable submit button and show processing state
        submitButton.disabled = true;
        submitButton.textContent = 'Uploading videos...';
        
        // Step 1: Upload files
        const formData = new FormData();
        validVideoFiles.forEach((file, index) => {
            formData.append('videos', file);
        });
        
        const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        const uploadResult = await uploadResponse.json();
        sessionId = uploadResult.session_id;
        
        // Step 2: Start video processing
        submitButton.textContent = 'Starting video processing...';
        
        const processData = {
            session_id: sessionId,
            main_title: mainTitle,
            moment_titles: momentTitles,
            start_time: 0 // You can make this configurable later
        };
        
        const processResponse = await fetch(`${API_BASE_URL}/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(processData)
        });
        
        if (!processResponse.ok) {
            const error = await processResponse.json();
            throw new Error(error.error || 'Processing failed to start');
        }
        
        const processResult = await processResponse.json();
        
        // Step 3: Poll for processing status
        pollProcessingStatus(sessionId);
        
    } catch (error) {
        console.error('Error:', error);
        alert(`Error: ${error.message}`);
        
        // Reset submit button
        submitButton.textContent = 'Merge Videos';
        submitButton.disabled = false;
        submitButton.classList.remove('processing', 'error');
    }
}

function resetForm() {
    // Reset form fields
    document.getElementById('title').value = '';
    for (let i = 0; i < 5; i++) {
        const input = document.getElementById(`moment-title-${i}`);
        if (input) input.value = '';
    }
    
    // Reset file input
    fileInput.value = '';
    uploadedFiles = [];
    uploadedFileNamesList.innerHTML = '';
    
    // Reset button
    submitButton.textContent = 'Merge Videos';
    submitButton.classList.remove('completed', 'error', 'processing');
    
    // Hide video preview
    videoPreviewSection.style.display = 'none';
    
    // Remove download button if it exists
    const downloadButton = document.getElementById('download-button');
    if (downloadButton) {
        downloadButton.remove();
    }
    
    // Reset session
    sessionId = null;
    
    // Update form validation
    updateSubmitButton();
    
    // Show a brief message
    const tempMessage = document.createElement('li');
    tempMessage.textContent = 'Form reset - ready for new videos!';
    tempMessage.style.color = 'var(--color-primary)';
    uploadedFileNamesList.appendChild(tempMessage);
    
    setTimeout(() => {
        if (uploadedFileNamesList.contains(tempMessage)) {
            uploadedFileNamesList.removeChild(tempMessage);
        }
    }, 3000);
}

function updateStatus(status, message) {
    statusIndicator.style.display = 'block';
    statusIndicator.className = `status-indicator ${status}`;
    statusText.textContent = message;
}

async function pollProcessingStatus(sessionId) {
    // Poll the server for processing status updates
    progressContainer.style.display = 'block';
    submitButton.classList.add('processing');
    updateStatus('processing', 'Processing your videos...');
    
    const statusInterval = setInterval(async () => {
        try {
            const statusResponse = await fetch(`${API_BASE_URL}/status/${sessionId}`);
            
            if (!statusResponse.ok) {
                clearInterval(statusInterval);
                throw new Error('Failed to get processing status');
            }
            
            const status = await statusResponse.json();
            
            // Update UI based on status
            if (status.status === 'processing') {
                submitButton.textContent = `Processing... ${status.step} (${status.progress}%)`;
                progressBar.style.width = `${status.progress}%`;
                updateStatus('processing', `${status.step} - ${status.progress}% complete`);
            } else if (status.status === 'completed') {
                clearInterval(statusInterval);
                
                // Complete progress
                progressBar.style.width = '100%';
                submitButton.textContent = 'Processing Complete! ✅';
                updateStatus('completed', 'Video processing completed successfully!');
                
                // Show video preview
                setTimeout(() => {
                    showVideoPreview(`${API_BASE_URL}/preview/${sessionId}`);
                    
                    // Change button to show completion status
                    submitButton.textContent = 'Video Ready - Process Another?';
                    submitButton.disabled = false;
                    submitButton.classList.remove('processing');
                    submitButton.classList.add('completed');
                    progressContainer.style.display = 'none';
                    progressBar.style.width = '0%';
                    
                    updateStatus('completed', 'Your merged video is ready for download!');
                    
                    // Add download button
                    addDownloadButton();
                }, 1500);
                
            } else if (status.status === 'error') {
                clearInterval(statusInterval);
                throw new Error(status.error || 'Processing failed');
            }
            
        } catch (error) {
            clearInterval(statusInterval);
            console.error('Status polling error:', error);
            alert(`Processing error: ${error.message}`);
            
            // Reset submit button with error status
            submitButton.textContent = 'Processing Failed - Try Again';
            submitButton.disabled = false;
            submitButton.classList.remove('processing');
            submitButton.classList.add('error');
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
            updateStatus('error', `Processing failed: ${error.message}`);
        }
    }, 2000); // Poll every 2 seconds
}

function showVideoPreview(videoUrl) {
    videoPlayer.src = videoUrl;
    videoPreviewSection.style.display = 'block';
    videoPlayer.load(); // Load the new video source
    
    // Scroll to the video preview section
    videoPreviewSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

function addDownloadButton() {
    // Check if download button already exists
    if (document.getElementById('download-button')) {
        return;
    }
    
    const downloadButton = document.createElement('button');
    downloadButton.id = 'download-button';
    downloadButton.type = 'button';
    downloadButton.className = 'button';
    downloadButton.textContent = 'Download Video';
    downloadButton.style.marginTop = '1rem';
    
    downloadButton.addEventListener('click', () => {
        if (sessionId) {
            window.open(`${API_BASE_URL}/download/${sessionId}`, '_blank');
        }
    });
    
    videoPreviewSection.appendChild(downloadButton);
}

// Add event listeners to form inputs for real-time validation
document.addEventListener('DOMContentLoaded', () => {
    const titleInput = document.getElementById('title');
    const momentInputs = [];
    
    for (let i = 0; i < 5; i++) {
        const input = document.getElementById(`moment-title-${i}`);
        if (input) {
            momentInputs.push(input);
        }
    }
    
    // Add event listeners for real-time validation
    titleInput?.addEventListener('input', updateSubmitButton);
    momentInputs.forEach(input => {
        input?.addEventListener('input', updateSubmitButton);
    });
    
    // Initial state
    updateSubmitButton();
});