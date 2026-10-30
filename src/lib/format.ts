import type { Locale } from "@/i18n/translations";
import type { Translations } from "@/lib/api/types";
import { DEFAULT_CURRENCY } from "@/lib/api/config";

/** Picks the active-locale string from a { ar, en, ku } object, falling back to any non-empty value. */
export function pickT(obj: Translations | null | undefined, locale: Locale, fallback = ""): string {
  if (!obj) return fallback;
  return obj[locale] || obj.ar || obj.en || obj.ku || fallback;
}

/** Amounts are plain numbers from the API — keep up to 2 decimals. */
export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

/** Currency label from a currency code (IQD → localized "د.ع", USD → "$"). */
export function currencyLabel(
  currency: string | null | undefined,
  t: (k: string) => string,
): string {
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  if (code === "IQD") return t("common.currency");
  if (code === "USD") return "$";
  return code;
}

export function money(
  n: number | null | undefined,
  currency: string | null | undefined,
  t: (k: string) => string,
) {
  return `${formatMoney(n)} ${currencyLabel(currency, t)}`;
}

/** change_pct / change_pts: null means "no data to compare" → "—". */
export function formatChange(v: number | null | undefined, unit = "%"): string {
  if (v === null || v === undefined) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${Number(v.toFixed(1))}${unit}`;
}

export function formatNumber(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return "—";
  return String(Number(v.toFixed(digits)));
}

const DATE_LOCALE: Record<Locale, string> = { ar: "ar-IQ", en: "en-GB", ku: "ckb-IQ" };

export function formatDate(
  iso: string | null | undefined,
  locale: Locale,
  withTime = false,
): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleString(DATE_LOCALE[locale], {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  } catch {
    return d.toLocaleString("en-GB");
  }
}

export function formatTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleTimeString(DATE_LOCALE[locale], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
}

/** Chart X label for a series point: day name for week/month-by-day, hour for "today". */
export function seriesLabel(
  p: { day: string; hour: number | null; date: string },
  t: (k: string) => string,
  byDate = false,
) {
  if (p.hour !== null && p.hour !== undefined) return `${String(p.hour).padStart(2, "0")}:00`;
  if (byDate) return p.date.slice(5); // MM-DD for month views
  return t(`day.${p.day}`);
}

/** "45m" / "3h 20m" / "21d 4h" — keeps very old orders readable instead of "30000m". */
export function formatElapsed(
  minutes: number | null | undefined,
  t: (k: string) => string,
): string {
  if (minutes === null || minutes === undefined || minutes < 0) return "—";
  const m = Math.floor(minutes);
  if (m < 60) return `${m}${t("time.m")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h}${t("time.h")} ${m % 60}${t("time.m")}` : `${h}${t("time.h")}`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}${t("time.d")} ${h % 24}${t("time.h")}` : `${d}${t("time.d")}`;
}
