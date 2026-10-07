import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShoppingBag,
  DollarSign,
  Percent,
  XCircle,
  Download,
  Calendar,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/i18n/AppProviders";
import { PageHeader, StatCard } from "@/components/ui-ez/Primitives";
import { SkeletonCards } from "@/components/ui-ez/States";
import { QueryState, errorMessage } from "@/components/ui-ez/QueryState";
import { reportsApi, type RangeQuery } from "@/lib/api/vendor";
import type { Period } from "@/lib/api/types";
import { formatChange, formatMoney, money, pickT, seriesLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "التقارير — Yalla Vendor" },
      { name: "description", content: "تقارير المبيعات والإيرادات والعمولات" },
    ],
  }),
  component: ReportsPage,
});

type Range = Period | "custom";

const PIE_COLORS = [
  "var(--color-primary)",
  "color-mix(in oklab, var(--color-primary) 70%, white)",
  "color-mix(in oklab, var(--color-primary) 45%, white)",
  "color-mix(in oklab, var(--color-primary) 25%, white)",
  "color-mix(in oklab, var(--color-primary) 60%, black)",
  "color-mix(in oklab, var(--color-primary) 35%, black)",
  "color-mix(in oklab, var(--color-primary) 15%, black)",
];

function ReportsPage() {
  const { t, locale } = useApp();
  const [range, setRange] = useState<Range>("week");
  const [custom, setCustom] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState<{ from: string; to: string }>({ from: "", to: "" });

  const q: RangeQuery = range === "custom" ? custom : { period: range };
  const query = useQuery({
    queryKey: ["reports", q],
    queryFn: () => reportsApi.get(q),
    placeholderData: (prev) => prev,
  });

  // CSV comes back as a file: downloaded as a blob with the auth header.
  const exportCsv = useMutation({
    mutationFn: () => reportsApi.exportCsv(q),
    onError: (e) => toast.error(errorMessage(e, t("states.errorDesc"))),
  });

  return (
    <div>
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.subtitle")}
        actions={
          <>
            <div className="ez-card flex items-center gap-1 p-1">
              {(["today", "week", "month"] as Period[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    range === r
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {t(`common.${r}`)}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                onClick={() => {
                  setDraft(custom);
                  setPickerOpen((v) => !v);
                }}
                className={cn(
                  "ez-card inline-flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-accent",
                  range === "custom" && "border-primary text-primary",
                )}
              >
                <Calendar className="h-4 w-4" />
                {range === "custom" ? (
                  <span className="ez-num">
                    {custom.from} → {custom.to}
                  </span>
                ) : (
                  t("reports.dateRange")
                )}
              </button>
              {pickerOpen && (
                <div className="absolute end-0 top-11 z-30 w-64 space-y-2 rounded-lg border border-border bg-popover p-3 ez-shadow">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    {t("reports.from")}
                    <input
                      type="date"
                      value={draft.from}
                      onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                      className="ez-num mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-muted-foreground">
                    {t("reports.to")}
                    <input
                      type="date"
                      value={draft.to}
                      onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                      className="ez-num mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                    />
                  </label>
                  <button
                    disabled={!draft.from || !draft.to || draft.from > draft.to}
                    onClick={() => {
                      setCustom(draft);
                      setRange("custom");
                      setPickerOpen(false);
                    }}
                    className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {t("reports.apply")}
                  </button>
                </div>
              )}
            </div>
            <button
              disabled={exportCsv.isPending}
              onClick={() => exportCsv.mutate()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {exportCsv.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("reports.export")}
            </button>
          </>
        }
      />

      <QueryState query={query} loading={<SkeletonCards count={4} />}>
        {(d) => {
          const byDate = range === "month" || range === "custom";
          const trend = d.revenue_trend.map((p) => ({
            label: seriesLabel(p, t, byDate),
            value: p.value,
          }));
          const bars = d.completed_vs_cancelled.map((p) => ({
            day: seriesLabel(p, t, byDate),
            completed: p.completed,
            cancelled: p.cancelled,
          }));
          const categoryData = d.by_category.map((c) => ({
            name: pickT(c.name_translations, locale, c.name),
            value: c.value,
          }));
          const maxUnits = Math.max(1, ...d.top_products.map((i) => i.units));
          const cancelledPct = d.changes.cancelled_pct;
          const periodLabel =
            range === "custom" ? `${d.period.from} → ${d.period.to}` : t(`common.${range}`);
          return (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label={t("reports.totalOrders")}
                  value={formatMoney(d.totals.total_orders)}
                  delta={formatChange(d.changes.total_orders_pct)}
                  icon={<ShoppingBag className="h-5 w-5" />}
                  tone="primary"
                />
                <StatCard
                  label={t("reports.revenue")}
                  value={money(d.totals.revenue, d.currency, t)}
                  delta={formatChange(d.changes.revenue_pct)}
                  icon={<DollarSign className="h-5 w-5" />}
                  tone="success"
                />
                <StatCard
                  label={t("reports.commissions")}
                  value={money(d.totals.commissions, d.currency, t)}
                  delta={`${Math.round(d.commission_rate * 100)}% ${t("reports.platformFee")}`}
                  deltaDirection="neutral"
                  icon={<Percent className="h-5 w-5" />}
                  tone="warning"
                />
                {/* More cancellations is worse → invert the arrow colour */}
                <StatCard
                  label={t("reports.cancelled")}
                  value={formatMoney(d.totals.cancelled)}
                  delta={formatChange(cancelledPct)}
                  deltaDirection={
                    cancelledPct === null || cancelledPct === 0
                      ? "neutral"
                      : cancelledPct > 0
                        ? "down"
                        : "up"
                  }
                  icon={<XCircle className="h-5 w-5" />}
                  tone="info"
                />
              </div>

              {/* Secondary KPIs */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SimpleStat
                  label={t("reports.completed")}
                  value={formatMoney(d.totals.completed)}
                />
                <SimpleStat
                  label={t("reports.netRevenue")}
                  value={money(d.totals.net, d.currency, t)}
                  accent
                />
                <SimpleStat label={t("reports.aov")} value={money(d.totals.aov, d.currency, t)} />
              </div>

              {/* Revenue chart */}
              <div className="ez-card ez-shadow mt-6 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">{t("reports.revenueTrend")}</h3>
                    <p className="ez-num text-xs text-muted-foreground">{periodLabel}</p>
                  </div>
                  <span className="ez-num inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {formatChange(d.changes.revenue_pct)}
                  </span>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rep-rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => formatMoney(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [money(v, d.currency, t), t("reports.revenue")]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-primary)"
                        strokeWidth={2.5}
                        fill="url(#rep-rev)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top products + Category breakdown */}
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="ez-card ez-shadow p-5 lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold">{t("reports.topProducts")}</h3>
                    <span className="text-xs text-muted-foreground">{t("reports.byUnits")}</span>
                  </div>
                  <ul className="space-y-3">
                    {d.top_products.map((item, i) => {
                      const pct = (item.units / maxUnits) * 100;
                      return (
                        <li key={item.id ?? i} className="flex items-center gap-3">
                          <span className="ez-num grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary">
                            {i + 1}
                          </span>
                          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-accent text-lg">
                            {item.image ? (
                              <img src={item.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              "🍽️"
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium">
                                {pickT(item.name_translations, locale, item.name)}
                              </p>
                              <span className="ez-num text-xs font-semibold text-muted-foreground">
                                {item.units} {t("menu.sold")}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <span className="ez-num w-24 text-end text-sm font-semibold">
                            {money(item.revenue, d.currency, t)}
                          </span>
                        </li>
                      );
                    })}
                    {d.top_products.length === 0 && (
                      <li className="py-6 text-center text-xs text-muted-foreground">—</li>
                    )}
                  </ul>
                </div>

                <div className="ez-card ez-shadow p-5">
                  <h3 className="mb-4 text-base font-semibold">{t("reports.byCategory")}</h3>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          stroke="var(--color-background)"
                          strokeWidth={2}
                        >
                          {categoryData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-popover)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(v: number) => money(v, d.currency, t)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {categoryData.map((c, i) => (
                      <li key={c.name} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="flex-1 truncate text-foreground">{c.name}</span>
                        <span className="ez-num font-semibold text-muted-foreground">
                          {formatMoney(c.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Orders vs Cancelled */}
              <div className="ez-card ez-shadow mt-6 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold">{t("reports.ordersVsCancelled")}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Legend color="var(--color-primary)" label={t("reports.completed")} />
                    <Legend color="var(--color-destructive)" label={t("reports.cancelled")} />
                  </div>
                </div>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bars} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--color-accent)" }}
                        contentStyle={{
                          background: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="completed"
                        name={t("reports.completed")}
                        fill="var(--color-primary)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="cancelled"
                        name={t("reports.cancelled")}
                        fill="var(--color-destructive)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}

function SimpleStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("ez-card ez-shadow p-4", accent && "border-primary/40 bg-primary-soft")}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("ez-num mt-1 text-xl font-bold", accent && "text-primary")}>{value}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
