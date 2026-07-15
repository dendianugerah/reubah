import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileImage, Loader2, Upload, UploadCloud, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";

import { ApiError, apiBaseUrl, createImageConversion, getCapabilities, getHealth } from "./api/client";

const queryClient = new QueryClient();

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const routeTree = rootRoute.addChildren([indexRoute]);

const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

function RootLayout() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Reubah home">
          <span className="brand-mark">R</span>
          <span>Reubah</span>
        </Link>
        <nav className="topnav" aria-label="Primary">
          <a href={`${apiBaseUrl}/reference`}>API reference</a>
          <a href={`${apiBaseUrl}/openapi.json`}>OpenAPI</a>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

function Dashboard() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  });
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: getCapabilities,
  });

  return (
    <main className="workspace">
      <section className="panel intro-panel">
        <div>
          <p className="eyebrow">Self-hosted converter</p>
          <h1>Reubah</h1>
          <p className="muted">
            A quiet workspace for converting images and documents through your own API runtime.
          </p>
        </div>
        <ApiStatus loading={health.isLoading} error={health.error} service={health.data?.service} version={health.data?.version} />
      </section>

      <ImageConversionPanel capabilities={capabilities.data} loadingCapabilities={capabilities.isLoading} />

      <section className="grid">
        <CapabilityPanel
          title="Image conversions"
          loading={capabilities.isLoading}
          error={capabilities.error}
          inputFormats={capabilities.data?.image_conversions.input_formats}
          outputFormats={capabilities.data?.image_conversions.output_formats}
        />
        <CapabilityPanel
          title="Document conversions"
          loading={capabilities.isLoading}
          error={capabilities.error}
          inputFormats={capabilities.data?.document_conversions.input_formats}
          outputFormats={capabilities.data?.document_conversions.output_formats}
        />
      </section>
    </main>
  );
}

type ImageConversionResult = {
  url: string;
  filename: string;
  contentType: string;
  size: number;
};

