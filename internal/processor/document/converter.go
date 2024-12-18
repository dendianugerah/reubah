package document

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// SupportedFormats defines the supported input and output formats
var SupportedFormats = map[string][]string{
	"pdf":  {"doc", "docx", "txt", "odt", "rtf"},
	"doc":  {"pdf", "docx", "txt", "odt", "rtf"},
	"docx": {"pdf", "doc", "txt", "odt", "rtf"},
	"odt":  {"pdf", "doc", "docx", "txt", "rtf"},
	"rtf":  {"pdf", "doc", "docx", "txt", "odt"},
	"txt":  {"pdf", "doc", "docx", "odt", "rtf"},
}

// ConversionOptions contains options for document conversion
type ConversionOptions struct {
	InputFormat  string
	OutputFormat string
	Quality      int
}

// ConvertDocument converts a document from one format to another using LibreOffice
func ConvertDocument(input io.Reader, inputFormat, outputFormat string) ([]byte, error) {
	// Create temporary directory
	tempDir, err := os.MkdirTemp("", "doc_conversion_*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Create temporary input file
	inputFile := filepath.Join(tempDir, "input."+inputFormat)
	f, err := os.Create(inputFile)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}

	// Copy input to temp file
	if _, err := io.Copy(f, input); err != nil {
		f.Close()
		return nil, fmt.Errorf("failed to write temp file: %w", err)
	}
	f.Close()

	var cmd *exec.Cmd
	if inputFormat == "pdf" {
		cmdStr := "libreoffice --headless --infilter='writer_pdf_import' --convert-to %s --outdir %s %q"
		cmd = exec.Command(
			"bash",
			"-c",
			fmt.Sprintf(cmdStr, outputFormat, tempDir, inputFile),
		)
	} else {
		cmd = exec.Command(
			"soffice",
			"--headless",
			"--convert-to", outputFormat,
			"--outdir", tempDir,
			inputFile,
		)
	}

	// Execute conversion
	if output, err := cmd.CombinedOutput(); err != nil {
		fmt.Printf("LibreOffice error: %s\n", string(output))
		return nil, fmt.Errorf("conversion failed: %w", err)
	}

	// Find the converted file
	files, err := os.ReadDir(tempDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	// Look for the converted file
	var outputPath string
	for _, file := range files {
		if strings.HasSuffix(file.Name(), "."+outputFormat) {
			outputPath = filepath.Join(tempDir, file.Name())
			break
		}
	}

	if outputPath == "" {
		return nil, fmt.Errorf("converted file not found in directory")
	}

	convertedContent, err := os.ReadFile(outputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read converted file: %w", err)
	}

	return convertedContent, nil
}

func IsFormatSupported(inputFormat, outputFormat string) bool {
	supportedOutputs, exists := SupportedFormats[inputFormat]
	if !exists {
		return false
	}

	for _, format := range supportedOutputs {
		if format == outputFormat {
			return true
		}
	}
	return false
}
