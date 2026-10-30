import { api, toFormData } from "./client";
import type {
  CuisineCategory,
  Dashboard,
  DayHours,
  DayKey,
  DeleteResult,
  LoginResponse,
  MeResponse,
  MenuCategory,
  MenuItem,
  MenuItemPayload,
  NotificationPrefs,
  NotificationsList,
  Order,
  OrdersList,
  Paginated,
  PayoutAccount,
  Performance,
  Period,
  Reports,
  ReviewsList,
  Settlement,
  Store,
  SupportTicket,
  TeamMember,
  Transaction,
  Translations,
  WalletSummary,
  Withdrawal,
  WorkingHours,
} from "./types";

/** Every endpoint of docs/VENDOR_API.md, grouped by screen. Paths are relative to /api/vendor. */

export type RangeQuery = { period?: Period; from?: string; to?: string };

/* §2 Auth & account */
export const authApi = {
  login: (login: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { login, password }),
  logout: () => api.post<null>("/auth/logout"),
  me: () => api.get<MeResponse>("/me"),
  updateProfile: (body: {
    name?: string;
    email?: string;
    phone?: string;
    locale?: "ar" | "en" | "ku";
  }) => api.put<unknown>("/profile", body),
  changePassword: (body: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => api.put<unknown>("/profile/password", body),
  notificationPrefs: () => api.get<NotificationPrefs>("/profile/notification-preferences"),
  updateNotificationPrefs: (
    body: Partial<{
      events: Partial<NotificationPrefs["events"]>;
      channels: Partial<NotificationPrefs["channels"]>;
    }>,
  ) => api.put<NotificationPrefs>("/profile/notification-preferences", body),
};

/* §3 Dashboard */
export const dashboardApi = {
  get: () => api.get<Dashboard>("/dashboard"),
};

/* §4 Orders */
export const ordersApi = {
  list: (q: {
    tab: "active" | "history";
    status?: string;
    search?: string;
    per_page?: number;
    page?: number;
  }) => api.get<OrdersList>("/orders", q),
  show: (id: number) => api.get<Order>(`/orders/${id}`),
  accept: (id: number, prep_time_minutes?: number) =>
    api.post<Order>(`/orders/${id}/accept`, prep_time_minutes ? { prep_time_minutes } : undefined),
  reject: (id: number, reason: string) => api.post<Order>(`/orders/${id}/reject`, { reason }),
  startPreparing: (id: number) => api.post<Order>(`/orders/${id}/start-preparing`),
  markReady: (id: number) => api.post<Order>(`/orders/${id}/ready`),
};

/* §5 Menu */
export const menuApi = {
  categories: () =>
    api.get<{ categories: MenuCategory[]; total_items: number }>("/menu/categories"),
  createCategory: (body: { name: Translations; is_active?: boolean }) =>
    api.post<MenuCategory>("/menu/categories", body),
  updateCategory: (id: number, body: { name?: Translations; is_active?: boolean }) =>
    api.put<MenuCategory>(`/menu/categories/${id}`, body),
  toggleCategory: (id: number) => api.patch<MenuCategory>(`/menu/categories/${id}/toggle`),
  reorderCategories: (ids: number[]) => api.post<unknown>("/menu/categories/reorder", { ids }),
  deleteCategory: (id: number) => api.del<DeleteResult>(`/menu/categories/${id}`),

  items: (q?: { category_id?: number; search?: string; available?: boolean }) =>
    api.get<MenuItem[]>("/menu/items", q),
  item: (id: number) => api.get<MenuItem>(`/menu/items/${id}`),
  /** JSON create, or multipart when an image file is attached. */
  createItem: (body: MenuItemPayload, image?: File | null) =>
    image
      ? api.post<MenuItem>("/menu/items", toFormData({ ...body, image } as Record<string, unknown>))
      : api.post<MenuItem>("/menu/items", body),
  /** PUT (JSON) — or POST multipart on the same path when uploading a new image (PHP can't read files on PUT). */
  updateItem: (id: number, body: MenuItemPayload, image?: File | null) =>
    image
      ? api.post<MenuItem>(
          `/menu/items/${id}`,
          toFormData({ ...body, image } as Record<string, unknown>),
        )
      : api.put<MenuItem>(`/menu/items/${id}`, body),
  setAvailability: (id: number, is_available?: boolean) =>
    api.patch<MenuItem>(
      `/menu/items/${id}/availability`,
      is_available === undefined ? undefined : { is_available },
    ),
  deleteItem: (id: number) => api.del<DeleteResult>(`/menu/items/${id}`),
  bulk: (ids: number[], action: "enable" | "disable" | "delete") =>
    api.post<unknown>("/menu/items/bulk", { ids, action }),
  reorderItems: (ids: number[]) => api.post<unknown>("/menu/items/reorder", { ids }),
};

/* §6 Performance */
export const performanceApi = {
  get: (q: RangeQuery) => api.get<Performance>("/performance", q),
};

/* §7 Reports */
export const reportsApi = {
  get: (q: RangeQuery) => api.get<Reports>("/reports", q),
  exportCsv: (q: RangeQuery) =>
    api.download("/reports/export", q, `report-${q.period ?? `${q.from}_${q.to}`}.csv`),
};

/* §8 Wallet */
export const walletApi = {
  summary: () => api.get<WalletSummary>("/wallet"),
  settlements: (per_page = 10) =>
    api.get<{ settlements: Settlement[]; meta: Paginated }>("/wallet/settlements", { per_page }),
  settlement: (id: number) =>
    api.get<Settlement & { orders: unknown[] }>(`/wallet/settlements/${id}`),
  transactions: (q: {
    type?: "all" | "in" | "out";
    search?: string;
    from?: string;
    to?: string;
    per_page?: number;
  }) => api.get<{ transactions: Transaction[]; meta: Paginated }>("/wallet/transactions", q),
  statementCsv: (q: { type?: "all" | "in" | "out"; from?: string; to?: string }) =>
    api.download("/wallet/statement", q, "statement.csv"),
  payoutAccount: () => api.get<PayoutAccount | null>("/wallet/payout-account"),
  updatePayoutAccount: (body: { bank_name: string; account_holder: string; iban: string }) =>
    api.put<PayoutAccount>("/wallet/payout-account", body),
  withdrawals: () => api.get<{ withdrawals: Withdrawal[]; meta: Paginated }>("/wallet/withdrawals"),
  requestWithdrawal: (amount: number) => api.post<Withdrawal>("/wallet/withdrawals", { amount }),
};

/* §9 Reviews */
export const reviewsApi = {
  list: (q: { rating?: number; replied?: boolean; per_page?: number; page?: number }) =>
    api.get<ReviewsList>("/reviews", q),
  reply: (id: number, reply: string) => api.post<unknown>(`/reviews/${id}/reply`, { reply }),
  deleteReply: (id: number) => api.del<unknown>(`/reviews/${id}/reply`),
};

/* §10 Store & settings */
export const storeApi = {
  get: () => api.get<Store>("/store"),
  update: (
    body: Partial<
      Pick<
        Store,
        | "name"
        | "description"
        | "phone"
        | "email"
        | "address"
        | "latitude"
        | "longitude"
        | "delivery_radius_km"
        | "cuisine_category_id"
        | "prep_time_minutes"
      >
    >,
  ) => api.put<Store>("/store", body),
  uploadLogo: (logo: File) => api.post<Store>("/store/logo", toFormData({ logo })),
  deleteLogo: () => api.del<Store>("/store/logo"),
  setStatus: (is_open: boolean) => api.patch<Store>("/store/status", { is_open }),
  workingHours: () => api.get<WorkingHours>("/store/working-hours"),
  updateWorkingHours: (days: Partial<Record<DayKey, Partial<DayHours>>>) =>
    api.put<WorkingHours>("/store/working-hours", { days }),
  cuisineCategories: () => api.get<CuisineCategory[]>("/cuisine-categories"),
};

export const teamApi = {
  list: () => api.get<TeamMember[]>("/team"),
  create: (body: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
    role: "manager" | "staff";
  }) => api.post<TeamMember>("/team", body),
  update: (
    id: number,
    body: Partial<{
      name: string;
      email: string;
      phone: string;
      password: string;
      role: "manager" | "staff";
      status: "active" | "suspended";
    }>,
  ) => api.put<TeamMember>(`/team/${id}`, body),
  remove: (id: number) => api.del<unknown>(`/team/${id}`),
};

/* §11 Notifications & support */
export const notificationsApi = {
  list: () => api.get<NotificationsList>("/notifications"),
  read: (id: number) => api.post<unknown>(`/notifications/${id}/read`),
  readAll: () => api.post<unknown>("/notifications/read-all"),
};

export const supportApi = {
  list: () => api.get<{ tickets: SupportTicket[]; meta: Paginated }>("/support"),
  create: (body: { subject: string; description: string; order_id?: number | null }) =>
    api.post<SupportTicket>("/support", body),
  show: (id: number) => api.get<SupportTicket>(`/support/${id}`),
};
