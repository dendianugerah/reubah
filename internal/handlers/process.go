package handlers

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"net/http"
	"strconv"

	"github.com/dendianugerah/reubah/internal/constants"
	"github.com/dendianugerah/reubah/internal/processor"
	"github.com/dendianugerah/reubah/internal/processor/resize"
	"github.com/dendianugerah/reubah/internal/validator"
	"github.com/dendianugerah/reubah/pkg/errors"
	"golang.org/x/image/bmp"
)

func ProcessImage(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(constants.MaxFileSize); err != nil {
		errors.SendError(w, errors.New(errors.ErrInvalidFormat, "Unable to parse form", err))
		return
	}

	opts, img, err := parseRequest(r)
	if err != nil {
		errors.SendError(w, err)
		return
	}

	processedImage, err := processImage(img, opts)
	if err != nil {
		errors.SendError(w, err)
		return
	}

	sendResponse(w, processedImage, opts.OutputFormat)
}

func parseRequest(r *http.Request) (processor.ProcessOptions, image.Image, error) {
	img, err := getAndValidateImage(r)
	if err != nil {
		return processor.ProcessOptions{}, nil, err
	}

	opts, err := parseOptions(r)
	if err != nil {
		return processor.ProcessOptions{}, nil, err
	}

	return opts, img, nil
}

func getAndValidateImage(r *http.Request) (image.Image, error) {
	file, header, err := r.FormFile("image")
	if err != nil {
		return nil, errors.New(errors.ErrInvalidFormat, "No file uploaded", err)
	}
	defer file.Close()

	log.Printf("Processing file: %s, size: %d bytes", header.Filename, header.Size)

	if err := validator.ValidateMIMEType(file); err != nil {
		log.Printf("MIME type validation failed: %v", err)
		return nil, errors.New(errors.ErrInvalidMIME, "Invalid file type", err)
	}

	// Read the entire file into memory
	data, err := io.ReadAll(file)
	if err != nil {
		log.Printf("Failed to read file: %v", err)
		return nil, errors.New(errors.ErrInvalidFormat, "Failed to read file", err)
	}

	// Try different decoders based on the source format
	sourceFormat := r.FormValue("sourceFormat")
	log.Printf("Source format: %s", sourceFormat)

	if sourceFormat == "ico" {
		log.Printf("Attempting to decode ICO file")

		// Parse ICO header
		if len(data) < 6 {
			return nil, errors.New(errors.ErrInvalidFormat, "Invalid ICO file: too small", nil)
		}

		// Check ICO signature
		if data[0] != 0 || data[1] != 0 || data[2] != 1 || data[3] != 0 {
			return nil, errors.New(errors.ErrInvalidFormat, "Invalid ICO signature", nil)
		}

		// Get number of images
		numImages := int(data[4]) | int(data[5])<<8
		if numImages == 0 {
			return nil, errors.New(errors.ErrInvalidFormat, "No images in ICO file", nil)
		}

		// Find the largest image in the ICO file
		var maxSize int
		var maxWidth, maxHeight int
		var imageOffset int
		var imageSize int
		var bitsPerPixel int

		// Each directory entry is 16 bytes
		dirOffset := 6
		for i := 0; i < numImages; i++ {
			if dirOffset+16 > len(data) {
				return nil, errors.New(errors.ErrInvalidFormat, "Invalid ICO directory", nil)
			}

			width := int(data[dirOffset])
			if width == 0 {
				width = 256
			}
			height := int(data[dirOffset+1])
			if height == 0 {
				height = 256
			}
			size := width * height
			bpp := int(data[dirOffset+6]) | int(data[dirOffset+7])<<8

			if size > maxSize || (size == maxSize && bpp > bitsPerPixel) {
				maxSize = size
				maxWidth = width
				maxHeight = height
				bitsPerPixel = bpp
				imageOffset = int(data[dirOffset+12]) | int(data[dirOffset+13])<<8 | int(data[dirOffset+14])<<16 | int(data[dirOffset+15])<<24
				imageSize = int(data[dirOffset+8]) | int(data[dirOffset+9])<<8 | int(data[dirOffset+10])<<16 | int(data[dirOffset+11])<<24
			}

			dirOffset += 16
		}

		if imageOffset+imageSize > len(data) {
			return nil, errors.New(errors.ErrInvalidFormat, "Invalid image data offset", nil)
		}

		// Extract the image data
		imageData := data[imageOffset : imageOffset+imageSize]

		// Create a new RGBA image
		img := image.NewRGBA(image.Rect(0, 0, maxWidth, maxHeight))

		// Handle different bit depths
		switch bitsPerPixel {
		case 32:
			// 32-bit BGRA format
			for y := 0; y < maxHeight; y++ {
				for x := 0; x < maxWidth; x++ {
					i := (y*maxWidth + x) * 4
					if i+3 >= len(imageData) {
						continue
					}
					b := imageData[i]
					g := imageData[i+1]
					r := imageData[i+2]
					a := imageData[i+3]
					img.Set(x, maxHeight-y-1, color.RGBA{r, g, b, a})
				}
			}
		case 24:
			// 24-bit BGR format
			stride := (maxWidth*3 + 3) &^ 3 // Align to 4 bytes
			for y := 0; y < maxHeight; y++ {
				for x := 0; x < maxWidth; x++ {
					i := y*stride + x*3
					if i+2 >= len(imageData) {
						continue
					}
					b := imageData[i]
					g := imageData[i+1]
					r := imageData[i+2]
					img.Set(x, maxHeight-y-1, color.RGBA{r, g, b, 255})
				}
			}
		default:
			return nil, errors.New(errors.ErrInvalidFormat, fmt.Sprintf("Unsupported bit depth: %d", bitsPerPixel), nil)
		}

		log.Printf("Successfully decoded ICO file with dimensions %dx%d and %d bits per pixel", maxWidth, maxHeight, bitsPerPixel)
		return img, nil
	}

	// For other formats, use the standard image decoder
	img, format, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		log.Printf("Standard decode failed: %v", err)
		return nil, errors.New(errors.ErrInvalidFormat, "Invalid image file", err)
	}
	log.Printf("Successfully decoded image as %s", format)

	return img, nil
}

func decodeBMP(data []byte) (image.Image, error) {
	// Check BMP signature
	if len(data) < 2 || data[0] != 'B' || data[1] != 'M' {
		return nil, fmt.Errorf("not a BMP file")
	}

	// Create a new reader for the BMP data
	r := bytes.NewReader(data)

	// Try to decode as BMP
	img, err := bmp.Decode(r)
	if err != nil {
		return nil, err
	}

	return img, nil
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

func sendResponse(w http.ResponseWriter, img *processor.ProcessedImage, format string) {
	w.Header().Set("Content-Type", fmt.Sprintf("image/%s", format))
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=processed.%s", format))

	if err := img.Write(w); err != nil {
		log.Printf("Error writing response: %v", err)
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
