import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Store,
  Clock,
  Bell,
  UserCog,
  Palette,
  Users,
  Sun,
  Moon,
  Upload,
  Check,
  X,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useApp } from "@/i18n/AppProviders";
import { LOCALES, type Locale } from "@/i18n/translations";
import { PageHeader } from "@/components/ui-ez/Primitives";
import { LoadingState } from "@/components/ui-ez/States";
import { QueryState, errorMessage } from "@/components/ui-ez/QueryState";
import { ApiError } from "@/lib/api/client";
import { authApi, storeApi, teamApi } from "@/lib/api/vendor";
import type {
  DayHours,
  DayKey,
  NotificationPrefs,
  Store as StoreT,
  TeamMember,
  WorkingHours,
} from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — Yalla Vendor" },
      { name: "description", content: "أدر معلومات وإعدادات مطعمك" },
    ],
  }),
  component: SettingsPage,
});

type SectionKey = "store" | "hours" | "account" | "notifications" | "team" | "appearance";

const SECTIONS: { key: SectionKey; icon: typeof Store; labelKey: string }[] = [
  { key: "store", icon: Store, labelKey: "settings.storeInfo" },
  { key: "hours", icon: Clock, labelKey: "settings.workingHours" },
  { key: "account", icon: UserCog, labelKey: "settings.account" },
  { key: "notifications", icon: Bell, labelKey: "settings.notifications" },
  { key: "team", icon: Users, labelKey: "settings.team" },
  { key: "appearance", icon: Palette, labelKey: "settings.appearance" },
];

function useSaveToast() {
  const { t } = useApp();
  return {
    onSaved: () => toast.success(t("common.saved")),
    onError: (e: unknown) => toast.error(errorMessage(e, t("states.errorDesc"))),
  };
}

