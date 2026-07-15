import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

import { apiBaseUrl, getCapabilities, getHealth } from "./api/client";

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
          <p className="eyebrow">Bridge preview</p>
          <h1>File conversion workspace</h1>
          <p className="muted">
            The new web app is wired to the public TypeScript API. Image and document workflows will be rebuilt here next.
          </p>
        </div>
        <ApiStatus loading={health.isLoading} error={health.error} service={health.data?.service} version={health.data?.version} />
      </section>

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

type ApiStatusProps = {
  loading: boolean;
  error: Error | null;
  service?: string;
  version?: string;
};

function ApiStatus({ loading, error, service, version }: ApiStatusProps) {
  if (loading) {
    return <div className="status-card">Checking API</div>;
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
