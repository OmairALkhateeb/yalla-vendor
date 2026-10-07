import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  GripVertical,
  X,
  ImagePlus,
  Power,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { useApp } from "@/i18n/AppProviders";
import { PageHeader } from "@/components/ui-ez/Primitives";
import { EmptyMenu, EmptySearch, SkeletonList } from "@/components/ui-ez/States";
import { QueryState, errorMessage } from "@/components/ui-ez/QueryState";
import { ApiError } from "@/lib/api/client";
import { menuApi } from "@/lib/api/vendor";
import type { MenuCategory, MenuItem, MenuItemPayload, Translations } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { formatMoney, pickT } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "القائمة — Yalla Vendor" },
      { name: "description", content: "إدارة فئات وأصناف وإضافات قائمة المطعم" },
    ],
  }),
  component: MenuPage,
});

type Tr = { ar: string; en: string; ku: string };
const LANGS = ["ar", "en", "ku"] as const;

const toTr = (v: Translations | null | undefined): Tr => ({
  ar: v?.ar ?? "",
  en: v?.en ?? "",
  ku: v?.ku ?? "",
});
/** Send only filled languages — the API needs at least one. */
const cleanTr = (v: Tr): Translations => {
  const out: Translations = {};
  for (const l of LANGS) if (v[l].trim()) out[l] = v[l].trim();
  return out;
};
const hasAnyLang = (v: Tr) => LANGS.some((l) => v[l].trim());

type EditState = { open: boolean; item: MenuItem | null };
type CategoryDialog = { open: boolean; category: MenuCategory | null };

