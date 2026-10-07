import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  X,
  MapPin,
  Phone,
  Search,
  RefreshCw,
  Printer,
  Clock,
  ChefHat,
  PackageCheck,
  Bike,
  CheckCircle2,
  XCircle,
  CircleDot,
  Receipt,
  User,
  AlertTriangle,
  Loader2,
  Hourglass,
} from "lucide-react";
import { useApp } from "@/i18n/AppProviders";
import { PageHeader, StatusPill } from "@/components/ui-ez/Primitives";
import { EmptyOrders, EmptySearch, SkeletonList } from "@/components/ui-ez/States";
import { QueryState, errorMessage } from "@/components/ui-ez/QueryState";
import { ordersApi } from "@/lib/api/vendor";
import type { Order, OrderAction, OrderStatus } from "@/lib/api/types";
import { formatMoney, formatTime } from "@/lib/format";
import {
  AWAITING_KEY,
  CANCELLED_BY_KEY,
  PAYMENT_KEY,
  STATUS_LABEL_KEY,
  useAcceptCountdown,
} from "@/lib/orders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orders")({
  validateSearch: (search: Record<string, unknown>): { q?: string; order?: number } => ({
    q: typeof search.q === "string" ? search.q : undefined,
    order:
      search.order !== undefined && !Number.isNaN(Number(search.order))
        ? Number(search.order)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "الطلبات — Yalla Vendor" },
      { name: "description", content: "تابع وأدر جميع طلبات مطعمك في الوقت الفعلي" },
    ],
  }),
  component: OrdersPage,
});

type Tab = "active" | "history";
const PAGE_SIZE = 30;

