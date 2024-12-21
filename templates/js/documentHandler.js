document.addEventListener("DOMContentLoaded", function () {
    const elements = {
        documentUploadArea: document.getElementById("documentUploadArea"),
        documentInput: document.getElementById("documentInput"),
        documentInfo: document.getElementById("documentInfo"),
        outputFormat: document.getElementById("outputFormat"),
        convertBtn: document.getElementById("convertBtn"),
        conversionProgress: document.getElementById("conversionProgress")
    };

    const state = {
        file: null,
        converting: false
    };

    function initializeDocumentConversion() {
        if (!elements.documentUploadArea || !elements.documentInput) {
            console.error("Required document conversion elements not found");
            return;
        }

        setupEventListeners();
    }

    function setupEventListeners() {
        // File input change handler
        elements.documentInput.addEventListener("change", handleFileSelect);

        // Drag and drop handlers
        elements.documentUploadArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            elements.documentUploadArea.classList.add("border-indigo-500");
        });

        elements.documentUploadArea.addEventListener("dragleave", (e) => {
            e.preventDefault();
            elements.documentUploadArea.classList.remove("border-indigo-500");
        });

        elements.documentUploadArea.addEventListener("drop", (e) => {
            e.preventDefault();
            elements.documentUploadArea.classList.remove("border-indigo-500");
            
            if (e.dataTransfer.files.length) {
                handleFileSelect({ target: { files: e.dataTransfer.files } });
            }
        });

        // Convert button handler
        elements.convertBtn.addEventListener("click", convertDocument);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        const supportedFormats = ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt'];
        
        if (!supportedFormats.includes(ext)) {
            alert("Please select a supported document format");
            return;
        }

        state.file = file;
        updateDocumentInfo();
        elements.convertBtn.disabled = false;
    }

    function updateDocumentInfo() {
        const info = elements.documentInfo.querySelector('p');
        info.innerHTML = `
            <span class="transition-colors" :class="{ 'text-darkTextPrimary': darkMode, 'text-gray-900': !darkMode }">
                ${state.file.name}
            </span>
            <span class="ml-2 transition-colors" :class="{ 'text-darkTextSecondary': darkMode, 'text-gray-500': !darkMode }">
                (${(state.file.size / (1024 * 1024)).toFixed(2)} MB)
            </span>`;
        elements.documentInfo.classList.remove("hidden");
    }

    async function convertDocument() {
        if (state.converting || !state.file) return;

        state.converting = true;
        elements.convertBtn.disabled = true;
        elements.conversionProgress.classList.remove('hidden');

        const formData = new FormData();
        formData.append("document", state.file);
        formData.append("format", elements.outputFormat.value);

        try {
            const response = await fetch("/process/document", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Server error:", errorData);
                throw new Error(errorData.error?.message || errorData.message || "Conversion failed");
            }

            const blob = await response.blob();
            const filename = getOutputFilename(state.file.name, elements.outputFormat.value);
            downloadFile(blob, filename);
            
        } catch (error) {
            console.error("Conversion error:", error);
            alert("Failed to convert document: " + error.message);
        } finally {
            state.converting = false;
            elements.convertBtn.disabled = false;
            elements.conversionProgress.classList.add('hidden');
            resetDocumentConversion();
        }
    }

    function getOutputFilename(originalName, newFormat) {
        const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
        return `${baseName}_converted.${newFormat}`;
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

    function resetDocumentConversion() {
        state.file = null;
        elements.documentInput.value = "";
        elements.documentInfo.classList.add("hidden");
        elements.convertBtn.disabled = true;
    }

    initializeDocumentConversion();
});