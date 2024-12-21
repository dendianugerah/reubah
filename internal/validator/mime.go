package validator

import (
	"mime/multipart"
	"net/http"
	"strings"

	"github.com/dendianugerah/reubah/pkg/errors"
)

var allowedMIMETypes = map[string]bool{
	"image/jpeg":     true,
	"image/png":      true,
	"image/webp":     true,
	"image/gif":      true,
	"image/bmp":      true,
	"image/heic":     true,
	"image/heif":     true,
	"application/pdf": true,
}

func ValidateMIMEType(file multipart.File) error {
	buffer := make([]byte, 512)
	_, err := file.Read(buffer)
	if err != nil {
		return errors.New(errors.ErrInvalidMIME, "Failed to read file", err)
	}

	// Reset the file pointer
	_, err = file.Seek(0, 0)
	if err != nil {
		return errors.New(errors.ErrInvalidMIME, "Failed to reset file pointer", err)
	}

	mimeType := http.DetectContentType(buffer)
	
	// Special handling for HEIC/HEIF files since they might not be correctly detected
	if !allowedMIMETypes[strings.ToLower(mimeType)] {
		// Check file signature for HEIC/HEIF
		if isHeicSignature(buffer) {
			return nil
		}
		return errors.New(errors.ErrInvalidMIME, "Unsupported file type: "+mimeType, nil)
	}

	return nil
}

// isHeicSignature checks for HEIC/HEIF file signatures
func isHeicSignature(buffer []byte) bool {
	// HEIC files typically start with these signatures after the MIME box
	heicSignatures := []string{
		"ftypheic",
		"ftypheix",
		"ftyphevc",
		"ftypheim",
		"ftypheis",
		"ftyphevm",
		"ftyphevs",
		"ftypmif1",
		"ftypmsf1",
		"ftypheic",
		"ftypheif",
	}

	// Convert buffer to string for easier searching
	bufferStr := string(buffer)
	
	for _, sig := range heicSignatures {
		if strings.Contains(bufferStr, sig) {
			return true
		}
	}
	
	return false
}