function OrdersPage() {
  const { t, dir } = useApp();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("active");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState(search.q ?? "");
  const [debounced, setDebounced] = useState(search.q ?? "");
  const [perPage, setPerPage] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<number | undefined>(search.order);
  const [rejecting, setRejecting] = useState<Order | null>(null);

  // Topbar search / notification deep-links update the URL.
  useEffect(() => {
    if (search.q !== undefined) {
      setQuery(search.q);
      setDebounced(search.q);
    }
  }, [search.q]);
  useEffect(() => {
    if (search.order !== undefined) setSelectedId(search.order);
  }, [search.order]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 400);
    return () => window.clearTimeout(id);
  }, [query]);

  // Server-side list: counts = chip numbers; search matches EZ-00042 / 42 / name / phone.
  const list = useQuery({
    queryKey: ["orders", tab, statusFilter, debounced, perPage],
    queryFn: () =>
      ordersApi.list({
        tab,
        status: statusFilter,
        search: debounced || undefined,
        per_page: perPage,
      }),
    placeholderData: (prev) => prev,
    refetchInterval: 20_000, // Pusher is best-effort — poll as a fallback
  });

  const orders = list.data?.orders ?? [];
  const currentId = selectedId ?? orders[0]?.id;
  const listItem = orders.find((o) => o.id === currentId);

  // Details are fetched per order so realtime events refresh them directly.
  const details = useQuery({
    queryKey: ["order", currentId],
    queryFn: () => ordersApi.show(currentId!),
    enabled: currentId !== undefined,
    initialData: listItem,
    refetchInterval: 20_000,
  });
  const selected = details.data ?? listItem;

  const onUpdated = (o: Order) => {
    queryClient.setQueryData(["order", o.id], o);
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const action = useMutation({
    mutationFn: ({ order, act, reason }: { order: Order; act: OrderAction; reason?: string }) => {
      switch (act) {
        case "accept":
          return ordersApi.accept(order.id);
        case "reject":
          return ordersApi.reject(order.id, reason ?? "");
        case "start_preparing":
          return ordersApi.startPreparing(order.id);
        case "mark_ready":
          return ordersApi.markReady(order.id);
      }
    },
    onSuccess: (o) => {
      onUpdated(o);
      setRejecting(null);
    },
    // 409 etc: the server message is ready for display.
    onError: (e, vars) => {
      toast.error(errorMessage(e, t("states.errorDesc")));
      queryClient.invalidateQueries({ queryKey: ["order", vars.order.id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const runAction = (order: Order, act: OrderAction) => {
    if (act === "reject") setRejecting(order);
    else action.mutate({ order, act });
  };

  const counts = list.data?.counts ?? {};
  const tabs: { key: OrderStatus | "all"; labelKey: string }[] =
    tab === "active"
      ? [
          { key: "all", labelKey: "common.all" },
          { key: "new", labelKey: "common.new" },
          { key: "accepted", labelKey: "orders.accepted" },
          { key: "preparing", labelKey: "common.preparing" },
          { key: "ready", labelKey: "common.ready" },
          { key: "pickedup", labelKey: "orders.pickedup" },
          { key: "delivering", labelKey: "common.delivering" },
        ]
      : [
          { key: "all", labelKey: "common.all" },
          { key: "completed", labelKey: "common.completed" },
          { key: "cancelled", labelKey: "common.cancelled" },
        ];

  const select = (id: number) => {
    setSelectedId(id);
    navigate({
      to: "/orders",
      search: (s: Record<string, unknown>) => ({ ...s, order: id }) as never,
      replace: true,
    });
  };

  return (
    <div>
      <PageHeader
        title={t("orders.title")}
        subtitle={t("orders.subtitle")}
        actions={
          <button
            onClick={() => {
              list.refetch();
              if (currentId !== undefined) details.refetch();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", list.isFetching && "animate-spin")} />{" "}
            {t("orders.refresh")}
          </button>
        }
      />

      {/* Active / History tabs */}
      <div className="mb-4 flex items-center gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        {(["active", "history"] as const).map((key) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setStatusFilter("all");
              setPerPage(PAGE_SIZE);
              setSelectedId(undefined);
            }}
            className={cn(
              "rounded-lg px-4 py-1.5 text-xs font-semibold transition",
              tab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(key === "active" ? "orders.tabActive" : "orders.tabHistory")}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* LEFT: list */}
        <div className="ez-card ez-shadow flex flex-col overflow-hidden">
          {/* Search + filter chips */}
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search
                className={cn(
                  "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                  dir === "rtl" ? "right-3" : "left-3",
                )}
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("common.searchOrders")}
                className={cn(
                  "h-10 w-full rounded-lg border border-input bg-secondary/60 text-sm outline-none focus:border-ring focus:bg-background",
                  dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3",
                )}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tabs.map((tb) => {
                const active = statusFilter === tb.key;
                const count = counts[tb.key] ?? 0;
                return (
                  <button
                    key={tb.key}
                    onClick={() => {
                      setStatusFilter(tb.key);
                      setPerPage(PAGE_SIZE);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(tb.labelKey)}
                    <span
                      className={cn(
                        "ez-num rounded-full px-1.5 text-[10px]",
                        active ? "bg-primary-foreground/20" : "bg-muted",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Order cards list */}
          <div className="max-h-[calc(100vh-340px)] divide-y divide-border overflow-y-auto">
            <QueryState query={list} loading={<SkeletonList rows={5} />}>
              {(data) =>
                data.orders.length === 0 ? (
                  <div className="p-4">
                    {debounced ? (
                      <EmptySearch
                        title={t("states.emptySearchTitle")}
                        description={t("states.emptySearchDesc")}
                      />
                    ) : (
                      <EmptyOrders
                        title={t("states.emptyOrdersTitle")}
                        description={t("states.emptyOrdersDesc")}
                        actionLabel={t("orders.refresh")}
                        onAction={() => list.refetch()}
                      />
                    )}
                  </div>
                ) : (
                  <>
                    {data.orders.map((o) => (
                      <OrderListCard
                        key={o.id}
                        order={o}
                        selected={currentId === o.id}
                        busy={action.isPending && action.variables?.order.id === o.id}
                        onClick={() => select(o.id)}
                        onAction={(act) => runAction(o, act)}
                      />
                    ))}
                    {data.meta.current_page < data.meta.last_page && (
                      <div className="p-3 text-center">
                        <button
                          onClick={() => setPerPage((n) => n + PAGE_SIZE)}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent"
                        >
                          {list.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {t("common.loadMore")} ({data.orders.length}/{data.meta.total})
                        </button>
                      </div>
                    )}
                  </>
                )
              }
            </QueryState>
          </div>
        </div>

        {/* RIGHT: details */}
        <div className="ez-card ez-shadow overflow-hidden">
          {selected ? (
            <OrderDetails
              order={selected}
              busyAction={
                action.isPending && action.variables?.order.id === selected.id
                  ? action.variables.act
                  : null
              }
              onAction={(act) => runAction(selected, act)}
            />
          ) : (
            <div className="grid h-full place-items-center p-12 text-sm text-muted-foreground">
              <Receipt className="mb-3 h-10 w-10 opacity-30" />
              {t("orders.selectOrder")}
            </div>
          )}
        </div>
      </div>

      {rejecting && (
        <RejectDialog
          order={rejecting}
          pending={action.isPending}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => action.mutate({ order: rejecting, act: "reject", reason })}
        />
      )}
    </div>
  );
}

/* ---------- Order list card ---------- */
function OrderListCard({
  order,
  selected,
  busy,
  onClick,
  onAction,
}: {
  order: Order;
  selected: boolean;
  busy: boolean;
  onClick: () => void;
  onAction: (a: OrderAction) => void;
}) {
  const { t } = useApp();
  const queryClient = useQueryClient();
  const isNew = order.status === "new";
  const left = useAcceptCountdown(order);
  const urgent = isNew && left < 60;

  // Accept window elapsed → the server auto-cancels; refresh to pick it up.
  useEffect(() => {
    if (!isNew || left > 0 || order.accept_seconds_left === null) return;
    const id = window.setTimeout(
      () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
      3000,
    );
    return () => window.clearTimeout(id);
  }, [isNew, left, order.accept_seconds_left, queryClient]);

  const canAccept = order.available_actions.includes("accept");
  const canReject = order.available_actions.includes("reject");

  return (
    <button
      onClick={onClick}
      className={cn(
        "group block w-full p-4 text-start transition",
        selected ? "bg-primary-soft/60" : "hover:bg-accent/40",
        isNew && "relative",
      )}
    >
      {isNew && (
        <span
          className={cn(
            "absolute inset-y-0 w-1",
            urgent ? "bg-destructive" : "bg-primary",
            "start-0",
          )}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="ez-num text-sm font-bold text-primary">{order.reference}</span>
            <StatusPill status={order.status} label={t(STATUS_LABEL_KEY[order.status])} />
            {urgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                <AlertTriangle className="h-3 w-3" /> {t("orders.urgent")}
              </span>
            )}
          </div>
          <p className="mt-1.5 truncate font-semibold">{order.customer.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {order.items_count} × {order.items.map((i) => i.name).join("، ")}
          </p>
        </div>
        <div className="text-end shrink-0">
          <p className="ez-num text-base font-bold">{formatMoney(order.total)}</p>
          <p className="ez-num text-[10px] text-muted-foreground">{t("common.currency")}</p>
          <p className="ez-num mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {order.minutes_ago}m {t("orders.elapsed")}
          </p>
        </div>
      </div>

      {isNew && (
        <div className="mt-3 flex items-center gap-2">
          <CountdownBar seconds={left} total={order.accept_window_seconds || 180} />
          {(canAccept || canReject) && (
            <div className="flex gap-1.5">
              {canAccept && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!busy) onAction("accept");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      if (!busy) onAction("accept");
                    }
                  }}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1 rounded-md bg-success px-2.5 py-1.5 text-xs font-bold text-success-foreground hover:opacity-90",
                    busy && "opacity-60",
                  )}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}{" "}
                  {t("common.accept")}
                </span>
              )}
              {canReject && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("reject");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      onAction("reject");
                    }
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/15"
                >
                  <X className="h-3.5 w-3.5" /> {t("common.reject")}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function CountdownBar({ seconds, total }: { seconds: number; total: number }) {
  const { t } = useApp();
  const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
  const color = seconds < 30 ? "bg-destructive" : seconds < 60 ? "bg-warning" : "bg-primary";
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return (
    <div className="flex flex-1 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="ez-num min-w-[56px] text-end text-[11px] font-bold tabular-nums text-muted-foreground">
        {t("orders.acceptIn")} {mm}:{ss.toString().padStart(2, "0")}
      </span>
    </div>
  );
}

/* ---------- Details panel ---------- */
function OrderDetails({
  order,
  busyAction,
  onAction,
}: {
  order: Order;
  busyAction: OrderAction | null;
  onAction: (a: OrderAction) => void;
}) {
  const { t, locale } = useApp();
  const left = useAcceptCountdown(order);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-secondary/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="ez-num text-lg font-bold text-primary">{order.reference}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {t("orders.placedAt")}{" "}
              {formatTime(order.placed_at, locale)} · {order.minutes_ago}m {t("orders.elapsed")}
            </p>
          </div>
          <StatusPill status={order.status} label={t(STATUS_LABEL_KEY[order.status])} />
        </div>
        {order.status === "new" && (
          <div className="mt-3">
            <CountdownBar seconds={left} total={order.accept_window_seconds || 180} />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* Timeline */}
        <Section title={t("orders.timeline")}>
          <Timeline order={order} />
        </Section>

        {/* Customer */}
        <Section title={t("orders.customerInfo")}>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{order.customer.name}</span>
            </div>
            {order.customer.phone && (
              <div className="ez-num flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> <span dir="ltr">{order.customer.phone}</span>
              </div>
            )}
            {order.delivery_address?.address && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {order.delivery_address.address}
                  {order.delivery_address.notes && (
                    <span className="block text-[11px] italic">{order.delivery_address.notes}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </Section>

        {/* Driver */}
        {order.driver?.id && (
          <Section title={t("orders.driver")}>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Bike className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{order.driver.name}</span>
              </div>
              {order.driver.phone && (
                <div className="ez-num flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> <span dir="ltr">{order.driver.phone}</span>
                </div>
              )}
              {order.driver.vehicle && (
                <p className="text-xs text-muted-foreground">{order.driver.vehicle}</p>
              )}
            </div>
          </Section>
        )}

        {/* Items */}
        <Section title={t("orders.orderItems")}>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">{t("orders.items")}</th>
                  <th className="px-3 py-2 text-center font-semibold">{t("orders.qty")}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t("orders.lineTotal")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{it.name}</p>
                      {addOnNames(it.add_ons) && (
                        <p className="mt-0.5 text-[11px] text-info">+ {addOnNames(it.add_ons)}</p>
                      )}
                      {it.notes && (
                        <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                          {it.notes}
                        </p>
                      )}
                      <p className="ez-num mt-0.5 text-[11px] text-muted-foreground">
                        {formatMoney(it.unit_price)} {t("common.currency")}
                      </p>
                    </td>
                    <td className="ez-num px-3 py-2.5 text-center font-bold">×{it.quantity}</td>
                    <td className="ez-num px-3 py-2.5 text-end font-semibold">
                      {formatMoney(it.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {order.special_notes && (
            <p className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
              {order.special_notes}
            </p>
          )}
        </Section>

        {/* Totals */}
        <Section title="">
          <div className="space-y-1.5 text-sm">
            <Row
              label={t("orders.subtotal")}
              value={`${formatMoney(order.subtotal)} ${t("common.currency")}`}
            />
            {order.discount > 0 && (
              <Row
                label={t("orders.discount")}
                value={`-${formatMoney(order.discount)} ${t("common.currency")}`}
              />
            )}
            <Row
              label={t("orders.deliveryFee")}
              value={`${formatMoney(order.delivery_fee)} ${t("common.currency")}`}
            />
            <div className="my-2 border-t border-dashed border-border" />
            <Row
              label={t("orders.total")}
              value={`${formatMoney(order.total)} ${t("common.currency")}`}
              bold
            />
            <p className="ez-num pt-1 text-[11px] text-muted-foreground">
              {t(PAYMENT_KEY[order.payment_method] ?? order.payment_method)} ·{" "}
              {order.payment_status}
            </p>
          </div>
        </Section>
      </div>

      {/* Sticky action bar */}
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-center gap-2">
          {order.customer.phone ? (
            <a
              href={`tel:${order.customer.phone}`}
              className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-accent"
              title={t("orders.callCustomer")}
            >
              <Phone className="h-4 w-4" />
            </a>
          ) : null}
          <button
            onClick={() => window.print()}
            className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-accent"
            title={t("orders.printReceipt")}
          >
            <Printer className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <PrimaryAction order={order} busyAction={busyAction} onAction={onAction} />
          </div>
        </div>
      </div>
    </div>
  );
}

function addOnNames(addOns: unknown): string {
  if (!Array.isArray(addOns) || addOns.length === 0) return "";
  return addOns
    .map((a) =>
      a && typeof a === "object" && "name" in a ? String((a as { name: unknown }).name) : String(a),
    )
    .join("، ");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      {title && (
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-muted-foreground", bold && "text-foreground font-bold text-base")}>
        {label}
      </span>
      <span className={cn("ez-num font-semibold", bold && "text-base font-bold text-primary")}>
        {value}
      </span>
    </div>
  );
}

/**
 * Buttons come ONLY from available_actions (accept / reject / start_preparing / mark_ready).
 * Picked-up & complete are done by the driver app — when there's nothing to do we show `awaiting`.
 */
function PrimaryAction({
  order,
  busyAction,
  onAction,
}: {
  order: Order;
  busyAction: OrderAction | null;
  onAction: (a: OrderAction) => void;
}) {
  const { t } = useApp();
  const acts = order.available_actions;
  const spin = (a: OrderAction) => busyAction === a;
  const disabled = busyAction !== null;

  if (acts.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs font-semibold text-muted-foreground">
        {order.awaiting ? (
          <>
            <Hourglass className="h-4 w-4" /> {t(AWAITING_KEY[order.awaiting])}
          </>
        ) : (
          "—"
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {acts.includes("reject") && (
        <button
          disabled={disabled}
          onClick={() => onAction("reject")}
          className="flex-1 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/15 disabled:opacity-60"
        >
          <X className="me-1 inline h-4 w-4" /> {t("common.reject")}
        </button>
      )}
      {acts.includes("accept") && (
        <button
          disabled={disabled}
          onClick={() => onAction("accept")}
          className="flex-[2] rounded-lg bg-success px-3 py-2.5 text-sm font-bold text-success-foreground hover:opacity-90 disabled:opacity-60"
        >
          {spin("accept") ? (
            <Loader2 className="me-1 inline h-4 w-4 animate-spin" />
          ) : (
            <Check className="me-1 inline h-4 w-4" />
          )}{" "}
          {t("common.accept")}
        </button>
      )}
      {acts.includes("start_preparing") && (
        <button
          disabled={disabled}
          onClick={() => onAction("start_preparing")}
          className="flex-1 rounded-lg bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {spin("start_preparing") ? (
            <Loader2 className="me-1 inline h-4 w-4 animate-spin" />
          ) : (
            <ChefHat className="me-1 inline h-4 w-4" />
          )}{" "}
          {t("orders.startPrep")}
        </button>
      )}
      {acts.includes("mark_ready") && (
        <button
          disabled={disabled}
          onClick={() => onAction("mark_ready")}
          className={cn(
            "flex-1 rounded-lg px-3 py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-60",
            acts.includes("start_preparing")
              ? "border border-primary/30 bg-primary-soft text-primary"
              : "bg-primary text-primary-foreground",
          )}
        >
          {spin("mark_ready") ? (
            <Loader2 className="me-1 inline h-4 w-4 animate-spin" />
          ) : (
            <PackageCheck className="me-1 inline h-4 w-4" />
          )}{" "}
          {t("orders.markReady")}
        </button>
      )}
    </div>
  );
}

/* ---------- Timeline (6 steps from the server; `delivering` marks pickedup as current) ---------- */
const STEP_ICON: Partial<Record<OrderStatus, React.ReactNode>> = {
  new: <CircleDot className="h-3.5 w-3.5" />,
  accepted: <Check className="h-3.5 w-3.5" />,
  preparing: <ChefHat className="h-3.5 w-3.5" />,
  ready: <PackageCheck className="h-3.5 w-3.5" />,
  pickedup: <Bike className="h-3.5 w-3.5" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5" />,
};

function Timeline({ order }: { order: Order }) {
  const { t, locale } = useApp();

  if (order.status === "cancelled") {
    const c = order.cancellation;
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <div className="flex items-center gap-3">
          <XCircle className="h-5 w-5" />
          <span className="font-semibold">{t("common.cancelled")}</span>
          {c?.cancelled_at && (
            <span className="ez-num ms-auto text-[11px]">{formatTime(c.cancelled_at, locale)}</span>
          )}
        </div>
        {c && (
          <p className="mt-2 text-xs">
            {t(CANCELLED_BY_KEY[c.cancelled_by] ?? c.cancelled_by)}
            {c.reason && <span className="block text-destructive/80">{c.reason}</span>}
          </p>
        )}
      </div>
    );
  }

  const steps = order.timeline;
  const lastReached = steps.reduce((idx, s, i) => (s.reached ? i : idx), -1);
  const finished = order.status === "completed";

  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const current = !finished && i === lastReached;
        const done = s.reached && !current;
        return (
          <li key={s.status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full border-2 transition",
                  done && "border-success bg-success text-success-foreground",
                  current && "border-primary bg-primary text-primary-foreground animate-pulse",
                  !done && !current && "border-border bg-card text-muted-foreground",
                )}
              >
                {STEP_ICON[s.status] ?? <CircleDot className="h-3.5 w-3.5" />}
              </div>
              {i < steps.length - 1 && (
                <div className={cn("mt-1 h-6 w-0.5", done ? "bg-success" : "bg-border")} />
              )}
            </div>
            <div className="flex flex-1 items-start justify-between gap-2 pt-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  done && "text-success",
                  current && "text-primary",
                  !done && !current && "text-muted-foreground",
                )}
              >
                {t(
                  s.status === "pickedup" && order.status === "delivering"
                    ? "common.delivering"
                    : STATUS_LABEL_KEY[s.status],
                )}
              </p>
              {s.at && (
                <span className="ez-num text-[11px] text-muted-foreground">
                  {formatTime(s.at, locale)}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Reject dialog (reason is required) ---------- */
function RejectDialog({
  order,
  pending,
  onClose,
  onConfirm,
}: {
  order: Order;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { t } = useApp();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const presets = [
    "orders.rejectPreset.outOfStock",
    "orders.rejectPreset.busy",
    "orders.rejectPreset.closing",
  ];
  const invalid = reason.trim().length === 0;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        className="ez-card w-full max-w-md border border-border ez-shadow"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!invalid) onConfirm(reason.trim());
        }}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">{t("orders.rejectTitle")}</h2>
            <p className="ez-num text-xs text-muted-foreground">{order.reference}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setReason(t(k))}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                {t(k)}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {t("orders.rejectReason")} *
            </span>
            <textarea
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring",
                touched && invalid && "border-destructive",
              )}
            />
            {touched && invalid && (
              <span className="mt-1 block text-xs text-destructive">
                {t("orders.reasonRequired")}
              </span>
            )}
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/40 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.reject")}
          </button>
        </div>
      </form>
    </div>
  );
}
