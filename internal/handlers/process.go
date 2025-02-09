package handlers

import (
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"log"
	"net/http"
	"strconv"

	"github.com/dendianugerah/reubah/internal/processor"
	"github.com/dendianugerah/reubah/internal/processor/resize"
	"github.com/dendianugerah/reubah/internal/validator"
	"github.com/dendianugerah/reubah/pkg/errors"
	"github.com/dendianugerah/reubah/internal/constants"
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
	file, _, err := r.FormFile("image")
	if err != nil {
		return nil, errors.New(errors.ErrInvalidFormat, "No file uploaded", err)
	}
	defer file.Close()

	if err := validator.ValidateMIMEType(file); err != nil {
		return nil, errors.New(errors.ErrInvalidMIME, "Invalid file type", err)
	}

	img, _, err := image.Decode(file)
	if err != nil {
		return nil, errors.New(errors.ErrInvalidFormat, "Invalid image file", err)
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
