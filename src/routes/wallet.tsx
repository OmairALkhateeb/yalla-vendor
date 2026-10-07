import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Wallet as WalletIcon,
  TrendingUp,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Percent,
  ShieldCheck,
  ShieldAlert,
  Building2,
  CalendarClock,
  Search,
  Download,
  CheckCircle2,
  Loader2,
  X,
  Hourglass,
} from "lucide-react";
import { useApp } from "@/i18n/AppProviders";
import { PageHeader } from "@/components/ui-ez/Primitives";
import { SkeletonCards, SkeletonList } from "@/components/ui-ez/States";
import { QueryState, errorMessage } from "@/components/ui-ez/QueryState";
import { ApiError } from "@/lib/api/client";
import { walletApi } from "@/lib/api/vendor";
import type { Settlement, WalletSummary } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { formatChange, formatDate, formatMoney, money } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "المحفظة — Yalla Vendor" },
      { name: "description", content: "تابع رصيدك وعملياتك المالية" },
    ],
  }),
  component: WalletPage,
});

type Tab = "all" | "in" | "out";

function WalletPage() {
  const { t, locale } = useApp();
  const { can } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [settlementsPerPage, setSettlementsPerPage] = useState(10);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(query.trim()), 400);
    return () => window.clearTimeout(id);
  }, [query]);

  const summary = useQuery({ queryKey: ["wallet", "summary"], queryFn: walletApi.summary });
  const settlements = useQuery({
    queryKey: ["wallet", "settlements", settlementsPerPage],
    queryFn: () => walletApi.settlements(settlementsPerPage),
    placeholderData: (prev) => prev,
  });
  const transactions = useQuery({
    queryKey: ["wallet", "transactions", tab, search],
    queryFn: () => walletApi.transactions({ type: tab, search: search || undefined }),
    placeholderData: (prev) => prev,
  });

  const statement = useMutation({
    mutationFn: () => walletApi.statementCsv({ type: tab }),
    onError: (e) => toast.error(errorMessage(e, t("states.errorDesc"))),
  });

  const statusStyle: Record<Settlement["status"], string> = {
    paid: "bg-success/10 text-success border-success/25",
    scheduled: "bg-info/10 text-info border-info/25",
    processing: "bg-warning/15 text-warning-foreground border-warning/30",
  };
  const statusLabel: Record<Settlement["status"], string> = {
    paid: t("wallet.statusPaid"),
    scheduled: t("wallet.statusScheduled"),
    processing: t("wallet.statusProcessing"),
  };

  const w = summary.data;
  const cur = w?.currency ?? "IQD";

  return (
    <div>
      <PageHeader
        title={t("wallet.title")}
        subtitle={t("wallet.subtitle")}
        actions={
          <>
            <button
              disabled={statement.isPending}
              onClick={() => statement.mutate()}
              className="ez-card inline-flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-accent disabled:opacity-60"
            >
              {statement.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("wallet.statement")}
            </button>
            {can("withdraw") && (
              <button
                disabled={!w || !!w.pending_withdrawal}
                onClick={() => setWithdrawOpen(true)}
                title={w?.pending_withdrawal ? t("wallet.pendingWithdrawal") : undefined}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                <ArrowDownLeft className="h-4 w-4" /> {t("wallet.withdraw")}
              </button>
            )}
          </>
        }
      />

      <QueryState query={summary} loading={<SkeletonCards count={4} />}>
        {(w) => (
          <>
            {w.pending_withdrawal && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">
                <Hourglass className="h-3.5 w-3.5" />
                {t("wallet.pendingWithdrawal")}:{" "}
                <span className="ez-num font-bold">
                  {money(w.pending_withdrawal.amount, cur, t)}
                </span>
              </div>
            )}

            {/* Top: Balance hero + 3 KPI cards */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              {/* Balance hero */}
              <div className="ez-gradient relative overflow-hidden rounded-2xl p-6 text-primary-foreground ez-shadow lg:col-span-2">
                <div className="absolute -end-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                <div className="absolute -start-6 -bottom-12 h-32 w-32 rounded-full bg-black/10" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                      {t("wallet.balance")}
                    </p>
                    {w.payout_account?.is_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
                        <ShieldCheck className="h-3 w-3" /> {t("wallet.verified")}
                      </span>
                    )}
                  </div>
                  <p className="ez-num mt-3 text-4xl font-bold tracking-tight">
                    {formatMoney(w.balance)}
                    <span className="ms-1 text-lg font-medium opacity-80">
                      {t("common.currency")}
                    </span>
                  </p>
                  <p className="mt-1 text-xs opacity-80">{t("wallet.availableNow")}</p>

                  <div className="mt-6 flex items-center justify-between border-t border-white/15 pt-4 text-xs">
                    <div>
                      <p className="opacity-70">{t("wallet.nextSettlement")}</p>
                      <p className="ez-num mt-0.5 font-semibold">
                        {formatDate(w.next_settlement_date, locale)}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="opacity-70">Yalla Vendor Wallet</p>
                      <p className="ez-num mt-0.5 font-semibold">
                        {w.payout_account ? `•••• ${w.payout_account.iban_last4}` : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 KPI tiles */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-3">
                <KpiTile
                  tone="warning"
                  icon={<Clock className="h-5 w-5" />}
                  label={t("wallet.pending")}
                  value={money(w.pending_balance, cur, t)}
                  hint={t("wallet.pendingHint")}
                />
                <KpiTile
                  tone="info"
                  icon={<Percent className="h-5 w-5" />}
                  label={t("wallet.commissions")}
                  value={money(w.commissions_this_week, cur, t)}
                  hint={`${Math.round(w.commission_rate * 100)}% ${t("wallet.thisWeek")}`}
                />
                <KpiTile
                  tone="success"
                  icon={<TrendingUp className="h-5 w-5" />}
                  label={t("wallet.totalEarned")}
                  value={money(w.total_earned, cur, t)}
                  hint={formatChange(w.total_earned_change_pct)}
                />
              </div>
            </div>

            {/* Mid: Payout method + Trust note */}
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="ez-card ez-shadow p-5 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold">{t("wallet.payoutMethod")}</h3>
                  {can("manage_payout") && (
                    <button
                      onClick={() => setPayoutOpen(true)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {w.payout_account ? t("wallet.changeMethod") : t("wallet.addMethod")}
                    </button>
                  )}
                </div>
                {w.payout_account ? (
                  <div className="flex items-start gap-4 rounded-xl border border-border bg-secondary/40 p-4">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {t("wallet.bankTransfer")} — {w.payout_account.bank_name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {w.payout_account.account_holder}
                      </p>
                      <p className="ez-num mt-0.5 text-xs text-muted-foreground" dir="ltr">
                        IBAN: {w.payout_account.iban_masked}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                        {w.payout_account.is_verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 font-semibold text-success">
                            <CheckCircle2 className="h-3 w-3" /> {t("wallet.verified")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 font-semibold text-warning-foreground">
                            <ShieldAlert className="h-3 w-3" /> {t("wallet.notVerified")}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                          <CalendarClock className="h-3 w-3" />{" "}
                          {w.payout_account.payout_schedule === "weekly"
                            ? t("wallet.weeklyPayouts")
                            : w.payout_account.payout_schedule}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center text-xs text-muted-foreground">
                    {t("wallet.noPayoutAccount")}
                  </div>
                )}
              </div>

              <div className="ez-card ez-shadow flex flex-col justify-between gap-3 p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-success">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t("wallet.trustTitle")}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t("wallet.trustBody")}
                    </p>
                  </div>
                </div>
                <p className="ez-num text-[11px] text-muted-foreground">
                  {t("wallet.minWithdrawal")}: {money(w.min_withdrawal, cur, t)}
                </p>
              </div>
            </div>

            {withdrawOpen && <WithdrawDialog wallet={w} onClose={() => setWithdrawOpen(false)} />}
            {payoutOpen && <PayoutDialog wallet={w} onClose={() => setPayoutOpen(false)} />}
          </>
        )}
      </QueryState>

      {/* Settlements */}
      <div className="ez-card ez-shadow mt-6">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="text-base font-semibold">{t("wallet.settlements")}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("wallet.settlementsHint")}</p>
          </div>
          {settlements.data &&
            settlements.data.meta.total > settlements.data.settlements.length && (
              <button
                onClick={() => setSettlementsPerPage(50)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t("dash.viewAll")}
              </button>
            )}
        </div>
        <QueryState query={settlements} loading={<SkeletonList rows={3} />}>
          {(data) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">
                      {t("wallet.settlementId")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold">{t("wallet.period")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("wallet.orders")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("wallet.gross")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("wallet.commission")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("wallet.net")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.settlements.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-sm text-muted-foreground"
                      >
                        {t("wallet.noSettlements")}
                      </td>
                    </tr>
                  )}
                  {data.settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-accent/30">
                      <td className="ez-num px-4 py-3 text-xs font-semibold">{s.reference}</td>
                      <td className="px-4 py-3 text-xs">
                        <p className="ez-num font-medium">
                          {formatDate(s.period_from, locale)} – {formatDate(s.period_to, locale)}
                        </p>
                        <p className="ez-num mt-0.5 text-[11px] text-muted-foreground">
                          {formatDate(s.paid_at ?? s.scheduled_for, locale)}
                        </p>
                      </td>
                      <td className="ez-num px-4 py-3 text-end text-xs">{s.orders_count}</td>
                      <td className="ez-num px-4 py-3 text-end text-xs">
                        {formatMoney(s.gross_amount)}
                      </td>
                      <td className="ez-num px-4 py-3 text-end text-xs text-warning-foreground">
                        -{formatMoney(s.commission_amount)}
                      </td>
                      <td className="ez-num px-4 py-3 text-end text-sm font-bold text-success">
                        {formatMoney(s.net_amount)} {t("common.currency")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                            statusStyle[s.status] ?? "bg-muted text-muted-foreground border-border",
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {statusLabel[s.status] ?? s.status_label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </div>

      {/* Transactions */}
      <div className="ez-card ez-shadow mt-6">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold">{t("wallet.transactions")}</h3>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {(["all", "in", "out"] as Tab[]).map((tk) => (
                <button
                  key={tk}
                  onClick={() => setTab(tk)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    tab === tk
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tk === "all" ? t("common.all") : tk === "in" ? t("wallet.in") : t("wallet.out")}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("common.search")}
                className="h-8 w-48 rounded-lg border border-border bg-background ps-8 pe-3 text-xs focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>
        <QueryState query={transactions} loading={<SkeletonList rows={4} />}>
          {(data) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{t("wallet.date")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("wallet.type")}</th>
                    <th className="px-4 py-3 text-start font-semibold">
                      {t("wallet.description")}
                    </th>
                    <th className="px-4 py-3 text-end font-semibold">{t("wallet.amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.transactions.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center text-sm text-muted-foreground"
                      >
                        {t("wallet.noTransactions")}
                      </td>
                    </tr>
                  )}
                  {data.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-accent/30">
                      <td className="ez-num px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(tx.created_at, locale)}
                        <span className="block text-[10px]">{tx.reference}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            tx.direction === "in"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {tx.direction === "in" ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {tx.direction === "in" ? t("wallet.in") : t("wallet.out")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p>
                          {t(`wallet.txType.${tx.type}`) !== `wallet.txType.${tx.type}`
                            ? t(`wallet.txType.${tx.type}`)
                            : tx.type_label}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{tx.description}</p>
                      </td>
                      <td
                        className={cn(
                          "ez-num px-4 py-3 text-end font-bold",
                          tx.direction === "in" ? "text-success" : "text-destructive",
                        )}
                      >
                        {tx.direction === "in" ? "+" : "-"}
                        {formatMoney(tx.amount)} {t("common.currency")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone: "primary" | "success" | "warning" | "info";
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    info: "bg-info/10 text-info",
  };
  return (
    <div className="ez-card ez-shadow flex flex-col justify-between p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={cn("grid h-9 w-9 place-items-center rounded-xl", toneMap[tone])}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <p className="ez-num text-xl font-bold tracking-tight">{value}</p>
        {hint && (
          <p className="ez-num mt-1 text-[11px] font-medium text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Dialogs ---------------- */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="ez-card w-full max-w-md border border-border ez-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none transition focus:border-ring focus:bg-background";

/** Owner only — min 10,000, one pending request at a time, amount is held immediately. */
function WithdrawDialog({ wallet, onClose }: { wallet: WalletSummary; onClose: () => void }) {
  const { t } = useApp();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () => walletApi.requestWithdrawal(Number(amount)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast.success(t("wallet.withdrawRequested"));
      onClose();
    },
    onError: (e) => setError(errorMessage(e, t("states.errorDesc"))),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    submit.mutate();
  };

  return (
    <Modal title={t("wallet.withdraw")} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="space-y-3 p-5">
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <p className="ez-num text-xs text-muted-foreground">
            {t("wallet.balance")}:{" "}
            <span className="font-semibold text-foreground">
              {money(wallet.balance, wallet.currency, t)}
            </span>{" "}
            · {t("wallet.minWithdrawal")}: {money(wallet.min_withdrawal, wallet.currency, t)}
          </p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {t("wallet.amount")}
            </span>
            <input
              type="number"
              min={wallet.min_withdrawal}
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(inputCls, "ez-num")}
            />
          </label>
          {wallet.payout_account && (
            <p className="text-xs text-muted-foreground">
              → {wallet.payout_account.bank_name}{" "}
              <span className="ez-num" dir="ltr">
                {wallet.payout_account.iban_masked}
              </span>
            </p>
          )}
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
            disabled={submit.isPending || !amount}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("wallet.withdraw")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Owner only — changing the account resets is_verified until admins confirm it. */
function PayoutDialog({ wallet, onClose }: { wallet: WalletSummary; onClose: () => void }) {
  const { t } = useApp();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    bank_name: wallet.payout_account?.bank_name ?? "",
    account_holder: wallet.payout_account?.account_holder ?? "",
    iban: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () => walletApi.updatePayoutAccount(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast.success(t("wallet.payoutUpdated"));
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.errors) setErrors(e.errors);
      setError(errorMessage(e, t("states.errorDesc")));
    },
  });

  const field = (key: keyof typeof form, label: string, ltr = false) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        required
        dir={ltr ? "ltr" : undefined}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className={cn(inputCls, errors[key] && "border-destructive")}
      />
      {errors[key]?.[0] && (
        <span className="mt-1 block text-xs text-destructive">{errors[key][0]}</span>
      )}
    </label>
  );

  return (
    <Modal title={t("wallet.payoutMethod")} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setErrors({});
          submit.mutate();
        }}
      >
        <div className="space-y-3 p-5">
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {field("bank_name", t("wallet.bankNameLabel"))}
          {field("account_holder", t("wallet.accountHolder"))}
          {field("iban", "IBAN", true)}
          <p className="text-[11px] text-muted-foreground">{t("wallet.payoutReverify")}</p>
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
            disabled={submit.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
