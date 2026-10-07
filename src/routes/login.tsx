import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, LogIn, Moon, Sun } from "lucide-react";
import { useApp } from "@/i18n/AppProviders";
import { LOCALES, type Locale } from "@/i18n/translations";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/client";
import { errorMessage } from "@/components/ui-ez/QueryState";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — Yalla Vendor" },
      { name: "description", content: "سجّل الدخول إلى لوحة إدارة المطعم" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t, locale, setLocale, theme, toggleTheme } = useApp();
  const { login } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      const target =
        redirect && redirect.startsWith("/") && !redirect.startsWith("/login") ? redirect : "/";
      navigate({ to: target, replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(err.errors);
      setError(errorMessage(err, t("states.offlineDesc")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      {/* Language + theme */}
      <div className="absolute top-4 flex items-center gap-2 end-4">
        <div className="flex items-center gap-1 rounded-lg border border-input bg-card p-1">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLocale(l.code as Locale)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition",
                locale === l.code
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="grid h-9 w-9 place-items-center rounded-lg border border-input bg-card hover:bg-accent"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo} alt="Yalla" className="h-16 w-16 object-contain" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{t("app.name")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>

        <form onSubmit={onSubmit} className="ez-card ez-shadow space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">{t("login.title")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("login.subtitle")}</p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {t("login.identifier")}
            </span>
            <input
              dir="ltr"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="owner@restaurant.ez / 07XXXXXXXXX"
              className={cn(
                "h-11 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none transition focus:border-ring focus:bg-background",
                fieldErrors.login && "border-destructive",
              )}
            />
            {fieldErrors.login?.[0] && (
              <span className="mt-1 block text-xs text-destructive">{fieldErrors.login[0]}</span>
            )}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {t("login.password")}
            </span>
            <div className="relative">
              <input
                dir="ltr"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "h-11 w-full rounded-lg border border-input bg-secondary/40 px-3 pe-10 text-sm outline-none transition focus:border-ring focus:bg-background",
                  fieldErrors.password && "border-destructive",
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent end-1.5"
                aria-label="Show password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password?.[0] && (
              <span className="mt-1 block text-xs text-destructive">{fieldErrors.password[0]}</span>
            )}
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {submitting ? t("login.signingIn") : t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
