import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Trash2,
  Download,
  ChevronRight,
  Search,
  X,
  Check,
  AlertTriangle,
  Info,
  CircleDot,
} from "lucide-react";
import { useApp } from "@/i18n/AppProviders";
import { PageHeader, StatusPill, StatCard } from "@/components/ui-ez/Primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/design-system")({
  head: () => ({
    meta: [
      { title: "نظام التصميم — Yalla Vendor" },
      { name: "description", content: "دليل نظام التصميم لمنصة Yalla للتجار" },
    ],
  }),
  component: DesignSystemPage,
});

function DesignSystemPage() {
  const { t } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <PageHeader title={t("ds.title")} subtitle={t("ds.subtitle")} />

      {/* Section: Colors */}
      <Section title={t("ds.colors")} description={t("ds.colorsDesc")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Swatch name="primary" cssVar="--color-primary" hex="#8FD91C" />
          <Swatch name="primary-soft" cssVar="--color-primary-soft" />
          <Swatch name="success" cssVar="--color-success" />
          <Swatch name="warning" cssVar="--color-warning" />
          <Swatch name="info" cssVar="--color-info" />
          <Swatch name="destructive" cssVar="--color-destructive" />
          <Swatch name="background" cssVar="--color-background" bordered />
          <Swatch name="card" cssVar="--color-card" bordered />
          <Swatch name="muted" cssVar="--color-muted" bordered />
          <Swatch name="accent" cssVar="--color-accent" bordered />
          <Swatch name="foreground" cssVar="--color-foreground" />
          <Swatch name="border" cssVar="--color-border" bordered />
        </div>
      </Section>

      {/* Section: Typography */}
      <Section title={t("ds.typography")} description={t("ds.typographyDesc")}>
        <div className="space-y-4">
          <TypeRow size="text-4xl" weight="font-bold" label="Display / 36 / Bold">
            مرحباً بك في Yalla
          </TypeRow>
          <TypeRow size="text-2xl" weight="font-bold" label="H1 / 24 / Bold">
            عنوان الصفحة الرئيسي
          </TypeRow>
          <TypeRow size="text-lg" weight="font-semibold" label="H2 / 18 / Semibold">
            عنوان قسم
          </TypeRow>
          <TypeRow size="text-base" weight="font-medium" label="Body / 16 / Medium">
            نص أساسي يستخدم في الفقرات والمحتوى الرئيسي.
          </TypeRow>
          <TypeRow size="text-sm" weight="font-normal" label="Body Sm / 14 / Regular">
            نص ثانوي يستخدم في الجداول والتفاصيل.
          </TypeRow>
          <TypeRow size="text-xs" weight="font-medium" label="Caption / 12 / Medium" muted>
            تسميات وملاحظات صغيرة
          </TypeRow>
          <TypeRow size="text-base" weight="font-semibold" label="Numeric / Tabular" mono>
            <span className="ez-num">1,250,000 د.ع</span>
          </TypeRow>
        </div>
      </Section>

      {/* Section: Buttons */}
      <Section title={t("ds.buttons")} description={t("ds.buttonsDesc")}>
        <div className="space-y-5">
          <Group label={t("ds.variants")}>
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Primary
            </button>
            <button className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">
              Secondary
            </button>
            <button className="rounded-lg px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent">
              Ghost
            </button>
            <button className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90">
              Destructive
            </button>
            <button className="rounded-lg border border-success/40 bg-success/10 px-4 py-2 text-sm font-semibold text-success hover:bg-success/15">
              Success
            </button>
            <button
              disabled
              className="cursor-not-allowed rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground opacity-50"
            >
              Disabled
            </button>
          </Group>

          <Group label={t("ds.sizes")}>
            <button className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              XS
            </button>
            <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              SM
            </button>
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              MD
            </button>
            <button className="rounded-lg bg-primary px-5 py-2.5 text-base font-semibold text-primary-foreground">
              LG
            </button>
          </Group>

          <Group label={t("ds.withIcons")}>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> {t("common.add")}
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">
              <Download className="h-4 w-4" /> {t("reports.export")}
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/15">
              <Trash2 className="h-4 w-4" /> {t("common.delete")}
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card hover:bg-accent">
              <ChevronRight className="h-4 w-4" />
            </button>
          </Group>
        </div>
      </Section>

      {/* Section: Status badges */}
      <Section title={t("ds.badges")} description={t("ds.badgesDesc")}>
        <Group>
          <StatusPill status="new" label="New" />
          <StatusPill status="accepted" label="Accepted" />
          <StatusPill status="preparing" label="Preparing" />
          <StatusPill status="ready" label="Ready" />
          <StatusPill status="delivering" label="Delivering" />
          <StatusPill status="completed" label="Completed" />
          <StatusPill status="cancelled" label="Cancelled" />
        </Group>
        <div className="mt-4">
          <Group label={t("ds.tags")}>
            <Tag color="primary" icon={<CircleDot className="h-3 w-3" />}>Featured</Tag>
            <Tag color="success" icon={<Check className="h-3 w-3" />}>Verified</Tag>
            <Tag color="warning" icon={<AlertTriangle className="h-3 w-3" />}>Low stock</Tag>
            <Tag color="info" icon={<Info className="h-3 w-3" />}>Info</Tag>
          </Group>
        </div>
      </Section>

      {/* Section: Forms */}
      <Section title={t("ds.forms")} description={t("ds.formsDesc")}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label={t("ds.textInput")}>
            <input
              defaultValue="مطعم البركة"
              className="h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none transition focus:border-ring focus:bg-background"
            />
          </FormField>

          <FormField label={t("ds.searchInput")}>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder={t("common.search")}
                className="h-10 w-full rounded-lg border border-input bg-secondary/40 ps-9 pe-3 text-sm outline-none transition focus:border-ring focus:bg-background"
              />
            </div>
          </FormField>

          <FormField label={t("ds.select")}>
            <select className="h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-ring focus:bg-background">
              <option>برغر</option>
              <option>بيتزا</option>
              <option>شاورما</option>
            </select>
          </FormField>

          <FormField label={t("ds.errorState")} error={t("ds.errorMsg")}>
            <input
              defaultValue="abc"
              className="h-10 w-full rounded-lg border border-destructive bg-destructive/5 px-3 text-sm outline-none focus:border-destructive"
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField label={t("ds.textarea")}>
              <textarea
                rows={3}
                defaultValue="وصف اختياري للمتجر يظهر للزبائن في صفحة التفاصيل."
                className="w-full rounded-lg border border-input bg-secondary/40 p-3 text-sm outline-none focus:border-ring focus:bg-background"
              />
            </FormField>
          </div>

          <div className="flex items-center gap-3">
            <input id="cb1" type="checkbox" defaultChecked className="h-4 w-4 rounded border-input accent-primary" />
            <label htmlFor="cb1" className="text-sm">{t("ds.checkbox")}</label>
          </div>
          <div className="flex items-center gap-3">
            <ToggleSwitch />
            <span className="text-sm">{t("ds.toggle")}</span>
          </div>
        </div>
      </Section>

      {/* Section: Cards */}
      <Section title={t("ds.cards")} description={t("ds.cardsDesc")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Today's Orders" value="48" delta="+12%" icon={<CircleDot className="h-5 w-5" />} tone="primary" />
          <StatCard label="Revenue" value="612k" delta="+8.4%" icon={<CircleDot className="h-5 w-5" />} tone="success" />
          <StatCard label="Avg. Prep" value="14 min" delta="-2 min" icon={<CircleDot className="h-5 w-5" />} tone="info" />
          <StatCard label="Rating" value="4.8" delta="312 reviews" icon={<CircleDot className="h-5 w-5" />} tone="warning" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="ez-card ez-shadow p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic Card</p>
            <h4 className="mt-2 text-base font-semibold">Standard container</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              يستخدم لعرض المحتوى المنظم مع حواف ناعمة وظل خفيف.
            </p>
          </div>
          <div className="ez-card ez-shadow border-primary/40 bg-primary-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Highlight Card</p>
            <h4 className="mt-2 text-base font-semibold text-primary">Featured action</h4>
            <p className="mt-1 text-sm text-foreground/80">
              يبرز معلومة مهمة بلون العلامة التجارية.
            </p>
          </div>
          <div className="ez-gradient relative overflow-hidden rounded-2xl p-5 text-primary-foreground ez-shadow">
            <div className="absolute -end-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <p className="relative text-xs font-semibold uppercase tracking-wider opacity-80">Gradient Card</p>
            <h4 className="relative mt-2 text-base font-semibold">Hero / Wallet</h4>
            <p className="relative mt-1 text-sm opacity-90">
              يستخدم في بطاقات الرصيد والترويج.
            </p>
          </div>
        </div>
      </Section>

      {/* Section: Table */}
      <Section title={t("ds.tables")} description={t("ds.tablesDesc")}>
        <div className="ez-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">رقم الطلب</th>
                  <th className="px-4 py-3 text-start font-semibold">الزبون</th>
                  <th className="px-4 py-3 text-end font-semibold">المبلغ</th>
                  <th className="px-4 py-3 text-start font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { id: "EZ-10240", c: "أحمد الجبوري", a: "23,500", s: "new" },
                  { id: "EZ-10239", c: "ليلى عبد الرزاق", a: "15,000", s: "preparing" },
                  { id: "EZ-10238", c: "زينب علي", a: "20,500", s: "ready" },
                  { id: "EZ-10237", c: "محمد حسين", a: "45,000", s: "completed" },
                ].map((r) => (
                  <tr key={r.id} className="hover:bg-accent/30">
                    <td className="ez-num px-4 py-3 text-xs font-semibold">{r.id}</td>
                    <td className="px-4 py-3">{r.c}</td>
                    <td className="ez-num px-4 py-3 text-end font-semibold">{r.a} د.ع</td>
                    <td className="px-4 py-3"><StatusPill status={r.s} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Section: Modals */}
      <Section title={t("ds.modals")} description={t("ds.modalsDesc")}>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {t("ds.openModal")}
          </button>
        </div>

        {/* Inline modal preview (always visible) */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("ds.preview")}
          </p>
          <div className="ez-card ez-shadow mx-auto max-w-md overflow-hidden">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h3 className="text-base font-semibold">تأكيد الحذف</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  هذا الإجراء لا يمكن التراجع عنه.
                </p>
              </div>
              <button className="rounded-md p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 text-sm">
              هل أنت متأكد من حذف هذا الصنف من القائمة؟
            </div>
            <div className="flex justify-end gap-2 border-t border-border bg-secondary/40 p-4">
              <button className="rounded-lg border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">
                إلغاء
              </button>
              <button className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90">
                حذف
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Section: Alerts */}
      <Section title={t("ds.alerts")} description={t("ds.alertsDesc")}>
        <div className="space-y-3">
          <Alert tone="info" icon={<Info className="h-4 w-4" />} title="معلومة" body="ستبدأ التسوية المالية يوم الأربعاء." />
          <Alert tone="success" icon={<Check className="h-4 w-4" />} title="تم بنجاح" body="تم حفظ التغييرات على القائمة." />
          <Alert tone="warning" icon={<AlertTriangle className="h-4 w-4" />} title="تنبيه" body="بعض الأصناف بدون صورة." />
          <Alert tone="destructive" icon={<X className="h-4 w-4" />} title="خطأ" body="تعذّر إتمام عملية الحفظ. حاول مجدداً." />
        </div>
      </Section>

      {/* Section: Spacing & Radius */}
      <Section title={t("ds.tokens")} description={t("ds.tokensDesc")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="ez-card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("ds.radius")}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              {([
                ["sm", "rounded-sm"],
                ["md", "rounded-md"],
                ["lg", "rounded-lg"],
                ["xl", "rounded-xl"],
                ["2xl", "rounded-2xl"],
                ["full", "rounded-full"],
              ] as const).map(([n, c]) => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <div className={cn("h-12 w-12 bg-primary", c)} />
                  <span className="ez-num text-[10px] text-muted-foreground">{n}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ez-card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("ds.shadow")}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="ez-card p-4 text-center text-xs">none</div>
              <div className="ez-card ez-shadow p-4 text-center text-xs">ez-shadow</div>
              <div className="ez-card p-4 text-center text-xs shadow-xl">xl</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Modal overlay */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="ez-card ez-shadow w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h3 className="text-base font-semibold">{t("ds.modalTitle")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t("ds.modalDesc")}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="rounded-md p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 text-sm">
              {t("ds.modalBody")}
            </div>
            <div className="flex justify-end gap-2 border-t border-border bg-secondary/40 p-4">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                {t("common.cancel")}
              </button>
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Group({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Swatch({
  name,
  cssVar,
  hex,
  bordered,
}: {
  name: string;
  cssVar: string;
  hex?: string;
  bordered?: boolean;
}) {
  return (
    <div className="ez-card overflow-hidden">
      <div
        className={cn("h-16 w-full", bordered && "border-b border-border")}
        style={{ background: `var(${cssVar})` }}
      />
      <div className="p-3">
        <p className="text-xs font-semibold">{name}</p>
        <p className="ez-num mt-0.5 truncate text-[10px] text-muted-foreground">
          {hex ?? cssVar}
        </p>
      </div>
    </div>
  );
}

function TypeRow({
  size,
  weight,
  label,
  muted,
  mono,
  children,
}: {
  size: string;
  weight: string;
  label: string;
  muted?: boolean;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="ez-card flex items-center justify-between gap-4 p-4">
      <div className={cn(size, weight, muted && "text-muted-foreground", mono && "ez-num")}>
        {children}
      </div>
      <span className="ez-num shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
      {error && (
        <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>
      )}
    </label>
  );
}

function ToggleSwitch() {
  const [on, setOn] = useState(true);
  return (
    <button
      onClick={() => setOn(!on)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        on ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform",
          on ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"
        )}
      />
    </button>
  );
}

function Tag({
  color,
  icon,
  children,
}: {
  color: "primary" | "success" | "warning" | "info";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    primary: "bg-primary-soft text-primary border-primary/20",
    success: "bg-success/10 text-success border-success/25",
    warning: "bg-warning/15 text-warning-foreground border-warning/30",
    info: "bg-info/10 text-info border-info/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        map[color]
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function Alert({
  tone,
  icon,
  title,
  body,
}: {
  tone: "info" | "success" | "warning" | "destructive";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const map: Record<string, string> = {
    info: "border-info/30 bg-info/10 text-info",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/40 bg-warning/15 text-warning-foreground",
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  };
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-3 text-sm", map[tone])}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-xs opacity-90 text-foreground/80">{body}</p>
      </div>
    </div>
  );
}
