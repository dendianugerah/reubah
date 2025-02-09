# Reubah - Universal File Converter & Image Processor

a simple web-based tool for processing images and converting documents with a simple interface

## Features

- [x] File Converter (Keep on adding more formats)
- [x] Dark Mode
- [ ] API
- [ ] Background Removal for Images
  
## Quick Start

### Using Docker
```bash
git clone https://github.com/dendianugerah/reubah.git
cd reubah
docker-compose up -d
```
or create a folder for the project and run
```bash
docker run -d --name reubah -p 8081:8081 -v doc-temp:/tmp -e PORT=8081 --restart unless-stopped ghcr.io/dendianugerah/reubah:latest
```
Access at: `http://localhost:8081`

### Local Development
Requirements:
- Go 1.22+
- LibreOffice (for document conversion)
- GCC/G++

```bash
go mod download
go run cmd/server/main.go
```

## Images

Here are some images related to the project:

![Home](static/assets/home.png)
![Document Processing](static/assets/document.png)
![Merge](static/assets/merge.png)

## Format Support & Compatibility

> **Matrix Guide:**
> - Find your source format in the left column
> - Follow the row to find available output formats
> - ✅ = Supported conversion
> - `-` = Same format (no conversion needed)

### Image Conversion Matrix

| From ➡️ To ⬇️ | JPG/JPEG | PNG | WebP | GIF | BMP | HEIC/HEIF | PDF |
|--------------|:---:|:---:|:----:|:---:|:---:|:---:| :---: |
| **JPG/JPEG** | -   | ✅  | ✅   | ✅  | ✅ | ❌ | ✅   |
| **PNG**      | ✅  | -   | ✅   | ✅  | ✅  | ❌ | ✅  |
| **WebP**     | ✅  | ✅  | -    | ✅  | ✅  | ❌ | ✅  |
| **GIF**      | ✅  | ✅  | ✅   | -   | ✅  | ❌ | ✅  |
| **BMP**      | ✅  | ✅  | ✅   | ✅  | -   | ❌| ✅   |
| **HEIC/HEIF**| ✅  | ✅  | ✅   | ✅  | ✅  | - | ✅   |

### Document Conversion Matrix

| From ➡️ To ⬇️ | PDF | DOCX | DOC | ODT | RTF | TXT |
|--------------|:---:|:----:|:---:|:---:|:---:|:---:|
| **PDF** (from PDF currently still bad)     | -   | ✅   | ✅  | ❌  | ❌  | ❌  |
| **DOCX**     | ✅  | -    | ✅  | ✅  | ✅  | ✅  |
| **DOC**      | ✅  | ✅   | -   | ✅  | ✅  | ✅  |
| **ODT**      | ✅  | ✅   | ✅  | -   | ✅  | ✅  |
| **RTF**      | ✅  | ✅   | ✅  | ✅  | -   | ✅  |
| **TXT**      | ✅  | ✅   | ✅  | ✅  | ✅  | -   |

### Additional Image Features

| Format | Background Removal (Soon) | Optimization | Batch Processing |
|--------|:-----------------:|:------------:|:---------------:|
| JPG/JPEG | ❌              | ✅           | ✅              |
| PNG    | ❌                | ❌           | ✅              |
| WebP   | ❌                | ❌           | ✅              |
| GIF    | ❌                | ❌           | ✅              |
| BMP    | ❌                | ❌           | ✅              |
| HEIC/HEIF | ❌             | ❌           | ✅              |

## Notes

- Isolated processing environment
- No file storage - immediate delivery
- Automatic cleanup
- Input validation

## License
This project is licensed under the [MIT License](LICENSE).