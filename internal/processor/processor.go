package processor

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/gif"
	_ "image/gif"
	"image/jpeg"
	_ "image/jpeg"
	"image/png"
	_ "image/png"
	"io"
	"math"
	"os"
	"path/filepath"

	"github.com/MaestroError/go-libheif"
	"github.com/chai2010/webp"
	"github.com/dendianugerah/reubah/internal/processor/background"
	"github.com/dendianugerah/reubah/internal/processor/optimize"
	"github.com/dendianugerah/reubah/internal/processor/resize"
	"github.com/disintegration/imaging"
	"github.com/jung-kurt/gofpdf"
	"golang.org/x/image/bmp"
)

// DecodeHeic decodes HEIC/HEIF images
func DecodeHeic(r io.Reader) (image.Image, error) {
	// Create temporary file for the HEIC data
	tmpDir := os.TempDir()
	tmpHEIC := filepath.Join(tmpDir, "temp_input.heic")
	defer os.Remove(tmpHEIC)

	// Create temporary file
	f, err := os.Create(tmpHEIC)
	if err != nil {
		return nil, fmt.Errorf("failed to create temporary HEIC file: %w", err)
	}
	defer f.Close()

	// Copy the reader data to the temp file
	if _, err := io.Copy(f, r); err != nil {
		return nil, fmt.Errorf("failed to write HEIC data: %w", err)
	}

	// Create temporary file for JPEG output
	tmpJPG := filepath.Join(tmpDir, "temp_output.jpg")
	defer os.Remove(tmpJPG)

	// Convert HEIC to JPEG
	if err := libheif.HeifToJpeg(tmpHEIC, tmpJPG, 100); err != nil {
		return nil, fmt.Errorf("failed to convert HEIC to JPEG: %w", err)
	}

	// Read the JPEG file
	jpegData, err := os.ReadFile(tmpJPG)
	if err != nil {
		return nil, fmt.Errorf("failed to read converted JPEG: %w", err)
	}

	// Decode the JPEG data
	return jpeg.Decode(bytes.NewReader(jpegData))
}

// DecodeIco decodes ICO files and returns the highest quality icon
func DecodeIco(r io.Reader) (image.Image, error) {
	fmt.Println("Starting ICO decode...")

	// Read the entire input
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}

	// Try decoding as PNG first (many ICO files contain PNG data)
	img, err := png.Decode(bytes.NewReader(data))
	if err == nil {
		fmt.Println("Successfully decoded as PNG")
		return img, nil
	}

	// If PNG decode fails, try BMP decode
	img, err = bmp.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode ICO file: %w", err)
	}

	// Convert to NRGBA
	bounds := img.Bounds()
	nrgba := image.NewNRGBA(bounds)
	draw.Draw(nrgba, bounds, image.NewUniform(color.Transparent), image.Point{}, draw.Src)
	draw.Draw(nrgba, bounds, img, bounds.Min, draw.Over)

	fmt.Printf("Decoded image size: %dx%d\n", bounds.Dx(), bounds.Dy())
	return nrgba, nil
}

func init() {
	// Register HEIC format decoder
	image.RegisterFormat("heic", "ftypheic", DecodeHeic, nil)
	image.RegisterFormat("heif", "ftypheif", DecodeHeic, nil)
	image.RegisterFormat("heic", "ftypmif1", DecodeHeic, nil) // For HEIF images from iOS
	image.RegisterFormat("heic", "ftypmsf1", DecodeHeic, nil) // For HEIF images from iOS
	// Register ICO format decoder
	image.RegisterFormat("ico", "\x00\x00\x01\x00", DecodeIco, nil)
}

// ProcessOptions defines the options for image processing
type ProcessOptions struct {
	Width            int
	Height           int
	ResizeMode       resize.ResizeMode
	OutputFormat     string
	Quality          int
	RemoveBackground bool
	OptimizeImage    bool
}

type Config struct {
	DefaultQuality int
	DefaultFormat  string
}

type ImageProcessor struct {
	config Config
}

func NewImageProcessor() *ImageProcessor {
	return &ImageProcessor{
		config: Config{
			DefaultQuality: 85,
			DefaultFormat:  "jpeg",
		},
	}
}

