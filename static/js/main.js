// Get DOM elements
const uploadContainer = document.querySelector('.upload-container');
const fileInput = document.getElementById('fileInput');
const mediaPreview = document.getElementById('mediaPreview');
const selectButton = document.querySelector('.btn-light');

// Accepted file types
const acceptedTypes = {
    image: ['jpg', 'jpeg', 'png', 'bmp', 'webp'],
    video: ['mov', 'mp4']
};

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadContainer.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop zone when item is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
    uploadContainer.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadContainer.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    uploadContainer.classList.add('border-primary');
}

function unhighlight(e) {
    uploadContainer.classList.remove('border-primary');
}

// Handle dropped files
uploadContainer.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// Handle selected files
selectButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', function(e) {
    handleFiles(this.files);
});

function handleFiles(files) {
    const validFiles = [...files].filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return [...acceptedTypes.image, ...acceptedTypes.video].includes(ext);
    });

    validFiles.forEach(previewFile);
}

// Add these styles to your existing CSS
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .upload-container {
            transition: border-color 0.3s ease;
        }
        .preview-container {
            transition: all 0.3s ease;
            position: relative;
        }
        .media-wrapper {
            transition: all 0.3s ease;
        }
        #mediaPreview {
            max-height: none;
            overflow-y: visible;
        }
        .bounding-box {
            position: absolute;
            border: 2px solid #00FF00;
            pointer-events: none;
        }
        .label {
            position: absolute;
            background-color: rgba(0, 255, 0, 0.5);
            color: #fff;
            padding: 2px 4px;
            font-size: 12px;
            pointer-events: none;
        }
    </style>
`);




// Handle image/video file preview and prediction
function previewFile(file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onloadend = function() {
        // Clear previous preview
        mediaPreview.innerHTML = '';
        
        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-container';
        previewContainer.style.position = 'relative'; // For bounding boxes
        
        const mediaWrapper = document.createElement('div');
        mediaWrapper.className = 'media-wrapper';
        
        // Original media container
        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';
        
        const mediaElement = file.type.startsWith('image/') 
            ? createImagePreview(reader.result)
            : createVideoPreview(reader.result);
            
        const fileName = document.createElement('p');
        fileName.className = 'mt-2 mb-0 text-truncate';
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('small');
        fileSize.className = 'text-muted d-block';
        fileSize.textContent = formatFileSize(file.size);
        
        // Predict button
        const predictBtn = document.createElement('button');
        predictBtn.className = 'btn btn-primary mt-3';
        predictBtn.textContent = 'Predict';
        predictBtn.addEventListener('click', () => handlePredict(file, mediaElement, previewContainer));
        
        mediaItem.appendChild(mediaElement);
        mediaItem.appendChild(fileName);
        mediaItem.appendChild(fileSize);
        mediaItem.appendChild(predictBtn);
        
        mediaWrapper.appendChild(mediaItem);
        previewContainer.appendChild(mediaWrapper);
        mediaPreview.appendChild(previewContainer);
        
        // Scroll to preview
        previewContainer.scrollIntoView({ behavior: 'smooth' });
    };
}

function createImagePreview(src) {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'img-fluid rounded';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    return img;
}

function createVideoPreview(src) {
    const video = document.createElement('video');
    video.src = src;
    video.className = 'img-fluid rounded';
    video.style.maxWidth = '100%';
    video.style.height = 'auto';
    video.controls = true;
    return video;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function handlePredict(file, mediaElement, previewContainer) {
    // Show loading state
    const predictBtn = previewContainer.querySelector('button');
    predictBtn.disabled = true;
    predictBtn.textContent = 'Predicting...';

    try {
        // Create FormData and append the file
        const formData = new FormData();
        formData.append('file', file);

        // Send to server
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get the blob from the response
        const blob = await response.blob();
        
        // Create a URL for the blob
        const imageUrl = URL.createObjectURL(blob);
        
        // Create a new image element with the returned file
        const returnedImage = document.createElement('img');
        returnedImage.src = imageUrl;
        returnedImage.className = 'img-fluid rounded mt-3';
        returnedImage.style.maxWidth = '100%';
        returnedImage.style.height = 'auto';
        
        // Add a label to show it's the returned image
        const label = document.createElement('p');
        label.className = 'mt-2 mb-0';
        label.textContent = 'Returned image from server:';
        
        // Clear any previous returned images
        const existingReturnedImages = previewContainer.querySelectorAll('.returned-image-container');
        existingReturnedImages.forEach(container => container.remove());
        
        // Create container for returned image
        const returnedContainer = document.createElement('div');
        returnedContainer.className = 'returned-image-container';
        returnedContainer.appendChild(label);
        returnedContainer.appendChild(returnedImage);
        
        // Add the returned image to the preview container
        previewContainer.appendChild(returnedContainer);

    } catch (err) {
        console.error('Prediction failed:', err);
        alert('Prediction failed. Check console for details.');
    } finally {
        predictBtn.disabled = false;
        predictBtn.textContent = 'Predict';
        
        // Clean up any created object URLs when we're done
        // (though modern browsers usually handle this automatically)
        // URL.revokeObjectURL(imageUrl);
    }
}





// Function to load example image
async function loadExampleImage() {
    try {
        const response = await fetch('/static/imgs/exampleImg.jpg');
        const blob = await response.blob();
        
        // Create a File object from the blob
        const file = new File([blob], 'exampleImg.jpg', { type: 'image/jpeg' });
        
        // Use the existing preview function
        previewFile(file);
    } catch (error) {
        console.error('Failed to load example image:', error);
    }
}

// Load example image when the page loads
window.addEventListener('DOMContentLoaded', () => {
    loadExampleImage();
});