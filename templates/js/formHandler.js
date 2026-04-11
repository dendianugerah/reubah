document.addEventListener("DOMContentLoaded", function () {
  const elements = {
    form: document.getElementById("uploadForm"),
    progress: document.getElementById("progress"),
    result: document.getElementById("result"),
    formatSelect: document.getElementById("formatSelect"),
    qualitySelect: document.getElementById("qualitySelect"),
    widthInput: document.getElementById("widthInput"),
    heightInput: document.getElementById("heightInput"),
    removeBackground: document.getElementById("removeBackground"),
    bgRemovalOptions: document.getElementById("bgRemovalOptions"),
    resizeModeSelect: document.getElementById("resizeModeSelect"),
    optimize: document.getElementById("optimize"),
    downloadSuffixToggle: document.getElementById("downloadWithSuffix")
  };

  const state = {
    defaultDownloadName: "",
    resultUrl: ""
  };

  // Validate required elements
  if (!elements.form || !elements.form.querySelector('input[type="file"]')) {
    console.error("Required form elements not found");
    return;
  }

  const fileInput = elements.form.querySelector('input[type="file"]');
  const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB

  // Setup quick actions
  setupQuickActions();
  
  // Setup background removal toggle
  if (elements.removeBackground) {
    elements.removeBackground.addEventListener("change", () => {
      if (elements.bgRemovalOptions) {
        elements.bgRemovalOptions.classList.toggle("hidden", !elements.removeBackground.checked);
      }
    });
  }

  if (elements.downloadSuffixToggle) {
    elements.downloadSuffixToggle.addEventListener("change", updateDownloadButton);
  }

  // Handle form submission
  elements.form.addEventListener("submit", handleFormSubmit);

  function setupQuickActions() {
    const actions = {
      optimize: () => {
        elements.formatSelect.value = "webp";
        elements.qualitySelect.value = "medium";
        elements.widthInput.value = "";
        elements.heightInput.value = "";
      },
      resize: () => {
        elements.widthInput.focus();
      },
      adjust: () => {
        elements.formatSelect.value = "png";
        elements.qualitySelect.value = "lossless";
      },
      convert: () => elements.formatSelect.focus()
    };

    document.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const action = button.dataset.action;
        if (actions[action]) {
          actions[action]();
          updateQuickActionStyles(button);
        }
      });
    });
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateFile()) return;

    const formData = createFormData();
    
    try {
      await processImage(formData);
    } catch (error) {
      console.error("Error:", error);
      showError(error.message);
    }
  }

  function validateFile() {
    if (!fileInput.files || !fileInput.files.length) {
        showError("Please select an image file first");
        return false;
    }

    const file = fileInput.files[0];
    if (file.size > MAX_FILE_SIZE) {
        showError("File size exceeds 32MB limit");
        return false;
    }

    const isImage = file.type.startsWith('image/');
    const isHeic = isHeicFile(file);
    
    if (!isImage && !isHeic) {
        showError("Please select a valid image file");
        return false;
    }

    return true;
}

function isHeicFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  return ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif';
}

function createFormData() {
  const formData = new FormData();
  const file = fileInput.files[0];
  
  // Create a new Blob with the correct MIME type for HEIC files
  if (isHeicFile(file)) {
    const heicBlob = new Blob([file], { type: 'image/heic' });
    formData.append("image", heicBlob, file.name);
    formData.append("sourceFormat", "heic");
    
    // Always convert HEIC to a different format
    const outputFormat = elements.formatSelect?.value;
    if (!outputFormat || outputFormat === "heic") {
      formData.append("format", "jpeg"); // Default to JPEG
    } else {
      formData.append("format", outputFormat);
    }
  } else {
    formData.append("image", file);
    formData.append("format", elements.formatSelect?.value || "jpeg");
  }
  
  // Add other options
  if (elements.qualitySelect?.value) {
    formData.append("quality", elements.qualitySelect.value);
  }
  if (elements.widthInput?.value) {
    formData.append("width", elements.widthInput.value);
  }
  if (elements.heightInput?.value) {
    formData.append("height", elements.heightInput.value);
  }
  if (elements.resizeModeSelect) {
    formData.append("resizeMode", elements.resizeModeSelect.value || "fit");
  }
  if (elements.removeBackground?.checked) {
    formData.append("removeBackground", "true");
  }
  if (elements.optimize?.checked) {
    formData.append("optimize", "true");
  }

  // Log form data for debugging
  for (let pair of formData.entries()) {
    console.log(pair[0] + ': ' + pair[1]);
  }

  return formData;
}

  async function processImage(formData) {
    showProgress();
    const submitButton = elements.form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
        // Log the FormData contents for debugging
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + pair[1]);
        }

        const response = await fetch("/process", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Unknown error occurred" }));
            console.error("Server response:", errorData);
            throw new Error(errorData.error?.message || errorData.message || "Processing failed");
        }

        await handleSuccess(response, fileInput.files[0], elements.formatSelect?.value || "jpeg");
    } catch (error) {
        console.error("Processing error:", error);
        showError(error.message || "Failed to process image");
    } finally {
        hideProgress();
        if (submitButton) submitButton.disabled = false;
    }
}

  function showProgress() {
    if (elements.progress) {
      elements.progress.style.display = "block";
    }
    if (elements.result) {
      elements.result.style.display = "none";
    }
  }

  function hideProgress() {
    if (elements.progress) {
      elements.progress.style.display = "none";
    }
  }

  function showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "bg-red-50 border-l-4 border-red-400 p-4 mb-4";
    errorDiv.innerHTML = `
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">${message}</p>
        </div>
      </div>
    `;
    elements.form.insertBefore(errorDiv, elements.form.firstChild);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  async function handleSuccess(response, originalFile, format) {
    if (!elements.result) {
      console.error("Result element not found");
      return;
    }

    const blob = await response.blob();
    if (state.resultUrl) {
      URL.revokeObjectURL(state.resultUrl);
    }
    state.resultUrl = URL.createObjectURL(blob);

    const fallbackName = buildDefaultDownloadName(originalFile?.name || "", format);
    state.defaultDownloadName = getDownloadNameFromResponse(response, fallbackName);

    const resultPreview = elements.result.querySelector(".result-preview");
    const originalSize = elements.result.querySelector(".original-size");
    const newSize = elements.result.querySelector(".new-size");

    if (resultPreview) {
      resultPreview.innerHTML = `<img src="${state.resultUrl}" alt="Processed image" class="max-w-full rounded-lg">`;
    }

    if (originalSize) {
      originalSize.textContent = formatFileSize(originalFile?.size || 0);
    }

    if (newSize) {
      newSize.textContent = formatFileSize(blob.size);
    }

    updateDownloadButton();

    elements.result.style.display = "block";
  }

  function updateDownloadButton() {
    const downloadButton = elements.result?.querySelector(".download-btn");
    if (!downloadButton || !state.resultUrl || !state.defaultDownloadName) {
      return;
    }

    downloadButton.href = state.resultUrl;
    downloadButton.download = buildProcessedDownloadName(
      state.defaultDownloadName,
      elements.downloadSuffixToggle?.checked || false
    );
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

  function formatFileSize(bytes) {
    if (!bytes) {
      return "0 KB";
    }

    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  function updateQuickActionStyles(button) {
    document.querySelectorAll("[data-action]").forEach((btn) => {
      btn.classList.remove(
        "bg-indigo-50",
        "border-indigo-500",
        "text-indigo-700"
      );
    });
    button.classList.add(
      "bg-indigo-50",
      "border-indigo-500",
      "text-indigo-700"
    );
  }
});
