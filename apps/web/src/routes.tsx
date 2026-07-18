import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Check,
  Download,
  FileImage,
  FileText,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Server,
  UploadCloud,
  X,
} from "lucide-react";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
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

const stillSpring = {
  type: "spring",
  bounce: 0,
  duration: 0.38,
} as const;

const momentumSpring = {
  type: "spring",
  bounce: 0.22,
  duration: 0.42,
} as const;

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation}>
        <RouterProvider router={router} />
      </LazyMotion>
    </QueryClientProvider>
  );
}

function RootLayout() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Reubah home">
          <span className="brand-mark">R</span>
          <span className="brand-copy">
            <strong>Reubah</strong>
            <span>Self-hosted converter</span>
          </span>
        </Link>
        <nav className="topnav" aria-label="Primary">
          <a href={`${apiBaseUrl}/reference`}>
            <span>API reference</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
          <a href={`${apiBaseUrl}/openapi.json`}>
            <span>OpenAPI</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
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
      <section className="workspace-header">
        <div>
          <p className="eyebrow">
            <Server size={15} aria-hidden="true" />
            Local API workspace
          </p>
          <h1>Image conversion</h1>
          <p className="lede">Drop an image, tune the output, and download the converted file from your own runtime.</p>
        </div>
        <ApiStatus loading={health.isLoading} error={health.error} service={health.data?.service} version={health.data?.version} />
      </section>

      <ImageConversionPanel capabilities={capabilities.data} loadingCapabilities={capabilities.isLoading} />

      <CapabilitySection loading={capabilities.isLoading} error={capabilities.error} capabilities={capabilities.data} />
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
  const reduceMotion = useReducedMotion();
  const imageCapabilities = capabilities?.image_conversions;
  const outputFormats = useMemo(() => imageCapabilities?.output_formats ?? ["webp", "jpeg", "png"], [imageCapabilities]);
  const qualityPresets = useMemo(
    () => imageCapabilities?.quality_presets ?? ["low", "medium", "high", "lossless"],
    [imageCapabilities],
  );
  const resizeModes = useMemo(() => imageCapabilities?.resize_modes ?? ["fit", "fill", "stretch"], [imageCapabilities]);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [outputFormat, setOutputFormat] = useState("webp");
  const [quality, setQuality] = useState("high");
  const [resizeMode, setResizeMode] = useState("fit");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [optimize, setOptimize] = useState(false);
  const [result, setResult] = useState<ImageConversionResult | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

  useEffect(() => {
    if (!outputFormats.includes(outputFormat) && outputFormats[0]) {
      setOutputFormat(outputFormats[0]);
    }
  }, [outputFormat, outputFormats]);

  useEffect(() => {
    if (!qualityPresets.includes(quality) && qualityPresets[0]) {
      setQuality(qualityPresets[0]);
    }
  }, [quality, qualityPresets]);

  useEffect(() => {
    if (!resizeModes.includes(resizeMode) && resizeModes[0]) {
      setResizeMode(resizeModes[0]);
    }
  }, [resizeMode, resizeModes]);

  useEffect(() => {
    setPreviewFailed(false);

    if (!file || !canPreviewImage(file)) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file]);

  useEffect(() => {
    return () => {
      if (result) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setDropError(null);
    conversion.reset();
  };

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
  const canConvert = Boolean(file) && !conversion.isPending && !loadingCapabilities;
  const dropState = dropzone.isDragActive ? "drop-active" : file ? "drop-filled" : "drop-empty";

  return (
    <section className="converter" aria-labelledby="image-conversion-title">
      <div className="converter-title">
        <div>
          <p className="eyebrow">
            <ImageIcon size={15} aria-hidden="true" />
            Convert
          </p>
          <h2 id="image-conversion-title">Make the output match the job.</h2>
        </div>
        <span className="api-pill">POST /v1/image-conversions</span>
      </div>

      <form
        className="converter-grid"
        onSubmit={(event) => {
          event.preventDefault();
          conversion.mutate();
        }}
      >
        <div className="drop-column">
          <m.div
            {...dropzone.getRootProps({
              className: cn(
                "drop-zone",
                dropState,
                (dropzone.isDragReject || dropError) && "drop-error",
                conversion.isPending && "drop-busy",
              ),
            })}
            animate={
              reduceMotion
                ? undefined
                : {
                    scale: dropzone.isDragActive ? 1.01 : 1,
                    y: dropzone.isDragActive ? -4 : 0,
                  }
            }
            transition={dropzone.isDragActive ? momentumSpring : stillSpring}
            whileTap={reduceMotion ? undefined : { scale: 0.99 }}
          >
            <input {...dropzone.getInputProps()} />

            <div className="drop-visual" aria-hidden="true">
              <AnimatePresence mode="wait" initial={false}>
                {previewUrl && !previewFailed ? (
                  <m.img
                    key={previewUrl}
                    src={previewUrl}
                    alt=""
                    className="preview-image"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    transition={stillSpring}
                    onError={() => setPreviewFailed(true)}
                  />
                ) : (
                  <m.div
                    key="drop-icon"
                    className="drop-glyph"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                    transition={stillSpring}
                  >
                    {file ? <FileImage size={42} /> : <UploadCloud size={46} />}
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <div className="drop-copy">
              <span>{dropzone.isDragActive ? "Release to load" : file ? "Ready to convert" : "Drop image here"}</span>
              <strong>{file ? file.name : "Choose or drag a file"}</strong>
              <p>{file ? fileTypeLabel(file) : "PNG, JPG, WebP, GIF, BMP, HEIC, HEIF"}</p>
            </div>

            {file ? (
              <m.button
                className="icon-button clear-file"
                type="button"
                aria-label="Remove selected file"
                whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                onClick={(event) => {
                  event.stopPropagation();
                  clearFile();
                }}
              >
                <X size={17} aria-hidden="true" />
              </m.button>
            ) : null}
          </m.div>

          <AnimatePresence initial={false}>
            {dropError ? (
              <m.p
                className="inline-alert"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={stillSpring}
              >
                {dropError}
              </m.p>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="controls-panel">
          <SegmentedControl label="Output" options={outputFormats} value={outputFormat} onChange={setOutputFormat} />
          <SegmentedControl label="Quality" options={qualityPresets} value={quality} onChange={setQuality} />
          <SegmentedControl label="Resize" options={resizeModes} value={resizeMode} onChange={setResizeMode} />

          <div className="dimension-grid">
            <NumberField label="Width" value={width} onChange={setWidth} />
            <NumberField label="Height" value={height} onChange={setHeight} />
          </div>

          <Toggle checked={optimize} label="Optimize" onChange={setOptimize} />

          <div className="action-panel">
            <m.button
              className="primary-button"
              type="submit"
              disabled={!canConvert}
              whileTap={reduceMotion || !canConvert ? undefined : { scale: 0.985 }}
            >
              {conversion.isPending ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
              <span>{conversion.isPending ? "Converting" : file ? `Convert to ${outputFormat.toUpperCase()}` : "Add an image"}</span>
            </m.button>

            <AnimatePresence mode="wait" initial={false}>
              {errorMessage ? (
                <m.p
                  key="error"
                  className="inline-alert"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={stillSpring}
                >
                  {errorMessage}
                </m.p>
              ) : result ? (
                <m.div
                  key={result.url}
                  className="result-panel"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
                  transition={stillSpring}
                >
                  <div className="result-copy">
                    <span>Converted</span>
                    <strong>{result.filename}</strong>
                    <p>
                      {result.contentType} / {formatBytes(result.size)}
                    </p>
                  </div>
                  <m.a
                    className="download-button"
                    href={result.url}
                    download={result.filename}
                    whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  >
                    <Download size={18} aria-hidden="true" />
                    <span>Download</span>
                  </m.a>
                </m.div>
              ) : (
                <m.div
                  key="empty"
                  className="result-empty"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={stillSpring}
                >
                  <RotateCcw size={17} aria-hidden="true" />
                  <span>Result appears after conversion.</span>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </form>
    </section>
  );
}

function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <fieldset className="control-group">
      <legend>{label}</legend>
      <div className="segmented-control" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const active = option === value;

          return (
            <m.button
              key={option}
              className={cn("segment-button", active && "segment-button-active")}
              type="button"
              role="radio"
              aria-checked={active}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              onClick={() => onChange(option)}
            >
              {formatOptionLabel(option)}
            </m.button>
          );
        })}
      </div>
    </fieldset>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input inputMode="numeric" min="1" placeholder="Auto" type="number" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <m.button
      className={cn("switch-row", checked && "switch-row-active")}
      type="button"
      role="switch"
      aria-checked={checked}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-track">
        <m.span
          className="switch-thumb"
          animate={{ x: checked ? 18 : 0 }}
          transition={reduceMotion ? { duration: 0 } : stillSpring}
        />
      </span>
      <span>{label}</span>
    </m.button>
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
    return (
      <div className="status-pill">
        <Loader2 className="spin" size={15} aria-hidden="true" />
        <span>Checking API</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-pill status-pill-error">
        <span className="status-dot" />
        <span>API unavailable</span>
      </div>
    );
  }

  return (
    <div className="status-pill">
      <span className="status-dot" />
      <span>{service}</span>
      <span className="version">v{version}</span>
    </div>
  );
}

function CapabilitySection({
  loading,
  error,
  capabilities,
}: {
  loading: boolean;
  error: Error | null;
  capabilities?: Awaited<ReturnType<typeof getCapabilities>>;
}) {
  return (
    <section className="capability-section" aria-labelledby="formats-title">
      <div className="capability-heading">
        <div>
          <p className="eyebrow">
            <Server size={15} aria-hidden="true" />
            Runtime
          </p>
          <h2 id="formats-title">Supported formats</h2>
        </div>
        <a className="text-link" href={`${apiBaseUrl}/reference`}>
          <span>View docs</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>

      <div className="capability-grid">
        <CapabilityPanel
          icon={<ImageIcon size={18} aria-hidden="true" />}
          title="Images"
          loading={loading}
          error={error}
          inputFormats={capabilities?.image_conversions.input_formats}
          outputFormats={capabilities?.image_conversions.output_formats}
        />
        <CapabilityPanel
          icon={<FileText size={18} aria-hidden="true" />}
          title="Documents"
          loading={loading}
          error={error}
          inputFormats={capabilities?.document_conversions.input_formats}
          outputFormats={capabilities?.document_conversions.output_formats}
        />
      </div>
    </section>
  );
}

type CapabilityPanelProps = {
  icon: React.ReactNode;
  title: string;
  loading: boolean;
  error: Error | null;
  inputFormats?: string[];
  outputFormats?: string[];
};

function CapabilityPanel({ icon, title, loading, error, inputFormats, outputFormats }: CapabilityPanelProps) {
  return (
    <article className="capability-card">
      <div className="capability-card-heading">
        <span className="capability-icon">{icon}</span>
        <h3>{title}</h3>
      </div>
      {loading ? (
        <p className="supporting-text">Loading formats</p>
      ) : error ? (
        <p className="inline-alert">Could not load API capabilities.</p>
      ) : (
        <div className="format-columns">
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

function canPreviewImage(file: File) {
  const normalizedType = file.type.toLowerCase();
  const normalizedName = file.name.toLowerCase();

  return (
    normalizedType.startsWith("image/") &&
    normalizedType !== "image/heic" &&
    normalizedType !== "image/heif" &&
    !normalizedName.endsWith(".heic") &&
    !normalizedName.endsWith(".heif")
  );
}

function fileTypeLabel(file: File) {
  const type = file.type || "image";
  return `${type} / ${formatBytes(file.size)}`;
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

function formatOptionLabel(value: string) {
  if (value.length <= 4) {
    return value.toUpperCase();
  }

  return value[0]?.toUpperCase() + value.slice(1);
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
