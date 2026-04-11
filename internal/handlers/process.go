package handlers

import (
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"log"
	"mime"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/dendianugerah/reubah/internal/constants"
	"github.com/dendianugerah/reubah/internal/processor"
	"github.com/dendianugerah/reubah/internal/processor/resize"
	"github.com/dendianugerah/reubah/internal/validator"
	"github.com/dendianugerah/reubah/pkg/errors"
)

func ProcessImage(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(constants.MaxFileSize); err != nil {
		errors.SendError(w, errors.New(errors.ErrInvalidFormat, "Unable to parse form", err))
		return
	}

	opts, img, originalFilename, err := parseRequest(r)
	if err != nil {
		errors.SendError(w, err)
		return
	}

	processedImage, err := processImage(img, opts)
	if err != nil {
		errors.SendError(w, err)
		return
	}

	sendResponse(w, processedImage, originalFilename, opts.OutputFormat)
}

func parseRequest(r *http.Request) (processor.ProcessOptions, image.Image, string, error) {
	img, originalFilename, err := getAndValidateImage(r)
	if err != nil {
		return processor.ProcessOptions{}, nil, "", err
	}

	opts, err := parseOptions(r)
	if err != nil {
		return processor.ProcessOptions{}, nil, "", err
	}

	return opts, img, originalFilename, nil
}

func getAndValidateImage(r *http.Request) (image.Image, string, error) {
	file, header, err := r.FormFile("image")
	if err != nil {
		return nil, "", errors.New(errors.ErrInvalidFormat, "No file uploaded", err)
	}
	defer file.Close()

	if err := validator.ValidateMIMEType(file); err != nil {
		return nil, "", errors.New(errors.ErrInvalidMIME, "Invalid file type", err)
	}

	img, _, err := image.Decode(file)
	if err != nil {
		return nil, "", errors.New(errors.ErrInvalidFormat, "Invalid image file", err)
	}

	return img, header.Filename, nil
}

func parseOptions(r *http.Request) (processor.ProcessOptions, error) {
	width, err := parseDimension(r.FormValue("width"))
	if err != nil {
		return processor.ProcessOptions{}, errors.New(errors.ErrInvalidFormat, "Invalid width value", err)
	}

	height, err := parseDimension(r.FormValue("height"))
	if err != nil {
		return processor.ProcessOptions{}, errors.New(errors.ErrInvalidFormat, "Invalid height value", err)
	}

	format := r.FormValue("format")
	if format == "" {
		format = constants.DefaultFormat
	}

	resizeMode := r.FormValue("resizeMode")
	if resizeMode == "" {
		resizeMode = constants.DefaultResizeMode
	}

	parsedResizeMode, err := resize.ParseResizeMode(resizeMode)
	if err != nil {
		return processor.ProcessOptions{}, errors.New(errors.ErrInvalidFormat, "Invalid resize mode", err)
	}

	return processor.ProcessOptions{
		Width:            width,
		Height:           height,
		ResizeMode:       parsedResizeMode,
		OutputFormat:     format,
		Quality:          parseQuality(r.FormValue("quality")),
		RemoveBackground: r.FormValue("removeBackground") == "true",
		OptimizeImage:    r.FormValue("optimize") == "true",
	}, nil
}

func processImage(img image.Image, opts processor.ProcessOptions) (*processor.ProcessedImage, error) {
	proc := processor.NewImageProcessor()
	return proc.ProcessImageData(img, opts)
}

func sendResponse(w http.ResponseWriter, img *processor.ProcessedImage, originalFilename, format string) {
	downloadFilename := buildImageDownloadFilename(originalFilename, format)
	contentDisposition := mime.FormatMediaType("attachment", map[string]string{"filename": downloadFilename})
	if contentDisposition == "" {
		contentDisposition = fmt.Sprintf(`attachment; filename="%s"`, downloadFilename)
	}

	w.Header().Set("Content-Type", fmt.Sprintf("image/%s", format))
	w.Header().Set("Content-Disposition", contentDisposition)

	if err := img.Write(w); err != nil {
		log.Printf("Error writing response: %v", err)
	}
}

func buildImageDownloadFilename(originalFilename, format string) string {
	cleanFilename := sanitizeUploadedFilename(originalFilename)
	targetExtension := normalizeImageExtension(format)

	if cleanFilename == "" {
		if targetExtension == "" {
			return "image"
		}
		return fmt.Sprintf("image.%s", targetExtension)
	}

	originalExtension := strings.TrimPrefix(strings.ToLower(filepath.Ext(cleanFilename)), ".")
	if imageExtensionsMatch(originalExtension, targetExtension) {
		return cleanFilename
	}

	baseName := strings.TrimSuffix(cleanFilename, filepath.Ext(cleanFilename))
	if baseName == "" {
		baseName = "image"
	}
	if targetExtension == "" {
		return baseName
	}

	return fmt.Sprintf("%s.%s", baseName, targetExtension)
}

func sanitizeUploadedFilename(filename string) string {
	cleanFilename := strings.TrimSpace(filepath.Base(filename))
	cleanFilename = strings.Map(func(r rune) rune {
		switch r {
		case '\r', '\n', 0:
			return -1
		default:
			return r
		}
	}, cleanFilename)

	if cleanFilename == "." {
		return ""
	}

	return cleanFilename
}

func normalizeImageExtension(extension string) string {
	return strings.TrimPrefix(strings.ToLower(strings.TrimSpace(extension)), ".")
}

func imageExtensionsMatch(originalExtension, targetExtension string) bool {
	return comparableImageExtension(originalExtension) == comparableImageExtension(targetExtension)
}

func comparableImageExtension(extension string) string {
	switch normalizeImageExtension(extension) {
	case "jpg":
		return "jpeg"
	default:
		return normalizeImageExtension(extension)
	}
}

func parseDimension(value string) (int, error) {
	if value == "" {
		return 0, nil
	}
	return strconv.Atoi(value)
}

func parseQuality(quality string) int {
	switch quality {
	case "low":
		return 60
	case "medium":
		return 75
	case "high":
		return 90
	case "lossless":
		return 100
	default:
		return constants.DefaultQuality // default quality
	}
}
