import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, CheckCircle2, XCircle, Star, Clock } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useApp } from "@/i18n/AppProviders";
import { PageHeader, StatCard } from "@/components/ui-ez/Primitives";
import { SkeletonCards } from "@/components/ui-ez/States";
import { QueryState } from "@/components/ui-ez/QueryState";
import { performanceApi } from "@/lib/api/vendor";
import type { Period } from "@/lib/api/types";
import { formatChange, formatMoney, formatNumber, seriesLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "الأداء — Yalla Vendor" },
      { name: "description", content: "تابع مؤشرات الأداء الرئيسية لمطعمك" },
    ],
  }),
  component: PerformancePage,
});

const pct = (v: number | null) => (v === null ? "—" : `${formatNumber(v)}%`);

function PerformancePage() {
  const { t } = useApp();
  const [period, setPeriod] = useState<Period>("week");
  const query = useQuery({
    queryKey: ["performance", period],
    queryFn: () => performanceApi.get({ period }),
    placeholderData: (prev) => prev,
  });
  const pts = ` ${t("perf.pts")}`;

  return (
    <div>
      <PageHeader
        title={t("perf.title")}
        subtitle={t("perf.subtitle")}
        actions={
          <div className="ez-card flex items-center gap-1 p-1">
            {(["today", "week", "month"] as Period[]).map((r) => (
              <button
                key={r}
                onClick={() => setPeriod(r)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  period === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {t(`common.${r}`)}
              </button>
            ))}
          </div>
        }
      />

      <QueryState query={query} loading={<SkeletonCards count={4} />}>
        {(d) => {
          const k = d.kpis;
          const chart = d.revenue_series.map((p) => ({
            label: seriesLabel(p, t, period === "month"),
            value: p.value,
          }));
          const cancelDelta = k.cancel_rate.change_pts;
          return (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label={t("perf.completionRate")}
                  value={pct(k.completion_rate.value)}
                  delta={formatChange(k.completion_rate.change_pts, pts)}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  tone="success"
                />
                <StatCard
                  label={t("perf.acceptanceRate")}
                  value={pct(k.acceptance_rate.value)}
                  delta={formatChange(k.acceptance_rate.change_pts, pts)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  tone="primary"
                />
                {/* Lower cancel rate is better → invert the arrow colour */}
                <StatCard
                  label={t("perf.cancelRate")}
                  value={pct(k.cancel_rate.value)}
                  delta={formatChange(cancelDelta, pts)}
                  deltaDirection={
                    cancelDelta === null || cancelDelta === 0
                      ? "neutral"
                      : cancelDelta > 0
                        ? "down"
                        : "up"
                  }
                  icon={<XCircle className="h-5 w-5" />}
                  tone="warning"
                />
                <StatCard
                  label={t("perf.avgRating")}
                  value={
                    k.avg_rating.value === null ? "—" : `${formatNumber(k.avg_rating.value)} / 5`
                  }
                  delta={`${k.avg_rating.reviews_count} ${t("dash.reviewsCount")}`}
                  deltaDirection="neutral"
                  icon={<Star className="h-5 w-5" />}
                  tone="info"
                />
              </div>

              <div className="ez-card ez-shadow mt-6 p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">{t("reports.revenueTrend")}</h3>
                    <p className="ez-num text-xs text-muted-foreground">
                      {t(`common.${period}`)} · {d.period.from} → {d.period.to}
                    </p>
                  </div>
                  <span className="ez-num inline-flex items-center gap-1 rounded-md bg-info/10 px-2 py-1 text-xs font-semibold text-info">
                    <Clock className="h-3.5 w-3.5" />
                    {t("dash.avgPrep")}:{" "}
                    {k.avg_prep_minutes === null
                      ? "—"
                      : `${formatNumber(k.avg_prep_minutes)} ${t("dash.minutes")}`}
                  </span>
                </div>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
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
                        formatter={(v: number) => [
                          `${formatMoney(v)} ${t("common.currency")}`,
                          t("dash.revenue"),
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-primary)"
                        strokeWidth={2.5}
                        fill="url(#g1)"
                      />
                    </AreaChart>
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
