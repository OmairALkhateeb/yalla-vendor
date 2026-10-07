import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LifeBuoy, Loader2, Send, X } from "lucide-react";
import { useApp } from "@/i18n/AppProviders";
import { PageHeader } from "@/components/ui-ez/Primitives";
import { EmptyState, SkeletonList } from "@/components/ui-ez/States";
import { QueryState, errorMessage } from "@/components/ui-ez/QueryState";
import { ApiError } from "@/lib/api/client";
import { supportApi } from "@/lib/api/vendor";
import type { SupportTicket } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "الدعم — Yalla Vendor" },
      { name: "description", content: "تواصل مع فريق دعم Yalla" },
    ],
  }),
  component: SupportPage,
});

const inputCls =
  "w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none transition focus:border-ring focus:bg-background";

function SupportPage() {
  const { t, locale } = useApp();
  const queryClient = useQueryClient();
  const tickets = useQuery({ queryKey: ["support"], queryFn: supportApi.list });
  const [openId, setOpenId] = useState<number | null>(null);
  const [form, setForm] = useState({ subject: "", description: "", order_id: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const create = useMutation({
    mutationFn: () =>
      supportApi.create({
        subject: form.subject.trim(),
        description: form.description.trim(),
        order_id: form.order_id ? Number(form.order_id.replace(/\D/g, "")) : null,
      }),
    onSuccess: () => {
      setForm({ subject: "", description: "", order_id: "" });
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ["support"] });
      toast.success(t("support.sent"));
    },
    onError: (e) => {
      if (e instanceof ApiError && e.errors) setErrors(e.errors);
      toast.error(errorMessage(e, t("states.errorDesc")));
    },
  });

  return (
    <div>
      <PageHeader title={t("support.title")} subtitle={t("support.subtitle")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="ez-card ez-shadow">
          <div className="border-b border-border p-5">
            <h3 className="text-base font-semibold">{t("support.tickets")}</h3>
          </div>
          <div className="p-3">
            <QueryState query={tickets} loading={<SkeletonList rows={3} />}>
              {(data) =>
                data.tickets.length === 0 ? (
                  <EmptyState
                    icon={<LifeBuoy className="h-7 w-7" />}
                    title={t("support.empty")}
                    className="shadow-none"
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {data.tickets.map((tk) => (
                      <li key={tk.id}>
                        <button
                          onClick={() => setOpenId(tk.id)}
                          className="flex w-full items-start gap-3 rounded-lg px-2 py-3 text-start hover:bg-accent/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{tk.subject}</p>
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {tk.description}
                            </p>
                          </div>
                          <div className="shrink-0 text-end">
                            {tk.status && <TicketStatus status={String(tk.status)} />}
                            {tk.created_at && (
                              <p className="ez-num mt-1 text-[10px] text-muted-foreground">
                                {formatDate(String(tk.created_at), locale)}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              }
            </QueryState>
          </div>
        </section>

        <form
          className="ez-card ez-shadow h-fit space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <h3 className="text-base font-semibold">{t("support.new")}</h3>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {t("support.subject")}
            </span>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className={cn(inputCls, "h-10")}
            />
            {errors.subject?.[0] && (
              <span className="mt-1 block text-xs text-destructive">{errors.subject[0]}</span>
            )}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {t("support.description")}
            </span>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={cn(inputCls, "py-2")}
            />
            {errors.description?.[0] && (
              <span className="mt-1 block text-xs text-destructive">{errors.description[0]}</span>
            )}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {t("support.orderId")}
            </span>
            <input
              dir="ltr"
              inputMode="numeric"
              value={form.order_id}
              onChange={(e) => setForm((f) => ({ ...f, order_id: e.target.value }))}
              placeholder="42"
              className={cn(inputCls, "ez-num h-10")}
            />
            {errors.order_id?.[0] && (
              <span className="mt-1 block text-xs text-destructive">{errors.order_id[0]}</span>
            )}
          </label>
          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("support.submit")}
          </button>
        </form>
      </div>

      {openId !== null && <TicketDialog id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function TicketStatus({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
      {status.replace(/_/g, " ")}
    </span>
  );
}

function TicketDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { t, locale } = useApp();
  const ticket = useQuery({ queryKey: ["support", id], queryFn: () => supportApi.show(id) });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="ez-card w-full max-w-lg border border-border ez-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold">{t("support.ticket")}</h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          <QueryState query={ticket}>
            {(tk: SupportTicket) => (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{tk.subject}</p>
                  {tk.status && <TicketStatus status={String(tk.status)} />}
                </div>
                {tk.created_at && (
                  <p className="ez-num text-xs text-muted-foreground">
                    {formatDate(String(tk.created_at), locale, true)}
                  </p>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{tk.description}</p>
                {tk.order_id ? (
                  <p className="ez-num text-xs text-muted-foreground">#{tk.order_id}</p>
                ) : null}
                {/* Any admin reply fields the backend returns (not documented yet) */}
                {Object.entries(tk)
                  .filter(
                    ([k, v]) => /reply|response|admin_note/i.test(k) && typeof v === "string" && v,
                  )
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-lg border border-primary/20 bg-primary-soft/40 p-3 text-sm"
                    >
                      {String(v)}
                    </div>
                  ))}
              </div>
            )}
          </QueryState>
        </div>
      </div>
    </div>
  );
}