function MenuPage() {
  const { t, locale } = useApp();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canManage = can("manage_menu");
  const canToggle = can("toggle_items");

  const categoriesQuery = useQuery({
    queryKey: ["menu", "categories"],
    queryFn: menuApi.categories,
  });
  const itemsQuery = useQuery({ queryKey: ["menu", "items"], queryFn: () => menuApi.items() });

  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [edit, setEdit] = useState<EditState>({ open: false, item: null });
  const [catDialog, setCatDialog] = useState<CategoryDialog>({ open: false, category: null });
  const [dragId, setDragId] = useState<number | null>(null);

  const categories = useMemo(
    () => [...(categoriesQuery.data?.categories ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [categoriesQuery.data],
  );
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  const invalidateMenu = () => queryClient.invalidateQueries({ queryKey: ["menu"] });
  const onError = (e: unknown) => toast.error(errorMessage(e, t("states.errorDesc")));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const inCat = activeCat === "all" ? true : i.category_id === activeCat;
      const inQuery = !q || LANGS.some((l) => (i.name[l] ?? "").toLowerCase().includes(q));
      return inCat && inQuery;
    });
  }, [items, activeCat, query]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelectedOnPage = filtered.length > 0 && filtered.every((i) => selected.has(i.id));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) filtered.forEach((i) => next.delete(i.id));
      else filtered.forEach((i) => next.add(i.id));
      return next;
    });
  };

  const bulk = useMutation({
    mutationFn: (action: "enable" | "disable" | "delete") => menuApi.bulk([...selected], action),
    onSuccess: () => {
      setSelected(new Set());
      invalidateMenu();
    },
    onError,
  });

  const availability = useMutation({
    mutationFn: (item: MenuItem) => menuApi.setAvailability(item.id, !item.is_available),
    onSuccess: (updated) =>
      queryClient.setQueryData<MenuItem[]>(["menu", "items"], (prev) =>
        prev?.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)),
      ),
    onError,
  });

  // DELETE may return `archived` (item used by old orders) — either way it leaves the list.
  const deleteItem = useMutation({
    mutationFn: (id: number) => menuApi.deleteItem(id).then((r) => ({ id, result: r?.result })),
    onSuccess: ({ id, result }) => {
      queryClient.setQueryData<MenuItem[]>(["menu", "items"], (prev) =>
        prev?.filter((i) => i.id !== id),
      );
      queryClient.invalidateQueries({ queryKey: ["menu", "categories"] });
      toast.success(t(result === "archived" ? "menu.archived" : "menu.deleted"));
    },
    onError,
  });

  const toggleCategory = useMutation({
    mutationFn: (id: number) => menuApi.toggleCategory(id),
    onSuccess: invalidateMenu,
    onError,
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => menuApi.deleteCategory(id),
    onSuccess: (r, id) => {
      if (activeCat === id) setActiveCat("all");
      invalidateMenu();
      toast.success(t(r?.result === "archived" ? "menu.archived" : "menu.deleted"));
    },
    onError, // 422 when the category still has items — message shown as-is
  });

  const reorderCategories = useMutation({
    mutationFn: (ids: number[]) => menuApi.reorderCategories(ids),
    onMutate: (ids) => {
      queryClient.setQueryData<{ categories: MenuCategory[]; total_items: number }>(
        ["menu", "categories"],
        (prev) =>
          prev
            ? {
                ...prev,
                categories: ids.map((id, i) => ({
                  ...prev.categories.find((c) => c.id === id)!,
                  sort_order: i + 1,
                })),
              }
            : prev,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["menu", "categories"] }),
    onError,
  });

  const dropOn = (targetId: number) => {
    if (dragId === null || dragId === targetId) return;
    const ids = categories.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDragId(null);
    reorderCategories.mutate(ids);
  };

  const newItem = (): MenuItem => ({
    id: 0,
    category_id: activeCat === "all" ? (categories[0]?.id ?? 0) : activeCat,
    category: null,
    name: { ar: "", en: "", ku: "" },
    description: { ar: "", en: "", ku: "" },
    price: 0,
    image: null,
    is_available: true,
    sort_order: 0,
    sold: 0,
    addons: [],
  });

  return (
    <div>
      <PageHeader
        title={t("menu.title")}
        subtitle={t("menu.subtitle")}
        actions={
          canManage ? (
            <>
              <button
                onClick={() => setCatDialog({ open: true, category: null })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-sm font-semibold hover:bg-accent"
              >
                <Plus className="h-4 w-4" /> {t("menu.addCategory")}
              </button>
              <button
                disabled={categories.length === 0}
                onClick={() => setEdit({ open: true, item: newItem() })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> {t("menu.addItem")}
              </button>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Categories panel */}
        <aside className="ez-card ez-shadow p-3 h-fit">
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("menu.categories")}
            </span>
            {canManage && (
              <button
                onClick={() => setCatDialog({ open: true, category: null })}
                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-accent"
                title={t("menu.addCategory")}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <QueryState query={categoriesQuery} loading={<SkeletonList rows={4} />}>
            {(data) => (
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setActiveCat("all")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition",
                      activeCat === "all"
                        ? "bg-primary text-primary-foreground font-semibold ez-shadow"
                        : "hover:bg-accent",
                    )}
                  >
                    <span>{t("menu.allItems")}</span>
                    <span
                      className={cn(
                        "ez-num text-xs",
                        activeCat === "all"
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {data.total_items}
                    </span>
                  </button>
                </li>

                {categories.map((c) => {
                  const active = activeCat === c.id;
                  return (
                    <li
                      key={c.id}
                      className="group"
                      draggable={canManage}
                      onDragStart={() => setDragId(c.id)}
                      onDragOver={(e) => canManage && e.preventDefault()}
                      onDrop={() => dropOn(c.id)}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-1 rounded-md transition",
                          active
                            ? "bg-primary text-primary-foreground ez-shadow"
                            : "hover:bg-accent",
                          dragId === c.id && "opacity-50",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-9 w-6 place-items-center text-xs",
                            canManage && "cursor-grab",
                            active
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground/40 group-hover:text-muted-foreground",
                          )}
                          title={t("menu.dragHint")}
                        >
                          <GripVertical className="h-3.5 w-3.5" />
                        </span>
                        <button
                          onClick={() => setActiveCat(c.id)}
                          className="flex flex-1 items-center justify-between py-2 pe-2 text-sm"
                        >
                          <span className={cn("font-medium", active && "font-semibold")}>
                            {pickT(c.name, locale)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                c.is_active ? "bg-success" : "bg-muted-foreground/50",
                              )}
                            />
                            <span
                              className={cn(
                                "ez-num text-xs",
                                active ? "text-primary-foreground/80" : "text-muted-foreground",
                              )}
                            >
                              {c.items_count}
                            </span>
                          </span>
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => setCatDialog({ open: true, category: c })}
                              className={cn(
                                "grid h-7 w-7 place-items-center rounded opacity-0 transition group-hover:opacity-100",
                                active
                                  ? "text-primary-foreground hover:bg-white/10"
                                  : "text-muted-foreground hover:bg-background",
                              )}
                              title={t("common.edit")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => toggleCategory.mutate(c.id)}
                              className={cn(
                                "grid h-7 w-7 place-items-center rounded opacity-0 transition group-hover:opacity-100",
                                active
                                  ? "text-primary-foreground hover:bg-white/10"
                                  : "text-muted-foreground hover:bg-background",
                              )}
                              title={c.is_active ? t("menu.unavailable") : t("menu.available")}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </QueryState>
        </aside>

        {/* Items panel */}
        <section className="ez-card ez-shadow flex flex-col">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("menu.searchItems")}
                className="h-10 w-full rounded-lg border border-input bg-secondary/60 ps-10 pe-3 text-sm outline-none transition focus:border-ring focus:bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"
              >
                {allSelectedOnPage ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {filtered.length} {t("menu.itemsCount")}
              </button>
            </div>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-primary-soft px-4 py-2.5">
              <span className="text-sm font-semibold text-primary">
                <span className="ez-num">{selected.size}</span> {t("menu.bulkSelected")}
              </span>
              <div className="flex items-center gap-2">
                {bulk.isPending && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {canToggle && (
                  <>
                    <button
                      disabled={bulk.isPending}
                      onClick={() => bulk.mutate("enable")}
                      className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs font-semibold text-success hover:bg-success/15"
                    >
                      <Power className="h-3.5 w-3.5" /> {t("menu.bulkEnable")}
                    </button>
                    <button
                      disabled={bulk.isPending}
                      onClick={() => bulk.mutate("disable")}
                      className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-accent"
                    >
                      <Power className="h-3.5 w-3.5" /> {t("menu.bulkDisable")}
                    </button>
                  </>
                )}
                {canManage && (
                  <button
                    disabled={bulk.isPending}
                    onClick={() => confirm(t("menu.confirmDelete")) && bulk.mutate("delete")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t("menu.bulkDelete")}
                  </button>
                )}
                <button
                  onClick={() => setSelected(new Set())}
                  className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-card"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Items list */}
          <div className="p-3">
            <QueryState query={itemsQuery} loading={<SkeletonList rows={6} />}>
              {() =>
                filtered.length === 0 ? (
                  <div className="p-4">
                    {query.trim() ? (
                      <EmptySearch
                        title={t("states.emptySearchTitle")}
                        description={t("states.emptySearchDesc")}
                      />
                    ) : (
                      <EmptyMenu
                        title={t("states.emptyMenuTitle")}
                        description={t("states.emptyMenuDesc")}
                        actionLabel={
                          canManage && categories.length > 0 ? t("menu.addItem") : undefined
                        }
                        onAction={() => setEdit({ open: true, item: newItem() })}
                      />
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filtered.map((item) => {
                      const cat =
                        categories.find((c) => c.id === item.category_id) ?? item.category;
                      const isSelected = selected.has(item.id);
                      return (
                        <li
                          key={item.id}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg px-2 py-3 transition",
                            isSelected ? "bg-primary-soft/60" : "hover:bg-accent/50",
                          )}
                        >
                          <button
                            onClick={() => toggleSelect(item.id)}
                            className="grid h-5 w-5 place-items-center text-muted-foreground"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>

                          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary-soft to-secondary text-2xl ez-shadow">
                            {item.image ? (
                              <img src={item.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              "🍽️"
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="truncate font-semibold">{pickT(item.name, locale)}</h4>
                              {cat && (
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {pickT(cat.name, locale)}
                                </span>
                              )}
                              {item.addons.length > 0 && (
                                <span className="rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
                                  +{item.addons.length} {t("menu.addons")}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {pickT(item.description, locale)}
                            </p>
                            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="ez-num">
                                <span className="font-semibold text-foreground">{item.sold}</span>{" "}
                                {t("menu.sold")}
                              </span>
                            </div>
                          </div>

                          <div className="hidden text-end sm:block">
                            <div className="ez-num text-base font-bold text-primary">
                              {formatMoney(item.price)}
                              <span className="ms-1 text-[10px] font-medium text-muted-foreground">
                                {t("common.currency")}
                              </span>
                            </div>
                          </div>

                          {/* Availability toggle */}
                          <Toggle
                            checked={item.is_available}
                            disabled={
                              !canToggle ||
                              (availability.isPending && availability.variables?.id === item.id)
                            }
                            onChange={() => availability.mutate(item)}
                          />

                          {canManage && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEdit({ open: true, item })}
                                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
                                title={t("common.edit")}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                disabled={deleteItem.isPending && deleteItem.variables === item.id}
                                onClick={() =>
                                  confirm(t("menu.confirmDelete")) && deleteItem.mutate(item.id)
                                }
                                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                title={t("common.delete")}
                              >
                                {deleteItem.isPending && deleteItem.variables === item.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )
              }
            </QueryState>
          </div>
        </section>
      </div>

      {edit.open && edit.item && (
        <ItemEditor
          item={edit.item}
          categories={categories}
          onClose={() => setEdit({ open: false, item: null })}
          onSaved={() => {
            setEdit({ open: false, item: null });
            invalidateMenu();
          }}
        />
      )}

      {catDialog.open && (
        <CategoryEditor
          category={catDialog.category}
          deleting={deleteCategory.isPending}
          onDelete={(id) =>
            deleteCategory.mutate(id, {
              onSuccess: () => setCatDialog({ open: false, category: null }),
            })
          }
          onClose={() => setCatDialog({ open: false, category: null })}
          onSaved={() => {
            setCatDialog({ open: false, category: null });
            invalidateMenu();
          }}
        />
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-60",
        checked ? "bg-success" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition",
          checked
            ? "translate-x-[18px] rtl:-translate-x-[18px]"
            : "translate-x-0.5 rtl:-translate-x-0.5",
        )}
      />
    </button>
  );
}

/* ---------------- Category editor ---------------- */

function CategoryEditor({
  category,
  deleting,
  onDelete,
  onClose,
  onSaved,
}: {
  category: MenuCategory | null;
  deleting: boolean;
  onDelete: (id: number) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useApp();
  const [name, setName] = useState<Tr>(toTr(category?.name));
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      category
        ? menuApi.updateCategory(category.id, { name: cleanTr(name), is_active: isActive })
        : menuApi.createCategory({ name: cleanTr(name), is_active: isActive }),
    onSuccess: onSaved,
    onError: (e) => setError(errorMessage(e, t("states.errorDesc"))),
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        className="ez-card w-full max-w-lg border border-border ez-shadow"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!hasAnyLang(name)) return setError(t("menu.nameRequired"));
          setError(null);
          save.mutate();
        }}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold">
            {category ? t("menu.editCategory") : t("menu.addCategory")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">
              {t("menu.categoryName")}
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {LANGS.map((lng) => (
                <div key={lng}>
                  <input
                    dir={lng === "en" ? "ltr" : "rtl"}
                    value={name[lng]}
                    onChange={(e) => setName((n) => ({ ...n, [lng]: e.target.value }))}
                    placeholder={t(
                      `menu.itemName${lng === "ar" ? "Ar" : lng === "en" ? "En" : "Ku"}`,
                    )}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  />
                  <span className="mt-1 block text-[10px] uppercase text-muted-foreground">
                    {lng}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-lg border px-3 text-sm font-semibold transition",
              isActive
                ? "border-success/30 bg-success/10 text-success"
                : "border-input bg-card text-muted-foreground",
            )}
          >
            <span>{isActive ? t("menu.available") : t("menu.unavailable")}</span>
            <Toggle checked={isActive} onChange={() => setIsActive((v) => !v)} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/40 px-5 py-3">
          <div>
            {category && (
              <button
                type="button"
                disabled={deleting}
                onClick={() => confirm(t("menu.confirmDeleteCategory")) && onDelete(category.id)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}{" "}
                {t("common.delete")}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common.save")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Item editor ---------------- */

type AddonDraft = { key: string; id?: number; name: Tr; price: number; is_available: boolean };

interface ItemDraft {
  name: Tr;
  description: Tr;
  price: number;
  category_id: number;
  is_available: boolean;
  addons: AddonDraft[];
}

function ItemEditor({
  item,
  categories,
  onClose,
  onSaved,
}: {
  item: MenuItem;
  categories: MenuCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, locale } = useApp();
  const isNew = item.id === 0;
  const [draft, setDraft] = useState<ItemDraft>(() => ({
    name: toTr(item.name),
    description: toTr(item.description),
    price: item.price,
    category_id: item.category_id,
    is_available: item.is_available,
    addons: item.addons.map((a) => ({
      key: `a${a.id}`,
      id: a.id,
      name: toTr(a.name),
      price: a.price,
      is_available: a.is_available,
    })),
  }));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(item.image);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof ItemDraft>(key: K, val: ItemDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: val }));
  const updateName = (lang: keyof Tr, val: string) =>
    setDraft((d) => ({ ...d, name: { ...d.name, [lang]: val } }));
  const updateDesc = (lang: keyof Tr, val: string) =>
    setDraft((d) => ({ ...d, description: { ...d.description, [lang]: val } }));

  const addAddon = () =>
    setDraft((d) => ({
      ...d,
      addons: [
        ...d.addons,
        { key: `n${Date.now()}`, name: { ar: "", en: "", ku: "" }, price: 0, is_available: true },
      ],
    }));
  const updateAddon = (key: string, patch: Partial<AddonDraft>) =>
    setDraft((d) => ({
      ...d,
      addons: d.addons.map((a) => (a.key === key ? { ...a, ...patch } : a)),
    }));
  const removeAddon = (key: string) =>
    setDraft((d) => ({ ...d, addons: d.addons.filter((a) => a.key !== key) }));

  const handleFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) return setError(t("menu.imageTooLarge"));
    setError(null);
    setImageFile(file);
    setRemoveImage(false);
    setPreview(URL.createObjectURL(file));
  };

  const save = useMutation({
    mutationFn: async () => {
      // addons are sent as the full list → server replaces: id = update, no id = create, missing = delete.
      const payload: MenuItemPayload = {
        name: cleanTr(draft.name),
        description: cleanTr(draft.description),
        price: draft.price,
        category_id: draft.category_id,
        is_available: draft.is_available,
        addons: draft.addons
          .filter((a) => hasAnyLang(a.name))
          .map((a) => ({
            ...(a.id ? { id: a.id } : {}),
            name: cleanTr(a.name),
            price: a.price,
            is_available: a.is_available,
          })),
      };
      if (isNew) return menuApi.createItem(payload, imageFile);
      if (removeImage) payload.remove_image = true;
      // JSON PUT carries the addons (an empty list can't be expressed in multipart),
      // then the new image goes as multipart POST on the same path.
      const updated = await menuApi.updateItem(item.id, payload);
      return imageFile ? menuApi.updateItem(item.id, {}, imageFile) : updated;
    },
    onSuccess: onSaved,
    onError: (e) => {
      if (e instanceof ApiError && e.errors) setFieldErrors(e.errors);
      setError(errorMessage(e, t("states.errorDesc")));
    },
  });

  const fieldError = (prefix: string) =>
    Object.entries(fieldErrors).find(([k]) => k === prefix || k.startsWith(`${prefix}.`))?.[1]?.[0];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="ez-card flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden border border-border ez-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">{isNew ? t("menu.newItem") : t("menu.editItem")}</h2>
            <p className="text-xs text-muted-foreground">
              {pickT(categories.find((c) => c.id === draft.category_id)?.name, locale)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Image */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">
              {t("menu.itemImage")}
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              className="group relative flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-border bg-secondary/40 p-4 transition hover:border-primary/40 hover:bg-primary-soft/30"
            >
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary-soft to-secondary text-3xl">
                {preview && !removeImage ? (
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>🍽️</span>
                )}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold">{t("menu.uploadImage")}</p>
                <p className="text-xs text-muted-foreground">{t("menu.dropImage")}</p>
                {preview && !removeImage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setPreview(null);
                      setRemoveImage(!isNew && !!item.image);
                    }}
                    className="mt-1 text-xs font-medium text-destructive hover:underline"
                  >
                    {t("menu.removeImage")}
                  </button>
                )}
                {fieldError("image") && (
                  <p className="mt-1 text-xs text-destructive">{fieldError("image")}</p>
                )}
              </div>
              <ImagePlus className="h-5 w-5 text-muted-foreground transition group-hover:text-primary" />
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Names */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">
              {t("menu.itemName")}
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {LANGS.map((lng) => (
                <div key={lng}>
                  <input
                    dir={lng === "en" ? "ltr" : "rtl"}
                    value={draft.name[lng]}
                    onChange={(e) => updateName(lng, e.target.value)}
                    placeholder={t(
                      `menu.itemName${lng === "ar" ? "Ar" : lng === "en" ? "En" : "Ku"}`,
                    )}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  />
                  <span className="mt-1 block text-[10px] uppercase text-muted-foreground">
                    {lng}
                  </span>
                </div>
              ))}
            </div>
            {fieldError("name") && (
              <p className="mt-1 text-xs text-destructive">{fieldError("name")}</p>
            )}
          </div>

          {/* Description (edited in the current language; all languages are sent) */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">
              {t("menu.itemDesc")} <span className="uppercase">({locale})</span>
            </label>
            <textarea
              value={draft.description[locale]}
              onChange={(e) => updateDesc(locale, e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>

          {/* Price + Category + Availability */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">
                {t("menu.price")}
              </label>
              <div className="flex h-10 items-center rounded-lg border border-input bg-background">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={draft.price}
                  onChange={(e) => update("price", Number(e.target.value))}
                  className="ez-num h-full w-full bg-transparent px-3 text-sm font-semibold outline-none"
                />
                <span className="px-3 text-xs text-muted-foreground">{t("common.currency")}</span>
              </div>
              {fieldError("price") && (
                <p className="mt-1 text-xs text-destructive">{fieldError("price")}</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">
                {t("menu.itemCategory")}
              </label>
              <select
                value={draft.category_id}
                onChange={(e) => update("category_id", Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {pickT(c.name, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">
                {t("common.status")}
              </label>
              <button
                type="button"
                onClick={() => update("is_available", !draft.is_available)}
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-lg border px-3 text-sm font-semibold transition",
                  draft.is_available
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-input bg-card text-muted-foreground",
                )}
              >
                <span>{draft.is_available ? t("menu.available") : t("menu.unavailable")}</span>
                <Toggle
                  checked={draft.is_available}
                  onChange={() => update("is_available", !draft.is_available)}
                />
              </button>
            </div>
          </div>

          {/* Add-ons */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">
                {t("menu.addonsTitle")}
              </label>
              <button
                type="button"
                onClick={addAddon}
                className="inline-flex items-center gap-1 rounded-md border border-input bg-card px-2 py-1 text-xs font-semibold hover:bg-accent"
              >
                <Plus className="h-3.5 w-3.5" /> {t("menu.addAddon")}
              </button>
            </div>

            {draft.addons.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-6 text-center text-xs text-muted-foreground">
                {t("menu.addAddon")}
              </div>
            ) : (
              <div className="space-y-2">
                {draft.addons.map((a) => (
                  <div
                    key={a.key}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card p-2"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                    <input
                      value={a.name[locale]}
                      onChange={(e) =>
                        updateAddon(a.key, { name: { ...a.name, [locale]: e.target.value } })
                      }
                      placeholder={t("menu.addonName")}
                      className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-ring"
                    />
                    <div className="flex h-9 w-32 items-center rounded-md border border-input bg-background">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={a.price}
                        onChange={(e) => updateAddon(a.key, { price: Number(e.target.value) })}
                        placeholder={t("menu.addonPrice")}
                        className="ez-num h-full w-full bg-transparent px-2 text-sm font-semibold outline-none"
                      />
                      <span className="px-2 text-[10px] text-muted-foreground">
                        {t("common.currency")}
                      </span>
                    </div>
                    <Toggle
                      checked={a.is_available}
                      onChange={() => updateAddon(a.key, { is_available: !a.is_available })}
                    />
                    <button
                      type="button"
                      onClick={() => removeAddon(a.key)}
                      className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {fieldError("addons") && (
              <p className="mt-1 text-xs text-destructive">{fieldError("addons")}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/40 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            {t("common.cancel")}
          </button>
          <button
            disabled={save.isPending}
            onClick={() => {
              if (!hasAnyLang(draft.name)) return setError(t("menu.nameRequired"));
              setError(null);
              setFieldErrors({});
              save.mutate();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
