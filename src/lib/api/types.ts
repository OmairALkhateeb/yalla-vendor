/**
 * Response shapes of /api/vendor/* — taken from docs/VENDOR_API.md and
 * verified against the live backend responses.
 */

export type Translations = { ar?: string | null; en?: string | null; ku?: string | null };

export interface Paginated {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/* ---------- Auth ---------- */

export type VendorRole = "owner" | "manager" | "staff";

export interface Vendor {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: VendorRole;
  role_label: string;
  status: string;
  locale: "ar" | "en" | "ku" | null;
  last_login_at: string | null;
  restaurant: { id: number; name: string; logo: string | null; is_open: boolean };
  created_at: string;
}

export interface Permissions {
  manage_orders: boolean;
  manage_menu: boolean;
  toggle_items: boolean;
  manage_store: boolean;
  view_finance: boolean;
  withdraw: boolean;
  manage_payout: boolean;
  manage_team: boolean;
  reply_reviews: boolean;
  view_reports: boolean;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  expires_in: number;
  vendor: Vendor;
}

export interface MeResponse {
  vendor: Vendor;
  permissions: Permissions;
}

/* ---------- Orders ---------- */

export type OrderStatus =
  | "new"
  | "accepted"
  | "preparing"
  | "ready"
  | "pickedup"
  | "delivering"
  | "completed"
  | "cancelled";

export type OrderAction = "accept" | "reject" | "start_preparing" | "mark_ready";
export type Awaiting = "driver_assignment" | "driver_pickup" | "delivery" | null;

export interface OrderItem {
  id: number;
  menu_item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  add_ons: unknown;
  notes: string | null;
}

export interface Order {
  id: number;
  reference: string;
  food_order_id?: number;
  status: OrderStatus;
  status_label: string;
  restaurant_status: string;
  available_actions: OrderAction[];
  awaiting: Awaiting;
  customer: { id: number; name: string; phone: string | null };
  delivery_address: {
    title: string | null;
    address: string | null;
    notes: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  items: OrderItem[];
  items_count: number;
  special_notes: string | null;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  payment_method: "cash" | "wallet" | "card" | string;
  payment_status: string;
  placed_at: string;
  minutes_ago: number;
  accept_deadline_at: string | null;
  accept_seconds_left: number | null;
  accept_window_seconds: number;
  prep_time_minutes: number | null;
  ready_eta: string | null;
  driver: {
    id: number | null;
    name: string | null;
    phone: string | null;
    vehicle?: string | null;
  } | null;
  cancellation: {
    cancelled_by: "user" | "restaurant" | "system" | "driver" | string;
    reason: string | null;
    cancelled_at: string | null;
  } | null;
  timeline: { status: OrderStatus; reached: boolean; at: string | null }[];
}

export interface OrdersList {
  tab: "active" | "history";
  counts: Partial<Record<OrderStatus | "all", number>>;
  orders: Order[];
  meta: Paginated;
}

/* ---------- Dashboard ---------- */

export interface SeriesPoint {
  key: string;
  date: string;
  day: "sat" | "sun" | "mon" | "tue" | "wed" | "thu" | "fri";
  hour: number | null;
  value: number;
}

export interface TopItem {
  id: number;
  name: string;
  name_translations: Translations | null;
  image: string | null;
  price: number;
  units: number;
  revenue: number;
}

export interface Dashboard {
  store: { id: number; name: string; is_open: boolean };
  currency: string;
  kpis: {
    today_orders: { value: number; change_pct: number | null };
    today_revenue: { value: number; change_pct: number | null };
    avg_prep_minutes: { value: number | null; change_minutes: number | null };
    rating: { value: number | null; reviews_count: number };
  };
  weekly_revenue: { series: SeriesPoint[]; total: number; change_pct: number | null };
  top_items: TopItem[];
  live_orders: Order[];
  new_orders_count: number;
}

/* ---------- Menu ---------- */

export interface MenuCategory {
  id: number;
  name: Translations;
  is_active: boolean;
  sort_order: number;
  items_count: number;
}

export interface MenuAddon {
  id: number;
  name: Translations;
  price: number;
  is_available: boolean;
  sort_order: number;
}

export interface MenuItem {
  id: number;
  category_id: number;
  category: { id: number; name: Translations; is_active: boolean } | null;
  name: Translations;
  description: Translations | null;
  price: number;
  image: string | null;
  is_available: boolean;
  sort_order: number;
  sold: number;
  addons: MenuAddon[];
  updated_at?: string;
}

export interface MenuItemPayload {
  name?: Translations;
  description?: Translations;
  price?: number;
  category_id?: number;
  is_available?: boolean;
  remove_image?: boolean;
  addons?: { id?: number; name: Translations; price: number; is_available?: boolean }[];
}

export type DeleteResult = { result: "deleted" | "archived" };

/* ---------- Performance / Reports ---------- */

export type Period = "today" | "week" | "month";
export interface PeriodInfo {
  type: Period | "custom";
  from: string;
  to: string;
}

export interface Performance {
  period: PeriodInfo;
  kpis: {
    completion_rate: { value: number | null; change_pts: number | null };
    acceptance_rate: { value: number | null; change_pts: number | null };
    cancel_rate: { value: number | null; change_pts: number | null };
    avg_rating: { value: number | null; reviews_count: number };
    avg_prep_minutes: number | null;
  };
  revenue_series: SeriesPoint[];
}

export interface Reports {
  period: PeriodInfo;
  currency: string;
  commission_rate: number;
  totals: {
    total_orders: number;
    completed: number;
    cancelled: number;
    revenue: number;
    commissions: number;
    net: number;
    aov: number;
  };
  changes: {
    total_orders_pct: number | null;
    revenue_pct: number | null;
    cancelled_pct: number | null;
    net_pct: number | null;
  };
  revenue_trend: SeriesPoint[];
  top_products: TopItem[];
  by_category: {
    id: number;
    name: string;
    name_translations: Translations | null;
    value: number;
  }[];
  completed_vs_cancelled: (Omit<SeriesPoint, "value"> & { completed: number; cancelled: number })[];
}

/* ---------- Wallet ---------- */

export interface PayoutAccount {
  method: string;
  bank_name: string;
  account_holder: string;
  iban_masked: string;
  iban_last4: string;
  payout_schedule: string;
  is_verified: boolean;
}

export interface Withdrawal {
  id: number;
  reference?: string;
  amount: number;
  status: string;
  status_label?: string;
  created_at: string;
  [k: string]: unknown;
}

export interface WalletSummary {
  currency: string;
  balance: number;
  pending_balance: number;
  total_earned: number;
  total_earned_change_pct: number | null;
  commission_rate: number;
  commissions_this_week: number;
  next_settlement_date: string | null;
  payout_schedule: string;
  min_withdrawal: number;
  payout_account: PayoutAccount | null;
  pending_withdrawal: Withdrawal | null;
}

export interface Settlement {
  id: number;
  reference: string;
  period_from: string;
  period_to: string;
  orders_count: number;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: "scheduled" | "processing" | "paid";
  status_label: string;
  scheduled_for: string | null;
  paid_at: string | null;
}

export interface Transaction {
  id: number;
  reference: string;
  type: string;
  type_label: string;
  direction: "in" | "out";
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
}

/* ---------- Reviews ---------- */

export interface Review {
  id: number;
  order_id: number;
  reference: string;
  rating: number;
  comment: string | null;
  customer: { id: number; name: string };
  reply: { text: string; replied_at: string; replied_by: unknown } | null;
  created_at: string;
}

export interface ReviewsList {
  summary: {
    average: number | null;
    total: number;
    distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
    unreplied: number;
  };
  reviews: Review[];
  meta: Paginated;
}

/* ---------- Store / settings ---------- */

export interface Store {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  cover_image: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Delivery range around the store. Not in VENDOR_API.md yet — may be missing from older backends. */
  delivery_radius_km?: number | null;
  cuisine_category_id: number | null;
  cuisine_category: { id: number; name: string } | null;
  is_open: boolean;
  status: string;
  rating: number | null;
  prep_time_minutes: number | null;
  commission_rate: number;
  currency: string;
}

export type DayKey = "sat" | "sun" | "mon" | "tue" | "wed" | "thu" | "fri";
export interface DayHours {
  is_open: boolean;
  from: string | null;
  to: string | null;
}
export interface WorkingHours {
  days: Record<DayKey, DayHours>;
  is_open_now: boolean;
}

export interface CuisineCategory {
  id: number;
  name: string;
  slug: string;
}

export interface NotificationPrefs {
  events: {
    new_order: boolean;
    order_cancelled: boolean;
    new_review: boolean;
    payout: boolean;
    promotions: boolean;
  };
  channels: { push: boolean; email: boolean; sms: boolean };
}

export interface TeamMember {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: VendorRole;
  role_label: string;
  status: "active" | "suspended" | string;
  locale: string | null;
  last_login_at: string | null;
  created_at: string;
}

/* ---------- Notifications & support ---------- */

export interface VendorNotification {
  id: number;
  type: "new_order" | "order_cancelled" | "new_review" | "settlement_paid" | string;
  title: string;
  body: string;
  data: { order_id?: number; [k: string]: unknown } | null;
  read: boolean;
  created_at: string;
}

export interface NotificationsList {
  unread_count: number;
  notifications: VendorNotification[];
  meta: Paginated;
}

export interface SupportTicket {
  id: number;
  subject: string;
  description: string;
  status?: string;
  order_id?: number | null;
  created_at?: string;
  [k: string]: unknown;
}

/* ---------- Realtime ---------- */

export interface FoodOrderStatusEvent {
  type: "FoodOrderStatusUpdated";
  order_id: number;
  service_type: "food";
  status: string;
  status_label: string;
  driver: { id: number | null; name: string | null; phone: string | null; vehicle: string | null };
  timeline_item: unknown;
  timestamp: string;
}
