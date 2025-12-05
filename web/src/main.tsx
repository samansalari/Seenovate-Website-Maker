import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  createRouter,
  RouterProvider,
  createRootRoute,
  createRoute,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";

// Import styles
import "@/styles/globals.css";

// Import components
import Layout from "@/app/layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { showError } from "@/lib/toast";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LoginPage from "./auth/LoginPage";
import RegisterPage from "./auth/RegisterPage";
import { initializeWebClient } from "@/api/index";

// Import page components directly (not pre-built routes)
import HomePage from "@/pages/home";
import ChatPage from "@/pages/chat";
import SettingsPage from "@/pages/settings";
import { ProviderSettingsPage } from "@/components/settings/ProviderSettingsPage";
import AppDetailsPage from "@/pages/app-details";
import HubPage from "@/pages/hub";
import LibraryPage from "@/pages/library";

// Initialize client
initializeWebClient();

// Query Client setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.showErrorToast) showError(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.showErrorToast) showError(error);
    },
  }),
});

// Auth wrapper for protected routes
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login", search: { redirect: location.href } });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : null;
}

// Root layout with providers
const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

// Public routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

// Protected routes wrapper
const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedRoute,
});

// Define protected routes using page components
const homeRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/",
  component: HomePage,
});

const hubRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/hub",
  component: HubPage,
});

const libraryRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/library",
  component: LibraryPage,
});

const chatRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/chat/$chatId",
  component: ChatPage,
});

const appDetailsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/app/$appId",
  component: AppDetailsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/settings",
  component: SettingsPage,
});

const providerSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/providers/$provider",
  component: function ProviderSettingsRouteComponent() {
    const { provider } = providerSettingsRoute.useParams();
    return <ProviderSettingsPage provider={provider} />;
  },
});

// Build route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  protectedLayoutRoute.addChildren([
    homeRoute,
    hubRoute,
    libraryRoute,
    chatRoute,
    appDetailsRoute,
    settingsRoute.addChildren([providerSettingsRoute]),
  ]),
]);

const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">Page not found</p>
    </div>
  ),
  defaultErrorComponent: ErrorBoundary,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// App entry component
function App() {
  return <RouterProvider router={router} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>
);

