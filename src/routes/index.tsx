import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, DollarSign, Clock, Star, ArrowUpRight } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useApp } from "@/i18n/AppProviders";
import { PageHeader, StatCard, StatusPill } from "@/components/ui-ez/Primitives";
import { EmptyOrders, SkeletonCards } from "@/components/ui-ez/States";
import { QueryState } from "@/components/ui-ez/QueryState";
import { dashboardApi } from "@/lib/api/vendor";
import { formatChange, formatMoney, formatNumber, money, pickT } from "@/lib/format";
import { STATUS_LABEL_KEY } from "@/lib/orders";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "الرئيسية — Yalla Vendor" },
      { name: "description", content: "نظرة عامة على أداء مطعمك اليومي" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, locale } = useApp();
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
    refetchInterval: 30_000, // fallback if Pusher is unavailable
  });

  return (
    <div>
      <PageHeader
        title={`${t("dash.welcome")} ${query.data?.store.name ?? ""} 👋`}
        subtitle={new Date().toLocaleDateString(locale === "en" ? "en-GB" : "ar-IQ", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      />

      <QueryState query={query} loading={<SkeletonCards count={4} />}>
        {(d) => {
          const chart = d.weekly_revenue.series.map((p) => ({
            label: t(`day.${p.day}`),
            value: p.value,
          }));
          return (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label={t("dash.todayOrders")}
                  value={formatMoney(d.kpis.today_orders.value)}
                  delta={formatChange(d.kpis.today_orders.change_pct)}
                  icon={<ShoppingBag className="h-5 w-5" />}
                  tone="primary"
                />
                <StatCard
                  label={t("dash.revenue")}
                  value={money(d.kpis.today_revenue.value, d.currency, t)}
                  delta={formatChange(d.kpis.today_revenue.change_pct)}
                  icon={<DollarSign className="h-5 w-5" />}
                  tone="success"
                />
                <StatCard
                  label={t("dash.avgPrep")}
                  value={
                    d.kpis.avg_prep_minutes.value === null
                      ? "—"
                      : `${formatNumber(d.kpis.avg_prep_minutes.value)} ${t("dash.minutes")}`
                  }
                  delta={formatChange(
                    d.kpis.avg_prep_minutes.change_minutes,
                    ` ${t("dash.minutes")}`,
                  )}
                  icon={<Clock className="h-5 w-5" />}
                  tone="info"
                />
                <StatCard
                  label={t("dash.rating")}
                  value={formatNumber(d.kpis.rating.value)}
                  delta={`${d.kpis.rating.reviews_count} ${t("dash.reviewsCount")}`}
                  deltaDirection="neutral"
                  icon={<Star className="h-5 w-5" />}
                  tone="warning"
                />
              </div>

              {/* Chart + Top items */}
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="ez-card ez-shadow p-5 lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{t("dash.weeklyRevenue")}</h3>
                      <p className="text-xs text-muted-foreground">{t("common.week")}</p>
                    </div>
                    <span className="ez-num rounded-md bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                      {formatChange(d.weekly_revenue.change_pct)}
                    </span>
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
                          cursor={{ fill: "var(--color-accent)" }}
                          contentStyle={{
                            background: "var(--color-popover)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(v: number) => [money(v, d.currency, t), t("dash.revenue")]}
                        />
                        <Bar
                          dataKey="value"
                          fill="var(--color-primary)"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={42}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="ez-card ez-shadow p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold">{t("dash.topItems")}</h3>
                    <Link to="/menu" className="text-xs font-medium text-primary hover:underline">
                      {t("dash.viewAll")}
                    </Link>
                  </div>
                  <ul className="space-y-3">
                    {d.top_items.map((item, i) => (
                      <li key={item.id} className="flex items-center gap-3">
                        <span className="ez-num grid h-7 w-7 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {pickT(item.name_translations, locale, item.name)}
                          </p>
                          <p className="ez-num text-xs text-muted-foreground">
                            {item.units} {t("menu.sold")}
                          </p>
                        </div>
                        <span className="ez-num text-sm font-semibold">
                          {formatMoney(item.price)}
                        </span>
                      </li>
                    ))}
                    {d.top_items.length === 0 && (
                      <li className="py-6 text-center text-xs text-muted-foreground">—</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Live orders */}
              <div className="ez-card ez-shadow mt-6">
                <div className="flex items-center justify-between border-b border-border p-5">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold">{t("dash.liveOrders")}</h3>
                    <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                      LIVE
                    </span>
                    {d.new_orders_count > 0 && (
                      <span className="ez-num rounded-full bg-info/10 px-2 py-0.5 text-[11px] font-semibold text-info">
                        {d.new_orders_count} {t("common.new")}
                      </span>
                    )}
                  </div>
                  <Link
                    to="/orders"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {t("dash.viewAll")} <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {d.live_orders.length === 0 ? (
                  <div className="p-4">
                    <EmptyOrders
                      title={t("states.emptyOrdersTitle")}
                      description={t("states.emptyOrdersDesc")}
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {d.live_orders.map((o) => (
                      <li key={o.id}>
                        <Link
                          to="/orders"
                          search={{ order: o.id } as never}
                          className="flex items-center gap-4 p-4 hover:bg-accent/40"
                        >
                          <div className="ez-num text-xs font-semibold text-muted-foreground">
                            {o.reference}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{o.customer.name}</p>
                            <p className="ez-num truncate text-xs text-muted-foreground">
                              {o.items_count} {t("dash.products")} · {money(o.total, d.currency, t)}
                            </p>
                          </div>
                          <StatusPill status={o.status} label={t(STATUS_LABEL_KEY[o.status])} />
                          <span className="ez-num hidden text-xs text-muted-foreground sm:inline">
                            {o.minutes_ago}m
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
