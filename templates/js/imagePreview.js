document.addEventListener("DOMContentLoaded", function () {
  const elements = {
    imageInput: document.getElementById("imageInput"),
    previewDiv: document.getElementById("preview"),
    uploadArea: document.getElementById("uploadArea"),
    fileStatus: document.getElementById("fileStatus"),
    fileName: document.getElementById("fileName"),
    fileSize: document.getElementById("fileSize"),
    uploadText: document.getElementById("uploadText"),
    widthInput: document.getElementById("widthInput"),
    heightInput: document.getElementById("heightInput"),
    removePreviewBtn: document.getElementById("removePreview"),
    formatSelect: document.getElementById("formatSelect")  
  };

  // Add HEIC decoder script to head
  const heicScript = document.createElement('script');
  heicScript.src = 'https://unpkg.com/heic2any';
  document.head.appendChild(heicScript);

  function isHeicFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    return ext === 'heic' || ext === 'heif' || 
           file.type === 'image/heic' || file.type === 'image/heif';
  }

  function isIcoFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    return ext === 'ico' || file.type === 'image/x-icon';
  }

  function initializeImagePreview() {
    if (!elements.imageInput || !elements.uploadArea) {
      console.error("Required preview elements not found");
      return;
    }

    setupEventListeners();
  }

  function setupEventListeners() {
    elements.imageInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) handleFileSelect(file);
    });

    if (elements.removePreviewBtn) {
      elements.removePreviewBtn.addEventListener("click", (e) => {
        e.preventDefault();
        resetForm();
      });
    }

    setupDragAndDrop();
  }

  function setupDragAndDrop() {
    elements.uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      elements.uploadArea.classList.add("border-indigo-500");
    });

    elements.uploadArea.addEventListener("dragleave", (e) => {
      e.preventDefault();
      elements.uploadArea.classList.remove("border-indigo-500");
    });

    elements.uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      elements.uploadArea.classList.remove("border-indigo-500");

      if (e.dataTransfer.files.length) {
        elements.imageInput.files = e.dataTransfer.files;
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });
  }

  function handleFileSelect(file) {
    const isImage = file.type.startsWith("image/");
    const isHeic = isHeicFile(file);
    const isIco = isIcoFile(file);
    
    if (!isImage && !isHeic && !isIco) {
        alert("Please select an image file");
        return;
    }

    updateFileStatus(file);
    previewImage(file);
  }

  function updateFileStatus(file) {
    if (!elements.fileStatus) return;

    elements.fileStatus.classList.remove("hidden");
    elements.fileStatus.classList.add("bg-green-50");
    elements.fileName.textContent = file.name;
    elements.fileSize.textContent = ` (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
  }

  function previewImage(file) {
    if (isHeicFile(file)) {
        // Use heic2any to convert HEIC to blob
        heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.9
        }).then(conversionResult => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (!elements.previewDiv) return;

                elements.previewDiv.classList.remove("hidden");
                const img = elements.previewDiv.querySelector("img") || document.createElement("img");
                img.className = "max-w-full rounded-lg";
                img.src = e.target.result;
                img.alt = 'HEIC preview';
                img.onload = () => updateImageInfo(img);

                if (!elements.previewDiv.querySelector("img")) {
                    elements.previewDiv.appendChild(img);
                }

                elements.uploadArea.classList.add("border-green-500");
                if (elements.uploadText) {
                    elements.uploadText.innerHTML = '<span class="text-green-500">HEIC file ready for processing</span>';
                }
                
                // Force output format to something other than HEIC
                if (elements.formatSelect && elements.formatSelect.value === "heic") {
                    elements.formatSelect.value = "jpeg";
                }
            };
            reader.readAsDataURL(conversionResult);
        }).catch(error => {
            console.error('Error decoding HEIC:', error);
            // Fall back to server-side conversion if client-side fails
            serverSideHeicPreview(file);
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        if (!elements.previewDiv) return;

        elements.previewDiv.classList.remove("hidden");
        const img = elements.previewDiv.querySelector("img") || document.createElement("img");
        img.className = "max-w-full rounded-lg";
        
        if (isIcoFile(file)) {
            img.src = e.target.result;
            img.alt = 'ICO preview';
            img.style.backgroundColor = '#ffffff'; // Add white background for transparency
            elements.uploadArea.classList.add("border-green-500");
            if (elements.uploadText) {
                elements.uploadText.innerHTML = '<span class="text-green-500">ICO file ready for processing</span>';
            }
            
            // Set PNG as default output for ICO
            if (elements.formatSelect && elements.formatSelect.value === "ico") {
                elements.formatSelect.value = "png";
            }
        } else {
            img.src = e.target.result;
            img.alt = 'Image preview';
        }
        
        img.onload = () => updateImageInfo(img);

        if (!elements.previewDiv.querySelector("img")) {
            elements.previewDiv.appendChild(img);
        }
    };
    reader.readAsDataURL(file);
  }

  async function serverSideHeicPreview(file) {
    if (!elements.previewDiv) return;

    const img = elements.previewDiv.querySelector("img") || document.createElement("img");
    img.className = "max-w-full rounded-lg";
    
    try {
        // Create a temporary form data
        const formData = new FormData();
        formData.append('image', file);
        formData.append('sourceFormat', 'heic');
        formData.append('format', 'jpeg');
        formData.append('quality', '90');

        // Send to server for preview conversion
        const response = await fetch('/process', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to convert HEIC for preview');

        // Get the converted image blob
        const blob = await response.blob();
        img.src = URL.createObjectURL(blob);
        img.alt = 'HEIC preview';
        img.onload = () => {
            updateImageInfo(img);
            URL.revokeObjectURL(img.src);
        };
    } catch (error) {
        console.error('Error previewing HEIC:', error);
        img.src = '/static/images/heic-placeholder.svg';
        img.alt = 'HEIC preview failed';
    }

    if (!elements.previewDiv.querySelector("img")) {
        elements.previewDiv.appendChild(img);
    }

    elements.uploadArea.classList.add("border-green-500");
    if (elements.uploadText) {
        elements.uploadText.innerHTML = '<span class="text-green-500">HEIC file ready for processing</span>';
    }
    
    // Force output format to something other than HEIC
    if (elements.formatSelect && elements.formatSelect.value === "heic") {
        elements.formatSelect.value = "jpeg";
    }
  }

  function updateImageInfo(img) {
    const dimensions = `${img.naturalWidth} × ${img.naturalHeight}px`;
    const dimensionsElement = elements.previewDiv.querySelector(".image-dimensions");
    if (dimensionsElement) {
      dimensionsElement.textContent = dimensions;
    }

    elements.uploadArea.classList.add("border-green-500");
    if (elements.uploadText) {
      elements.uploadText.innerHTML = '<span class="text-green-500">File ready for processing</span>';
    }

    // Update dimension inputs with placeholders
    if (elements.widthInput) elements.widthInput.placeholder = img.naturalWidth;
    if (elements.heightInput) elements.heightInput.placeholder = img.naturalHeight;
  }

  function resetForm() {
    // Reset file input value
    elements.imageInput.value = "";
    
    // Hide preview and status
    elements.previewDiv.classList.add("hidden");
    elements.fileStatus.classList.add("hidden");
    
    // Reset upload area styling
    elements.uploadArea.classList.remove("border-green-500");
    
    // Reset upload text without replacing the input element
    if (elements.uploadText) {
        elements.uploadText.innerHTML = `
            <label for="imageInput" class="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                <span class="inline-flex items-center px-4 py-2 border border-indigo-500 text-sm rounded-full hover:bg-indigo-50 transition-colors">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Choose a file
                </span>
            </label>
            <p class="text-gray-500">or drag and drop your image here</p>
        `;
    }

    // Reset dimension input placeholders
    if (elements.widthInput) elements.widthInput.placeholder = "Width (px)";
    if (elements.heightInput) elements.heightInput.placeholder = "Height (px)";
    
    // Re-initialize event listeners
    setupEventListeners();
  }

  initializeImagePreview();
});
