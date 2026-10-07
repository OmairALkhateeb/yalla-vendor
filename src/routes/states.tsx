import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/i18n/AppProviders";
import { PageHeader } from "@/components/ui-ez/Primitives";
import {
  EmptyOrders,
  EmptyMenu,
  EmptySearch,
  LoadingState,
  SkeletonList,
  SkeletonCards,
  ErrorState,
  OfflineState,
  OfflineBanner,
} from "@/components/ui-ez/States";

export const Route = createFileRoute("/states")({
  head: () => ({
    meta: [
      { title: "حالات الواجهة — Yalla Vendor" },
      { name: "description", content: "معرض لجميع حالات الواجهة" },
    ],
  }),
  component: StatesPage,
});

function StatesPage() {
  const { t } = useApp();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );

  return (
    <div>
      <PageHeader title={t("states.title")} subtitle={t("states.subtitle")} />

      <div className="space-y-8">
        <Section title={t("states.emptyOrders")}>
          <EmptyOrders
            title={t("states.emptyOrdersTitle")}
            description={t("states.emptyOrdersDesc")}
            actionLabel={t("orders.refresh")}
            onAction={() => {}}
          />
        </Section>

        <Section title={t("states.emptyMenu")}>
          <EmptyMenu
            title={t("states.emptyMenuTitle")}
            description={t("states.emptyMenuDesc")}
            actionLabel={t("menu.addItem")}
            onAction={() => {}}
          />
        </Section>

        <Section title={t("states.emptySearch")}>
          <EmptySearch
            title={t("states.emptySearchTitle")}
            description={t("states.emptySearchDesc")}
          />
        </Section>

        <Section title={t("states.loading")}>
          <LoadingState label={t("states.loadingLabel")} />
        </Section>

        <Section title={t("states.skeletonList")}>
          <SkeletonList rows={4} />
        </Section>

        <Section title={t("states.skeletonCards")}>
          <SkeletonCards count={3} />
        </Section>

        <Section title={t("states.error")}>
          <ErrorState
            title={t("states.errorTitle")}
            description={t("states.errorDesc")}
            retryLabel={t("states.retry")}
            onRetry={() => {}}
          />
        </Section>

        <Section title={t("states.offline")}>
          <OfflineBanner label={t("states.offlineBanner")} />
          <OfflineState
            title={t("states.offlineTitle")}
            description={t("states.offlineDesc")}
            retryLabel={t("states.retry")}
            onRetry={() => {}}
          />
        </Section>
      </div>
    </div>
  );
}
