import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/i18n/AppProviders";
import { CURRENCY_OVERRIDE, DEFAULT_CURRENCY } from "@/lib/api/config";
import { storeApi } from "@/lib/api/vendor";
import { currencyLabel, formatMoney } from "@/lib/format";

/**
 * The store's currency, used by every screen so amounts never show a mismatched symbol.
 * Order: VITE_CURRENCY override → GET /store `currency` → DEFAULT_CURRENCY.
 */
export function useCurrency() {
  const { t } = useApp();
  const store = useQuery({
    queryKey: ["store"],
    queryFn: storeApi.get,
    staleTime: 5 * 60_000,
    retry: false,
    enabled: !CURRENCY_OVERRIDE,
  });
  const code = CURRENCY_OVERRIDE ?? store.data?.currency ?? DEFAULT_CURRENCY;
  const label = currencyLabel(code, t);
  return {
    code,
    label,
    money: (n: number | null | undefined) => `${formatMoney(n)} ${label}`,
  };
}
