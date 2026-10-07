import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import appCss from "../styles.css?url";
import { AppProviders, useApp } from "@/i18n/AppProviders";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { EmptyState, LoadingState, OfflineState } from "@/components/ui-ez/States";
import { ApiError } from "@/lib/api/client";
import { AuthProvider, ROUTE_PERMISSIONS, useAuth } from "@/lib/auth";
import { RealtimeProvider } from "@/lib/realtime";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">Page not found</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Yalla Vendor — لوحة إدارة المطاعم والمتاجر" },
      {
        name: "description",
        content:
          "Yalla Super App vendor panel for restaurants & stores: orders, menu, wallet, performance.",
      },
      { name: "author", content: "Yalla" },
      { property: "og:title", content: "Yalla Vendor — لوحة إدارة المطاعم والمتاجر" },
      {
        property: "og:description",
        content:
          "Yalla Super App vendor panel for restaurants & stores: orders, menu, wallet, performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Yalla Vendor — لوحة إدارة المطاعم والمتاجر" },
      {
        name: "twitter:description",
        content:
          "Yalla Super App vendor panel for restaurants & stores: orders, menu, wallet, performance.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/616162e1-558a-443d-9246-d12385aa164c",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/616162e1-558a-443d-9246-d12385aa164c",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint to avoid a dark→light flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("ez.theme")==="light")document.documentElement.classList.remove("dark")}catch(e){}`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: true,
            // Don't hammer the server on 4xx (403/404/422 are final answers).
            retry: (count, error) =>
              !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
              count < 2,
          },
        },
      }),
  );

  return (
    <AppProviders>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RealtimeProvider>
            <AuthGate />
            <Toaster position="top-center" richColors />
          </RealtimeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppProviders>
  );
}

/** Route guard: /login is public, everything else needs a vendor session. */
function AuthGate() {
  const { status, can, refreshMe } = useAuth();
  const { t } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === "/login";

  useEffect(() => {
    if (status === "anonymous" && !isLogin) {
      navigate({ to: "/login", search: { redirect: location.href } as never, replace: true });
    } else if (status === "authenticated" && isLogin) {
      navigate({ to: "/", replace: true });
    }
  }, [status, isLogin, navigate, location.href]);

  if (isLogin) return status === "authenticated" ? null : <Outlet />;

  if (status === "offline") {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-4">
        <div className="w-full max-w-md">
          <OfflineState
            title={t("states.offlineTitle")}
            description={t("states.offlineDesc")}
            retryLabel={t("states.retry")}
            onRetry={() => void refreshMe().catch(() => {})}
          />
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-4">
        <div className="w-full max-w-md">
          <LoadingState label={t("states.loadingLabel")} />
        </div>
      </div>
    );
  }

  const required = ROUTE_PERMISSIONS[location.pathname];
  return (
    <AppShell>
      {required && !can(required) ? (
        <EmptyState
          icon={<ShieldAlert className="h-7 w-7" />}
          tone="warning"
          title={t("auth.noPermissionTitle")}
          description={t("auth.noPermissionDesc")}
        />
      ) : (
        <Outlet />
      )}
    </AppShell>
  );
}
