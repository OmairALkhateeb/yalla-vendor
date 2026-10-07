import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Reply, Loader2, Trash2, Pencil, MessageSquareReply } from "lucide-react";
import { useApp } from "@/i18n/AppProviders";
import { PageHeader } from "@/components/ui-ez/Primitives";
import { EmptyState, SkeletonList } from "@/components/ui-ez/States";
import { QueryState, errorMessage } from "@/components/ui-ez/QueryState";
import { reviewsApi } from "@/lib/api/vendor";
import type { Review } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "التقييمات — Yalla Vendor" },
      { name: "description", content: "اقرأ ورد على ملاحظات زبائنك" },
    ],
  }),
  component: ReviewsPage,
});

type RepliedFilter = "all" | "replied" | "unreplied";

function ReviewsPage() {
  const { t } = useApp();
  const [rating, setRating] = useState<number | undefined>();
  const [replied, setReplied] = useState<RepliedFilter>("all");
  const [perPage, setPerPage] = useState(20);

  const query = useQuery({
    queryKey: ["reviews", rating, replied, perPage],
    queryFn: () =>
      reviewsApi.list({
        rating,
        replied: replied === "all" ? undefined : replied === "replied",
        per_page: perPage,
      }),
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <PageHeader title={t("reviews.title")} subtitle={t("reviews.subtitle")} />

      <QueryState query={query} loading={<SkeletonList rows={4} />}>
        {(data) => {
          const s = data.summary;
          const avg = s.average ?? 0;
          return (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
              <div className="ez-card ez-shadow h-fit p-6">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("perf.avgRating")}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="ez-num text-5xl font-bold">{formatNumber(s.average)}</span>
                  <span className="text-sm text-muted-foreground">/ 5</span>
                </div>
                <div className="mt-2 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i <= Math.round(avg) ? "fill-warning text-warning" : "text-muted",
                      )}
                    />
                  ))}
                </div>
                <p className="ez-num mt-3 text-xs text-muted-foreground">
                  {s.total} {t("dash.reviewsCount")} · {s.unreplied} {t("reviews.unreplied")}
                </p>

                <div className="mt-5 space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const c = s.distribution[String(stars) as "1"] ?? 0;
                    const pct = s.total ? (c / s.total) * 100 : 0;
                    const active = rating === stars;
                    return (
                      <button
                        key={stars}
                        onClick={() => setRating(active ? undefined : stars)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded px-1 text-xs",
                          active && "bg-warning/10",
                        )}
                      >
                        <span className="ez-num w-3">{stars}</span>
                        <Star className="h-3 w-3 text-warning" />
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-warning"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="ez-num w-4 text-end text-muted-foreground">{c}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center gap-1 rounded-lg bg-muted p-1">
                  {(["all", "unreplied", "replied"] as RepliedFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setReplied(f)}
                      className={cn(
                        "flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                        replied === f
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {f === "all" ? t("common.all") : t(`reviews.${f}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                {data.reviews.length === 0 ? (
                  <EmptyState icon={<Star className="h-7 w-7" />} title={t("reviews.empty")} />
                ) : (
                  <ul className="space-y-3">
                    {data.reviews.map((r) => (
                      <ReviewCard key={r.id} review={r} />
                    ))}
                  </ul>
                )}
                {data.meta.current_page < data.meta.last_page && (
                  <div className="mt-3 text-center">
                    <button
                      onClick={() => setPerPage((n) => n + 20)}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent"
                    >
                      {query.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {t("common.loadMore")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        }}
      </QueryState>
    </div>
  );
}

function ReviewCard({ review: r }: { review: Review }) {
  const { t, locale } = useApp();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(r.reply?.text ?? "");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["reviews"] });
  const save = useMutation({
    mutationFn: () => reviewsApi.reply(r.id, text.trim()),
    onSuccess: () => {
      setEditing(false);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e, t("states.errorDesc"))),
  });
  const remove = useMutation({
    mutationFn: () => reviewsApi.deleteReply(r.id),
    onSuccess: () => {
      setText("");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e, t("states.errorDesc"))),
  });

  const canReply = can("reply_reviews");

  return (
    <li className="ez-card ez-shadow p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary">
          {r.customer.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{r.customer.name}</p>
            <span className="ez-num text-xs text-muted-foreground">
              {formatDate(r.created_at, locale)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3.5 w-3.5",
                    i <= r.rating ? "fill-warning text-warning" : "text-muted",
                  )}
                />
              ))}
            </div>
            <span className="ez-num text-[11px] text-muted-foreground">{r.reference}</span>
          </div>
          {r.comment && (
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{r.comment}</p>
          )}

          {/* Existing reply */}
          {r.reply && !editing && (
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary-soft/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <MessageSquareReply className="h-3.5 w-3.5" /> {t("reviews.yourReply")}
                </p>
                <span className="ez-num text-[10px] text-muted-foreground">
                  {formatDate(r.reply.replied_at, locale)}
                </span>
              </div>
              <p className="mt-1 text-sm">{r.reply.text}</p>
              {canReply && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Pencil className="h-3 w-3" /> {t("common.edit")}
                  </button>
                  <button
                    disabled={remove.isPending}
                    onClick={() => confirm(t("reviews.confirmDeleteReply")) && remove.mutate()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
                  >
                    {remove.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}{" "}
                    {t("common.delete")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reply editor */}
          {canReply && editing && (
            <div className="mt-3 space-y-2">
              <textarea
                autoFocus
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("reviews.replyPlaceholder")}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setText(r.reply?.text ?? "");
                  }}
                  className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                >
                  {t("common.cancel")}
                </button>
                <button
                  disabled={save.isPending || !text.trim()}
                  onClick={() => save.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t("reviews.sendReply")}
                </button>
              </div>
            </div>
          )}

          {canReply && !r.reply && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
            >
              <Reply className="h-3.5 w-3.5" /> {t("reviews.reply")}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