function SettingsPage() {
  const { t, locale, theme, setTheme } = useApp();
  const { can, changeLocale } = useAuth();
  const [active, setActive] = useState<SectionKey>("store");
  const sections = SECTIONS.filter((s) => s.key !== "team" || can("manage_team"));

  return (
    <div>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* Side nav */}
        <aside className="ez-card ez-shadow h-fit p-2 lg:sticky lg:top-20">
          <ul className="space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.key;
              return (
                <li key={s.key}>
                  <button
                    onClick={() => setActive(s.key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
                      isActive
                        ? "bg-primary-soft font-semibold text-primary"
                        : "hover:bg-accent/60",
                    )}
                  >
                    <Icon
                      className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")}
                    />
                    {t(s.labelKey)}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Content */}
        <div className="space-y-4">
          {active === "store" && <StoreInfoSection />}
          {active === "hours" && <WorkingHoursSection />}
          {active === "account" && <AccountSection />}
          {active === "notifications" && <NotificationsSection />}
          {active === "team" && can("manage_team") && <TeamSection />}
          {active === "appearance" && (
            <AppearanceSection
              locale={locale}
              setLocale={changeLocale}
              theme={theme}
              setTheme={setTheme}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Store info ---------------- */

type StoreForm = {
  name: string;
  cuisine_category_id: number | null;
  phone: string;
  email: string;
  address: string;
  description: string;
  prep_time_minutes: string;
};

const toStoreForm = (s: StoreT): StoreForm => ({
  name: s.name ?? "",
  cuisine_category_id: s.cuisine_category_id,
  phone: s.phone ?? "",
  email: s.email ?? "",
  address: s.address ?? "",
  description: s.description ?? "",
  prep_time_minutes: s.prep_time_minutes === null ? "" : String(s.prep_time_minutes),
});

function StoreInfoSection() {
  const { t } = useApp();
  const { can, refreshMe } = useAuth();
  const queryClient = useQueryClient();
  const { onSaved, onError } = useSaveToast();
  const editable = can("manage_store");
  const store = useQuery({ queryKey: ["store"], queryFn: storeApi.get });
  const cuisines = useQuery({
    queryKey: ["cuisine-categories"],
    queryFn: storeApi.cuisineCategories,
    staleTime: 3_600_000,
  });
  const [form, setForm] = useState<StoreForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (store.data) setForm(toStoreForm(store.data));
  }, [store.data]);

  const afterStoreChange = (s: StoreT) => {
    queryClient.setQueryData(["store"], s);
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void refreshMe(); // restaurant name / logo in the shell
  };

  const save = useMutation({
    mutationFn: (f: StoreForm) =>
      storeApi.update({
        name: f.name,
        cuisine_category_id: f.cuisine_category_id,
        phone: f.phone || null,
        email: f.email || null,
        address: f.address || null,
        description: f.description || null,
        prep_time_minutes: f.prep_time_minutes === "" ? null : Number(f.prep_time_minutes),
      }),
    onSuccess: (s) => {
      setErrors({});
      afterStoreChange(s);
      onSaved();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.errors) setErrors(e.errors);
      onError(e);
    },
  });

  const uploadLogo = useMutation({
    mutationFn: (file: File) => storeApi.uploadLogo(file),
    onSuccess: (s) => {
      afterStoreChange(s);
      onSaved();
    },
    onError,
  });
  const deleteLogo = useMutation({
    mutationFn: storeApi.deleteLogo,
    onSuccess: (s) => {
      afterStoreChange(s);
      onSaved();
    },
    onError,
  });

  const set = <K extends keyof StoreForm>(k: K, v: StoreForm[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <SectionCard title={t("settings.storeInfo")} description={t("settings.storeInfoHint")}>
      <QueryState query={store}>
        {(s) =>
          !form ? null : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(form);
              }}
            >
              {/* Logo */}
              <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary-soft text-2xl font-bold text-primary ring-2 ring-primary/20">
                  {s.logo ? (
                    <img src={s.logo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    s.name.slice(0, 2)
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{t("settings.storeLogo")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("settings.storeLogoHint")}
                  </p>
                  {editable && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={uploadLogo.isPending}
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-60"
                      >
                        {uploadLogo.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}{" "}
                        {t("settings.uploadLogo")}
                      </button>
                      {s.logo && (
                        <button
                          type="button"
                          disabled={deleteLogo.isPending}
                          onClick={() => deleteLogo.mutate()}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
                        >
                          {t("common.delete")}
                        </button>
                      )}
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (!f) return;
                          if (f.size > 2 * 1024 * 1024) return toast.error(t("menu.imageTooLarge"));
                          uploadLogo.mutate(f);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <fieldset disabled={!editable} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label={t("settings.storeName")}
                  value={form.name}
                  onChange={(v) => set("name", v)}
                  error={errors.name?.[0]}
                />
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    {t("settings.storeType")}
                  </span>
                  <select
                    value={form.cuisine_category_id ?? ""}
                    onChange={(e) =>
                      set("cuisine_category_id", e.target.value ? Number(e.target.value) : null)
                    }
                    className="h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none transition focus:border-ring focus:bg-background"
                  >
                    <option value="">
                      {cuisines.isPending ? "…" : t("settings.chooseCuisine")}
                    </option>
                    {cuisines.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.cuisine_category_id?.[0] && (
                    <span className="mt-1 block text-xs text-destructive">
                      {errors.cuisine_category_id[0]}
                    </span>
                  )}
                </label>
                <Field
                  label={t("settings.phone")}
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                  ltr
                  error={errors.phone?.[0]}
                />
                <Field
                  label={t("settings.email")}
                  type="email"
                  value={form.email}
                  onChange={(v) => set("email", v)}
                  ltr
                  error={errors.email?.[0]}
                />
                <Field
                  label={t("settings.prepTime")}
                  type="number"
                  value={form.prep_time_minutes}
                  onChange={(v) => set("prep_time_minutes", v)}
                  error={errors.prep_time_minutes?.[0]}
                />
                <div />
                <div className="sm:col-span-2">
                  <Field
                    label={t("settings.address")}
                    value={form.address}
                    onChange={(v) => set("address", v)}
                    error={errors.address?.[0]}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      {t("settings.bio")}
                    </span>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      className="w-full rounded-lg border border-input bg-secondary/40 p-3 text-sm outline-none transition focus:border-ring focus:bg-background"
                    />
                  </label>
                </div>
              </fieldset>

              {editable && (
                <Footer pending={save.isPending} onCancel={() => setForm(toStoreForm(s))} />
              )}
            </form>
          )
        }
      </QueryState>
    </SectionCard>
  );
}

/* ---------------- Working hours ---------------- */

const DAYS_KEYS: DayKey[] = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];

function WorkingHoursSection() {
  const { t } = useApp();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { onSaved, onError } = useSaveToast();
  const editable = can("manage_store");
  const hours = useQuery({ queryKey: ["working-hours"], queryFn: storeApi.workingHours });
  const [days, setDays] = useState<WorkingHours["days"] | null>(null);

  useEffect(() => {
    if (hours.data) setDays(hours.data.days);
  }, [hours.data]);

  const save = useMutation({
    mutationFn: (d: WorkingHours["days"]) => storeApi.updateWorkingHours(d),
    onSuccess: (res) => {
      queryClient.setQueryData(["working-hours"], res);
      onSaved();
    },
    onError,
  });

  const setDay = (d: DayKey, patch: Partial<DayHours>) =>
    setDays((prev) => (prev ? { ...prev, [d]: { ...prev[d], ...patch } } : prev));

  return (
    <SectionCard title={t("settings.workingHours")} description={t("settings.workingHoursHint")}>
      <QueryState query={hours}>
        {(h) =>
          !days ? null : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(days);
              }}
            >
              <p
                className={cn(
                  "mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  h.is_open_now ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    h.is_open_now ? "bg-success" : "bg-muted-foreground",
                  )}
                />
                {h.is_open_now ? t("settings.openNow") : t("settings.closedNow")}
              </p>
              <ul className="divide-y divide-border">
                {DAYS_KEYS.map((d) => {
                  const day = days[d];
                  return (
                    <li key={d} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                      <div className="flex w-32 items-center gap-3">
                        <Toggle
                          checked={day.is_open}
                          disabled={!editable}
                          onChange={(v) => setDay(d, { is_open: v })}
                        />
                        <span className="text-sm font-medium">{t(`day.${d}`)}</span>
                      </div>
                      {day.is_open ? (
                        <div className="flex items-center gap-2">
                          <TimeInput
                            disabled={!editable}
                            value={day.from ?? ""}
                            onChange={(v) => setDay(d, { from: v })}
                          />
                          <span className="text-xs text-muted-foreground">{t("settings.to")}</span>
                          <TimeInput
                            disabled={!editable}
                            value={day.to ?? ""}
                            onChange={(v) => setDay(d, { to: v })}
                          />
                          {day.from && day.to && day.to < day.from && (
                            <span className="text-[11px] text-muted-foreground">
                              {t("settings.afterMidnight")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">
                          {t("settings.closedDay")}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {editable && <Footer pending={save.isPending} onCancel={() => setDays(h.days)} />}
            </form>
          )
        }
      </QueryState>
    </SectionCard>
  );
}

/* ---------------- Account & security ---------------- */

function AccountSection() {
  const { t } = useApp();
  const { vendor, refreshMe } = useAuth();
  const { onSaved, onError } = useSaveToast();
  const [profile, setProfile] = useState({
    name: vendor?.name ?? "",
    email: vendor?.email ?? "",
    phone: vendor?.phone ?? "",
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string[]>>({});
  const [pw, setPw] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [pwErrors, setPwErrors] = useState<Record<string, string[]>>({});

  const saveProfile = useMutation({
    mutationFn: () =>
      authApi.updateProfile({
        name: profile.name,
        ...(profile.email ? { email: profile.email } : {}),
        ...(profile.phone ? { phone: profile.phone } : {}),
      }),
    onSuccess: async () => {
      setProfileErrors({});
      await refreshMe();
      onSaved();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.errors) setProfileErrors(e.errors);
      onError(e);
    },
  });

  const savePassword = useMutation({
    mutationFn: () => authApi.changePassword(pw),
    onSuccess: () => {
      setPwErrors({});
      setPw({ current_password: "", password: "", password_confirmation: "" });
      onSaved();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.errors) setPwErrors(e.errors);
      onError(e);
    },
  });

  return (
    <>
      <SectionCard title={t("settings.ownerInfo")} description={t("settings.ownerInfoHint")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t("settings.fullName")}
              value={profile.name}
              onChange={(v) => setProfile((p) => ({ ...p, name: v }))}
              error={profileErrors.name?.[0]}
            />
            <Field label={t("settings.role")} value={vendor?.role_label ?? ""} readOnly />
            <Field
              label={t("settings.email")}
              type="email"
              ltr
              value={profile.email}
              onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
              error={profileErrors.email?.[0]}
            />
            <Field
              label={t("settings.phone")}
              ltr
              value={profile.phone}
              onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
              error={profileErrors.phone?.[0]}
            />
          </div>
          <Footer
            pending={saveProfile.isPending}
            onCancel={() =>
              setProfile({
                name: vendor?.name ?? "",
                email: vendor?.email ?? "",
                phone: vendor?.phone ?? "",
              })
            }
          />
        </form>
      </SectionCard>

      <SectionCard title={t("settings.security")} description={t("settings.securityHint")}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            savePassword.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t("settings.currentPassword")}
              type="password"
              value={pw.current_password}
              onChange={(v) => setPw((p) => ({ ...p, current_password: v }))}
              error={pwErrors.current_password?.[0]}
            />
            <div />
            <Field
              label={t("settings.newPassword")}
              type="password"
              value={pw.password}
              onChange={(v) => setPw((p) => ({ ...p, password: v }))}
              error={pwErrors.password?.[0]}
            />
            <Field
              label={t("settings.confirmPassword")}
              type="password"
              value={pw.password_confirmation}
              onChange={(v) => setPw((p) => ({ ...p, password_confirmation: v }))}
              error={pwErrors.password_confirmation?.[0]}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t("settings.passwordRule")}</p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={savePassword.isPending || !pw.current_password || pw.password.length < 8}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {savePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("settings.updatePassword")}
            </button>
          </div>
        </form>
      </SectionCard>
    </>
  );
}

/* ---------------- Notification preferences ---------------- */

function NotificationsSection() {
  const { t } = useApp();
  const queryClient = useQueryClient();
  const { onError } = useSaveToast();
  const prefs = useQuery({ queryKey: ["notification-prefs"], queryFn: authApi.notificationPrefs });

  // Each toggle saves immediately (partial PUT).
  const save = useMutation({
    mutationFn: (patch: Parameters<typeof authApi.updateNotificationPrefs>[0]) =>
      authApi.updateNotificationPrefs(patch),
    onMutate: (patch) => {
      const prev = queryClient.getQueryData<NotificationPrefs>(["notification-prefs"]);
      if (prev)
        queryClient.setQueryData<NotificationPrefs>(["notification-prefs"], {
          events: { ...prev.events, ...patch.events },
          channels: { ...prev.channels, ...patch.channels },
        });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["notification-prefs"], ctx.prev);
      onError(e);
    },
    onSuccess: (res) => res && queryClient.setQueryData(["notification-prefs"], res),
  });

  const events: { key: keyof NotificationPrefs["events"]; label: string; desc: string }[] = [
    { key: "new_order", label: "settings.notifNewOrder", desc: "settings.notifNewOrderHint" },
    { key: "order_cancelled", label: "settings.notifCancel", desc: "settings.notifCancelHint" },
    { key: "new_review", label: "settings.notifReview", desc: "settings.notifReviewHint" },
    { key: "payout", label: "settings.notifPayout", desc: "settings.notifPayoutHint" },
    { key: "promotions", label: "settings.notifPromo", desc: "settings.notifPromoHint" },
  ];
  const channels: { key: keyof NotificationPrefs["channels"]; label: string }[] = [
    { key: "push", label: "settings.channelPush" },
    { key: "email", label: "settings.channelEmail" },
    { key: "sms", label: "settings.channelSms" },
  ];

  return (
    <QueryState query={prefs} loading={<LoadingState />}>
      {(p) => (
        <>
          <SectionCard
            title={t("settings.notifEvents")}
            description={t("settings.notifEventsHint")}
          >
            <ul className="divide-y divide-border">
              {events.map((it) => (
                <ToggleRow
                  key={it.key}
                  title={t(it.label)}
                  description={t(it.desc)}
                  on={p.events[it.key]}
                  onChange={(v) => save.mutate({ events: { [it.key]: v } })}
                />
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title={t("settings.notifChannels")}
            description={t("settings.notifChannelsHint")}
          >
            <ul className="divide-y divide-border">
              {channels.map((c) => (
                <ToggleRow
                  key={c.key}
                  title={t(c.label)}
                  description={c.key === "push" ? undefined : t("settings.channelSoon")}
                  on={p.channels[c.key]}
                  onChange={(v) => save.mutate({ channels: { [c.key]: v } })}
                />
              ))}
            </ul>
          </SectionCard>
        </>
      )}
    </QueryState>
  );
}

/* ---------------- Team (owner) ---------------- */

function TeamSection() {
  const { t, locale } = useApp();
  const { vendor } = useAuth();
  const queryClient = useQueryClient();
  const { onSaved, onError } = useSaveToast();
  const team = useQuery({ queryKey: ["team"], queryFn: teamApi.list });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    login: "",
    password: "",
    role: "staff" as "manager" | "staff",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["team"] });

  const create = useMutation({
    mutationFn: () => {
      const isEmail = form.login.includes("@");
      return teamApi.create({
        name: form.name,
        ...(isEmail ? { email: form.login } : { phone: form.login }),
        password: form.password,
        role: form.role,
      });
    },
    onSuccess: () => {
      setAdding(false);
      setErrors({});
      setForm({ name: "", login: "", password: "", role: "staff" });
      refresh();
      onSaved();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.errors) setErrors(e.errors);
      onError(e);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof teamApi.update>[1] }) =>
      teamApi.update(id, patch),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: number) => teamApi.remove(id),
    onSuccess: refresh,
    onError,
  });

  return (
    <SectionCard title={t("settings.team")} description={t("team.hint")}>
      <QueryState query={team}>
        {(members) => (
          <>
            <ul className="divide-y divide-border">
              {members.map((m: TeamMember) => {
                const isOwner = m.role === "owner";
                const isMe = m.id === vendor?.id;
                return (
                  <li key={m.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                        {m.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {m.name}{" "}
                          {isMe && (
                            <span className="text-[10px] text-muted-foreground">
                              ({t("team.you")})
                            </span>
                          )}
                        </p>
                        <p className="ez-num truncate text-[11px] text-muted-foreground" dir="ltr">
                          {m.email ?? m.phone}
                        </p>
                        <p className="ez-num text-[10px] text-muted-foreground">
                          {t("team.lastLogin")}: {formatDate(m.last_login_at, locale, true)}
                        </p>
                      </div>
                    </div>
                    {isOwner ? (
                      <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
                        {m.role_label}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={m.role}
                          onChange={(e) =>
                            update.mutate({
                              id: m.id,
                              patch: { role: e.target.value as "manager" | "staff" },
                            })
                          }
                          className="h-8 rounded-lg border border-input bg-secondary/40 px-2 text-xs"
                        >
                          <option value="manager">{t("team.manager")}</option>
                          <option value="staff">{t("team.staff")}</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            update.mutate({
                              id: m.id,
                              patch: { status: m.status === "active" ? "suspended" : "active" },
                            })
                          }
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            m.status === "active"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {m.status === "active" ? t("team.active") : t("team.suspended")}
                        </button>
                        <button
                          type="button"
                          onClick={() => confirm(t("team.confirmRemove")) && remove.mutate(m.id)}
                          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title={t("common.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {adding ? (
              <form
                className="mt-4 rounded-xl border border-border bg-secondary/30 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate();
                }}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label={t("settings.fullName")}
                    value={form.name}
                    onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                    error={errors.name?.[0]}
                  />
                  <Field
                    label={t("team.emailOrPhone")}
                    ltr
                    value={form.login}
                    onChange={(v) => setForm((f) => ({ ...f, login: v }))}
                    error={errors.email?.[0] ?? errors.phone?.[0]}
                  />
                  <Field
                    label={t("login.password")}
                    type="password"
                    value={form.password}
                    onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                    error={errors.password?.[0]}
                  />
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      {t("settings.role")}
                    </span>
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, role: e.target.value as "manager" | "staff" }))
                      }
                      className="h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm"
                    >
                      <option value="manager">{t("team.manager")}</option>
                      <option value="staff">{t("team.staff")}</option>
                    </select>
                  </label>
                </div>
                <Footer pending={create.isPending} onCancel={() => setAdding(false)} />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-sm font-semibold hover:bg-accent"
              >
                <Plus className="h-4 w-4" /> {t("team.add")}
              </button>
            )}
          </>
        )}
      </QueryState>
    </SectionCard>
  );
}

/* ---------------- Appearance ---------------- */

function AppearanceSection({
  locale,
  setLocale,
  theme,
  setTheme,
}: {
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}) {
  const { t } = useApp();
  return (
    <SectionCard title={t("settings.appearance")}>
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium">{t("settings.language")}</p>
        <div className="grid grid-cols-3 gap-2">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLocale(l.code as Locale)}
              className={cn(
                "rounded-lg border px-3 py-3 text-sm font-semibold transition",
                locale === l.code
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              {l.label}
              <span className="ms-1 text-[10px] uppercase text-muted-foreground">({l.code})</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">{t("settings.theme")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition",
              theme === "light"
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-card hover:bg-accent",
            )}
          >
            <Sun className="h-4 w-4" /> {t("settings.themeLight")}
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition",
              theme === "dark"
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-card hover:bg-accent",
            )}
          >
            <Moon className="h-4 w-4" /> {t("settings.themeDark")}
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

/* ---------------- Reusable bits ---------------- */

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ez-card ez-shadow p-6">
      <div className="mb-5">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
  ltr,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  error?: string;
  ltr?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        dir={ltr ? "ltr" : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none transition focus:border-ring focus:bg-background disabled:opacity-70",
          readOnly && "text-muted-foreground",
          error && "border-destructive",
        )}
      />
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function TimeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="time"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="ez-num h-9 w-28 rounded-lg border border-input bg-secondary/40 px-2 text-sm outline-none transition focus:border-ring focus:bg-background disabled:opacity-70"
    />
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
        checked ? "bg-primary" : "bg-muted",
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5",
        )}
      >
        {checked ? (
          <Check className="h-3 w-3 text-primary" />
        ) : (
          <X className="h-3 w-3 text-muted-foreground" />
        )}
      </span>
    </button>
  );
}

function ToggleRow({
  title,
  description,
  on,
  onChange,
}: {
  title: string;
  description?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <Toggle checked={on} onChange={onChange} />
    </li>
  );
}

function Footer({ pending, onCancel }: { pending?: boolean; onCancel: () => void }) {
  const { t } = useApp();
  return (
    <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
      >
        {t("common.cancel")}
      </button>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("common.save")}
      </button>
    </div>
  );
}
