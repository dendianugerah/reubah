document.addEventListener("DOMContentLoaded", function () {
    const elements = {
        batchUploadArea: document.getElementById("batchUploadArea"),
        batchImageInput: document.getElementById("batchImageInput"),
        batchFileList: document.getElementById("batchFileList"),
        batchProcessBtn: document.getElementById("batchProcessBtn"),
        batchProgress: document.getElementById("batchProgress"),
        batchProgressBar: document.getElementById("batchProgressBar"),
        batchProgressCount: document.getElementById("batchProgressCount"),
        batchDownloadSuffixToggle: document.getElementById("batchDownloadWithSuffix")
    };

    const state = {
        files: [],
        processing: false
    };

    function initializeBatchUpload() {
        if (!elements.batchUploadArea || !elements.batchImageInput) {
            console.error("Required batch upload elements not found");
            return;
        }

        setupBatchEventListeners();
    }

    function setupBatchEventListeners() {
        // File input change handler
        elements.batchImageInput.addEventListener("change", handleFileSelect);

        // Drag and drop handlers
        elements.batchUploadArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            elements.batchUploadArea.classList.add("border-indigo-500");
        });

        elements.batchUploadArea.addEventListener("dragleave", (e) => {
            e.preventDefault();
            elements.batchUploadArea.classList.remove("border-indigo-500");
        });

        elements.batchUploadArea.addEventListener("drop", (e) => {
            e.preventDefault();
            elements.batchUploadArea.classList.remove("border-indigo-500");
            
            if (e.dataTransfer.files.length) {
                handleFileSelect({ target: { files: e.dataTransfer.files } });
            }
        });

        // Process button handler
        elements.batchProcessBtn.addEventListener("click", processBatch);
    }

    function handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => {
            const isImage = file.type.startsWith("image/");
            const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                          file.name.toLowerCase().endsWith('.heif');
            return isImage || isHeic;
        });
        
        if (files.length === 0) {
            alert("Please select valid image files");
            return;
        }
    
        state.files = files;
        updateFileList();
        elements.batchProcessBtn.disabled = false;
    }

    function updateFileList() {
        elements.batchFileList.innerHTML = state.files.map((file, index) => `
            <div class="flex items-center justify-between py-2">
                <div class="flex items-center">
                    <span class="text-sm font-medium transition-colors" 
                          :class="{ 'text-darkTextPrimary': darkMode, 'text-gray-900': !darkMode }">
                        ${file.name}
                    </span>
                    <span class="ml-2 text-sm transition-colors" 
                          :class="{ 'text-darkTextSecondary': darkMode, 'text-gray-500': !darkMode }">
                        (${(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                </div>
                <button onclick="removeFile(${index})" 
                        class="transition-colors hover:text-red-700"
                        :class="{ 'text-red-400': darkMode, 'text-red-500': !darkMode }">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `).join("");
        
        elements.batchFileList.classList.remove("hidden");
    }

    window.removeFile = function(index) {
        state.files.splice(index, 1);
        updateFileList();
        elements.batchProcessBtn.disabled = state.files.length === 0;
    };

    async function processBatch() {
        if (state.processing || state.files.length === 0) return;

        state.processing = true;
        elements.batchProcessBtn.disabled = true;
        elements.batchProgress.classList.remove('hidden');

        const options = getProcessingOptions();

        if (options.mode === 'merge-pdf') {
            await processMergePDF(options);
        } else {
            await processIndividualFiles(options);
        }

        state.processing = false;
        elements.batchProcessBtn.disabled = false;
        resetBatchUpload();
    }

    function getProcessingOptions() {
        const processingMode = document.querySelector('input[name="processing-mode"]:checked').value;
        
        if (processingMode === 'merge-pdf') {
            return {
                mode: 'merge-pdf',
                pageSize: document.getElementById('pdfPageSize').value,
                orientation: document.getElementById('pdfOrientation').value,
                imagesPerPage: document.getElementById('imagesPerPage').value
            };
        }
        
        return {
            mode: 'individual',
            format: document.getElementById('batchFormatSelect')?.value || 'jpeg',
            // quality: document.getElementById('batchQualitySelect')?.value || 'medium',
            width: document.getElementById('batchWidthInput')?.value || '',
            height: document.getElementById('batchHeightInput')?.value || '',
            downloadWithProcessedSuffix: elements.batchDownloadSuffixToggle?.checked || false,
            // optimize: document.getElementById('batchOptimize')?.checked || false
        };
    }

    async function processIndividualFiles(options) {
        const total = state.files.length;
        let processed = 0;
        let errors = [];

        try {
            for (const file of state.files) {
                const formData = new FormData();
                formData.append("image", file);
                
                // Add processing options
                for (const [key, value] of Object.entries(options)) {
                    if (key === 'downloadWithProcessedSuffix') {
                        continue;
                    }
                    formData.append(key, value);
                }

                try {
                    await processFile(formData, options.downloadWithProcessedSuffix);
                    processed++;
                } catch (error) {
                    errors.push(`Failed to process ${file.name}: ${error.message}`);
                }
                
                updateProgress(processed, total);
            }

            if (errors.length > 0) {
                alert(`Batch processing completed with ${errors.length} errors:\n${errors.join('\n')}`);
            } else {
                alert("Batch processing completed successfully!");
            }
        } catch (error) {
            console.error("Batch processing error:", error);
            alert("An error occurred during batch processing");
        }
    }

    async function processMergePDF(options) {
        const formData = new FormData();
        state.files.forEach((file, index) => {
            formData.append(`images`, file);
        });
        
        // Add PDF options
        formData.append('mode', 'merge-pdf');
        formData.append('pageSize', options.pageSize);
        formData.append('orientation', options.orientation);
        formData.append('imagesPerPage', options.imagesPerPage);

        try {
            const response = await fetch('/process/merge-pdf', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('PDF creation failed');
            }

            const blob = await response.blob();
            downloadFile(blob, `merged_${Date.now()}.pdf`);
        } catch (error) {
            console.error('Error creating PDF:', error);
            alert('Failed to create PDF: ' + error.message);
        }
    }

    async function processFile(formData, appendProcessedSuffix) {
        try {
            const response = await fetch("/process", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Processing failed");
            }

            const originalName = formData.get("image").name;
            const format = formData.get("format") || "jpeg";
            const fallbackName = buildDefaultDownloadName(originalName, format);
            const filename = buildProcessedDownloadName(
                getDownloadNameFromResponse(response, fallbackName),
                appendProcessedSuffix
            );
            const blob = await response.blob();
            
            // Set the correct content type based on the format
            const contentType = response.headers.get("Content-Type") || getContentType(format);
            const processedBlob = new Blob([blob], { type: contentType });
            
            downloadFile(processedBlob, filename);
            return true;
        } catch (error) {
            console.error(`Error processing file: ${error.message}`);
            throw error;
        }
    }

    function getContentType(format) {
        const contentTypes = {
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'heic': 'image/heic',
            'heif': 'image/heif',
            'pdf': 'application/pdf'
        };
        return contentTypes[format] || 'application/octet-stream';
    }

    function getDownloadNameFromResponse(response, fallbackName) {
        const headerName = parseContentDispositionFilename(
            response.headers.get("Content-Disposition")
        );

        return headerName || fallbackName;
    }

    function parseContentDispositionFilename(headerValue) {
        if (!headerValue) {
            return "";
        }

        const encodedMatch = headerValue.match(/filename\*\s*=\s*([^;]+)/i);
        if (encodedMatch) {
            const encodedValue = encodedMatch[1].trim().replace(/^UTF-8''/i, "").replace(/^"|"$/g, "");
            try {
                return sanitizeFilename(decodeURIComponent(encodedValue));
            } catch (error) {
                console.warn("Unable to decode filename* header", error);
            }
        }

        const quotedMatch = headerValue.match(/filename\s*=\s*"([^"]+)"/i);
        if (quotedMatch) {
            return sanitizeFilename(quotedMatch[1]);
        }

        const plainMatch = headerValue.match(/filename\s*=\s*([^;]+)/i);
        return plainMatch ? sanitizeFilename(plainMatch[1]) : "";
    }

    function buildDefaultDownloadName(originalName, outputFormat) {
        const safeOriginalName = sanitizeFilename(originalName);
        const targetExtension = normalizeOutputExtension(outputFormat);

        if (!safeOriginalName) {
            return targetExtension ? `image.${targetExtension}` : "image";
        }

        const parts = splitFilename(safeOriginalName);
        if (extensionsMatch(parts.extension, targetExtension)) {
            return safeOriginalName;
        }

        return targetExtension ? `${parts.baseName}.${targetExtension}` : parts.baseName;
    }

    function buildProcessedDownloadName(filename, appendProcessedSuffix) {
        const safeFilename = sanitizeFilename(filename);
        if (!appendProcessedSuffix || !safeFilename) {
            return safeFilename;
        }

        const parts = splitFilename(safeFilename);
        return parts.extension
            ? `${parts.baseName}_processed.${parts.extension}`
            : `${parts.baseName}_processed`;
    }

    function splitFilename(filename) {
        const safeFilename = sanitizeFilename(filename);
        const lastDot = safeFilename.lastIndexOf(".");

        if (lastDot <= 0) {
            return {
                baseName: safeFilename || "image",
                extension: ""
            };
        }

        return {
            baseName: safeFilename.slice(0, lastDot),
            extension: safeFilename.slice(lastDot + 1)
        };
    }

    function sanitizeFilename(filename) {
        return (filename || "")
            .split(/[/\\]/)
            .pop()
            .replace(/[\r\n\0]/g, "")
            .trim();
    }

    function normalizeOutputExtension(extension) {
        return (extension || "").replace(/^\./, "").trim().toLowerCase();
    }

    function extensionsMatch(left, right) {
        return normalizeComparableExtension(left) === normalizeComparableExtension(right);
    }

    function normalizeComparableExtension(extension) {
        switch (normalizeOutputExtension(extension)) {
            case "jpg":
                return "jpeg";
            default:
                return normalizeOutputExtension(extension);
        }
    }

    function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function updateProgress(processed, total) {
        const percentage = (processed / total) * 100;
        elements.batchProgressBar.style.width = `${percentage}%`;
        elements.batchProgressCount.textContent = `${processed}/${total} files`;
    }

    function resetBatchUpload() {
        state.files = [];
        elements.batchImageInput.value = "";
        elements.batchFileList.classList.add("hidden");
        elements.batchProgress.classList.add("hidden");
        elements.batchProgressBar.style.width = "0%";
        elements.batchProgressCount.textContent = "0/0 files";
        elements.batchProcessBtn.disabled = true;
    }

    initializeBatchUpload();
});