func (p *ImageProcessor) ProcessImageData(img image.Image, opts ProcessOptions) (*ProcessedImage, error) {
	// Set default format and validate
	if opts.OutputFormat == "" {
		opts.OutputFormat = p.config.DefaultFormat
	}
	if !isValidFormat(opts.OutputFormat) {
		return nil, fmt.Errorf("unsupported format: %s", opts.OutputFormat)
	}

	var err error
	// Remove background if requested
	if opts.RemoveBackground {
		img, err = background.RemoveBackground(img)
		if err != nil {
			return nil, fmt.Errorf("failed to remove background: %w", err)
		}
	}

	// Resize if needed
	if opts.Width > 0 || opts.Height > 0 {
		img, err = resize.Resize(img, resize.ResizeOptions{
			Width:  opts.Width,
			Height: opts.Height,
			Mode:   opts.ResizeMode,
			Filter: imaging.Lanczos,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to resize image: %w", err)
		}
	}

	// Add optimization step
	if opts.OptimizeImage {
		optimizeOpts := optimize.GetOptionsForQuality(opts.OutputFormat,
			optimize.QualityLevel(getQualityLevel(opts.Quality)))
		var buf bytes.Buffer
		if err := optimize.Optimize(&buf, img, opts.OutputFormat, optimizeOpts); err != nil {
			return nil, fmt.Errorf("failed to optimize image: %w", err)
		}
		// Decode the optimized image
		img, _, err = image.Decode(&buf)
		if err != nil {
			return nil, fmt.Errorf("failed to decode optimized image: %w", err)
		}
	}

	return &ProcessedImage{
		Image:   img,
		Format:  opts.OutputFormat,
		Quality: opts.Quality,
	}, nil
}

type ProcessedImage struct {
	Image   image.Image
	Format  string
	Quality int
}

func (pi *ProcessedImage) Write(w io.Writer) error {
	switch pi.Format {
	case "jpeg", "jpg":
		// Create a new white background image
		bounds := pi.Image.Bounds()
		bgImage := image.NewRGBA(bounds)

		// Fill with white
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			for x := bounds.Min.X; x < bounds.Max.X; x++ {
				bgImage.Set(x, y, color.White)
			}
		}

		// Draw the original image over the white background
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			for x := bounds.Min.X; x < bounds.Max.X; x++ {
				srcColor := pi.Image.At(x, y)
				if _, _, _, a := srcColor.RGBA(); a > 0 {
					bgImage.Set(x, y, srcColor)
				}
			}
		}

		return jpeg.Encode(w, bgImage, &jpeg.Options{Quality: pi.Quality})
	case "png":
		return png.Encode(w, pi.Image)
	case "gif":
		return gif.Encode(w, pi.Image, &gif.Options{
			NumColors: 256,
		})
	case "bmp":
		return bmp.Encode(w, pi.Image)
	case "webp":
		return webp.Encode(w, pi.Image, &webp.Options{
			Lossless: pi.Quality == 100,
			Quality:  float32(pi.Quality),
		})
	default:
		return fmt.Errorf("unsupported format: %s", pi.Format)
	}
}

func isValidFormat(format string) bool {
	validFormats := map[string]bool{
		"jpeg": true,
		"jpg":  true,
		"png":  true,
		"webp": true,
		"gif":  true,
		"bmp":  true,
		"heic": true,
		"heif": true,
		"pdf":  true,
		"ico":  true,
	}
	return validFormats[format]
}

func getQualityLevel(quality int) string {
	switch {
	case quality <= 60:
		return "low"
	case quality <= 75:
		return "medium"
	case quality <= 90:
		return "high"
	default:
		return "lossless"
	}
}

func encodeHEIC(w io.Writer, img image.Image, quality int) error {
	// Create temporary files for the conversion process
	tmpDir := os.TempDir()
	tmpPNG := filepath.Join(tmpDir, "temp.png")
	tmpHEIC := filepath.Join(tmpDir, "temp.heic")

	// Clean up temporary files when done
	defer os.Remove(tmpPNG)
	defer os.Remove(tmpHEIC)

	// Save image as PNG first
	pngFile, err := os.Create(tmpPNG)
	if err != nil {
		return fmt.Errorf("failed to create temporary PNG file: %w", err)
	}
	if err := png.Encode(pngFile, img); err != nil {
		pngFile.Close()
		return fmt.Errorf("failed to encode image to PNG: %w", err)
	}
	pngFile.Close()

	// Convert PNG to HEIC
	if err := libheif.ImageToHeif(tmpPNG, tmpHEIC); err != nil {
		return fmt.Errorf("failed to convert to HEIC: %w", err)
	}

	// Read the HEIC file and write to the output
	heicData, err := os.ReadFile(tmpHEIC)
	if err != nil {
		return fmt.Errorf("failed to read HEIC file: %w", err)
	}

	if _, err := w.Write(heicData); err != nil {
		return fmt.Errorf("failed to write HEIC data: %w", err)
	}

	return nil
}

func convertToPDF(w io.Writer, img image.Image, quality int) error {
	// Create a new PDF
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Convert image to JPEG bytes for embedding
	var jpegBuf bytes.Buffer
	if err := jpeg.Encode(&jpegBuf, img, &jpeg.Options{Quality: quality}); err != nil {
		return fmt.Errorf("failed to encode image for PDF: %w", err)
	}

	// Get image dimensions
	bounds := img.Bounds()
	imgWidth := float64(bounds.Dx())
	imgHeight := float64(bounds.Dy())

	// Calculate scaling to fit on A4 page (210x297mm)
	pageWidth := 210.0
	pageHeight := 297.0
	margin := 10.0
	maxWidth := pageWidth - (2 * margin)
	maxHeight := pageHeight - (2 * margin)

	// Calculate scale to fit within margins while maintaining aspect ratio
	scale := math.Min(maxWidth/imgWidth, maxHeight/imgHeight)
	finalWidth := imgWidth * scale
	finalHeight := imgHeight * scale

	// Center the image on the page
	x := (pageWidth - finalWidth) / 2
	y := (pageHeight - finalHeight) / 2

	// Add the image to PDF
	pdf.RegisterImageOptionsReader("image", gofpdf.ImageOptions{ImageType: "JPEG"}, &jpegBuf)
	pdf.Image("image", x, y, finalWidth, finalHeight, false, "", 0, "")

	// Write PDF to output
	return pdf.Output(w)
}
