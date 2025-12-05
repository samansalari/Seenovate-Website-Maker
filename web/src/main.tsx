import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  createRouter,
  RouterProvider,
  createRootRoute,
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
import { PostHogProvider } from "posthog-js/react";
import posthog from "posthog-js";

// Import components/routes
// We reuse existing routes but wrap them with auth check
import Layout from "@/app/layout";
import { homeRoute } from "@/routes/home";
import { chatRoute } from "@/routes/chat";
import { settingsRoute } from "@/routes/settings";
import { providerSettingsRoute } from "@/routes/settings/providers/$provider";
import { appDetailsRoute } from "@/routes/app-details";
import { hubRoute } from "@/routes/hub";
import { libraryRoute } from "@/routes/library";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { showError } from "@/lib/toast";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LoginPage from "./auth/LoginPage";
import RegisterPage from "./auth/RegisterPage";
import { initializeWebClient } from "@/api/index";

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
const loginRoute = createRootRoute({
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRootRoute({
  path: "/register",
  component: RegisterPage,
});

// Protected routes wrapper
const protectedLayoutRoute = createRootRoute({
  id: "protected",
  component: ProtectedRoute,
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
  defaultNotFoundComponent: () => null, // Handle 404s
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
        <PostHogProvider client={posthog}>
          <App />
        </PostHogProvider>
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>
);