function ImageConversionPanel({
  capabilities,
  loadingCapabilities,
}: {
  capabilities?: Awaited<ReturnType<typeof getCapabilities>>;
  loadingCapabilities: boolean;
}) {
  const imageCapabilities = capabilities?.image_conversions;
  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState("webp");
  const [quality, setQuality] = useState("high");
  const [resizeMode, setResizeMode] = useState("fit");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [optimize, setOptimize] = useState(false);
  const [result, setResult] = useState<ImageConversionResult | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (result) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  const conversion = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("Choose an image file first.");
      }

      return createImageConversion({
        file,
        outputFormat,
        quality,
        width,
        height,
        resizeMode,
        optimize,
      });
    },
    onSuccess: (converted) => {
      setResult((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous.url);
        }

        return {
          url: URL.createObjectURL(converted.blob),
          filename: converted.filename,
          contentType: converted.contentType,
          size: converted.blob.size,
        };
      });
    },
  });

  const dropzone = useDropzone({
    accept: {
      "image/*": [],
      "image/heic": [".heic"],
      "image/heif": [".heif"],
    },
    disabled: conversion.isPending,
    maxFiles: 1,
    multiple: false,
    onDropAccepted: ([acceptedFile]) => {
      if (!acceptedFile) {
        return;
      }

      setFile(acceptedFile);
      setResult(null);
      setDropError(null);
      conversion.reset();
    },
    onDropRejected: (rejections: FileRejection[]) => {
      const reason = rejections[0]?.errors[0]?.message;
      setDropError(reason ?? "Drop one supported image file.");
      setFile(null);
      setResult(null);
      conversion.reset();
    },
  });

  const errorMessage =
    conversion.error instanceof ApiError
      ? conversion.error.message
      : conversion.error instanceof Error
        ? conversion.error.message
        : null;

  return (
    <section className="panel conversion-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Convert</p>
          <h2>Image</h2>
        </div>
        <span className="api-pill">POST /v1/image-conversions</span>
      </div>

      <form
        className="conversion-layout"
        onSubmit={(event) => {
          event.preventDefault();
          conversion.mutate();
        }}
      >
        <div
          {...dropzone.getRootProps({
            className: [
              "upload-zone",
              dropzone.isDragActive ? "upload-zone-active" : "",
              dropzone.isDragReject || dropError ? "upload-zone-error" : "",
              file ? "upload-zone-filled" : "",
            ]
              .filter(Boolean)
              .join(" "),
          })}
        >
          <input {...dropzone.getInputProps()} />
          <div className="upload-icon" aria-hidden="true">
            {file ? <FileImage size={20} /> : <UploadCloud size={21} />}
          </div>
          <div className="upload-copy">
            <p>{dropzone.isDragActive ? "Drop image to load it" : file ? file.name : "Drop image here"}</p>
            <span>{file ? formatBytes(file.size) : "PNG, JPG, WebP, GIF, BMP, HEIC"}</span>
          </div>
          {file ? (
            <button
              className="icon-button"
              type="button"
              aria-label="Remove selected file"
              onClick={(event) => {
                event.stopPropagation();
                setFile(null);
                setResult(null);
                setDropError(null);
                conversion.reset();
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {dropError ? <p className="error-text">{dropError}</p> : null}

        <div className="control-grid">
          <Field label="Output">
            <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)}>
              {(imageCapabilities?.output_formats ?? ["webp", "jpeg", "png"]).map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quality">
            <select value={quality} onChange={(event) => setQuality(event.target.value)}>
              {(imageCapabilities?.quality_presets ?? ["low", "medium", "high", "lossless"]).map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Width">
            <input inputMode="numeric" min="1" placeholder="Auto" type="number" value={width} onChange={(event) => setWidth(event.target.value)} />
          </Field>
          <Field label="Height">
            <input inputMode="numeric" min="1" placeholder="Auto" type="number" value={height} onChange={(event) => setHeight(event.target.value)} />
          </Field>
          <Field label="Resize">
            <select value={resizeMode} onChange={(event) => setResizeMode(event.target.value)}>
              {(imageCapabilities?.resize_modes ?? ["fit", "fill", "stretch"]).map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </Field>
          <label className="checkbox-field">
            <input checked={optimize} type="checkbox" onChange={(event) => setOptimize(event.target.checked)} />
            <span>Optimize output</span>
          </label>
        </div>

        <div className="actions-row">
          <button className="primary-button" type="submit" disabled={conversion.isPending || loadingCapabilities}>
            {conversion.isPending ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
            <span>{conversion.isPending ? "Converting" : "Convert"}</span>
          </button>
          {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
        </div>
      </form>

      {result ? (
        <div className="result-row">
          <div>
            <p className="list-label">Result</p>
            <p className="result-name">{result.filename}</p>
            <p className="muted result-meta">
              {result.contentType} / {formatBytes(result.size)}
            </p>
          </div>
          <a className="secondary-button" href={result.url} download={result.filename}>
            <Download size={18} aria-hidden="true" />
            <span>Download</span>
          </a>
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

type ApiStatusProps = {
  loading: boolean;
  error: Error | null;
  service?: string;
  version?: string;
};

function ApiStatus({ loading, error, service, version }: ApiStatusProps) {
  if (loading) {
    return <div className="status-card">Checking runtime</div>;
  }

  if (error) {
    return <div className="status-card status-card-error">API unavailable</div>;
  }

  return (
    <div className="status-card">
      <span className="status-dot" />
      <span>{service}</span>
      <span className="version">v{version}</span>
    </div>
  );
}

type CapabilityPanelProps = {
  title: string;
  loading: boolean;
  error: Error | null;
  inputFormats?: string[];
  outputFormats?: string[];
};

function CapabilityPanel({ title, loading, error, inputFormats, outputFormats }: CapabilityPanelProps) {
  return (
    <article className="panel">
      <h2>{title}</h2>
      {loading ? (
        <p className="muted">Loading formats</p>
      ) : error ? (
        <p className="error-text">Could not load capabilities from the API.</p>
      ) : (
        <div className="format-grid">
          <FormatList label="Input" formats={inputFormats ?? []} />
          <FormatList label="Output" formats={outputFormats ?? []} />
        </div>
      )}
    </article>
  );
}

function FormatList({ label, formats }: { label: string; formats: string[] }) {
  return (
    <div>
      <p className="list-label">{label}</p>
      <div className="chips">
        {formats.map((format) => (
          <span key={format} className="chip">
            {format}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
