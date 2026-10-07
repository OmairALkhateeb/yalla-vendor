import { Link, useLocation } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  BarChart3,
  Wallet,
  Star,
  Settings,
  LifeBuoy,
  Activity,
  X,
  LogOut,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/i18n/AppProviders";
import { useAuth, ROUTE_PERMISSIONS } from "@/lib/auth";
import { ordersApi } from "@/lib/api/vendor";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  key: string;
  /** Shows the live count of new orders. */
  badge?: "newOrders";
};

type NavSection = {
  labelKey: string;
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    labelKey: "nav.section.operations",
    items: [
      { to: "/", icon: LayoutDashboard, key: "nav.dashboard" },
      { to: "/orders", icon: ShoppingBag, key: "nav.orders", badge: "newOrders" },
      { to: "/menu", icon: UtensilsCrossed, key: "nav.menu" },
    ],
  },
  {
    labelKey: "nav.section.business",
    items: [
      { to: "/reports", icon: BarChart3, key: "nav.reports" },
      { to: "/performance", icon: Activity, key: "nav.performance" },
      { to: "/wallet", icon: Wallet, key: "nav.wallet" },
      { to: "/reviews", icon: Star, key: "nav.reviews" },
    ],
  },
  {
    labelKey: "nav.section.account",
    items: [
      { to: "/settings", icon: Settings, key: "nav.settings" },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { t, dir } = useApp();
  const { vendor, can, logout } = useAuth();
  const location = useLocation();

  // Chip counts of the active tab — `new` = orders waiting for accept/reject.
  const badgeQuery = useQuery({
    queryKey: ["orders", "badge"],
    queryFn: () => ordersApi.list({ tab: "active", status: "all", per_page: 1 }),
    refetchInterval: 30_000,
  });
  const newOrders = badgeQuery.data?.counts.new ?? 0;

  const allowed = (to: string) => {
    const perm = ROUTE_PERMISSIONS[to];
    return !perm || can(perm);
  };

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const sideEdge = dir === "rtl" ? "right-0 border-l" : "left-0 border-r";

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 z-50 flex w-[260px] flex-col bg-sidebar text-sidebar-foreground border-sidebar-border transition-transform duration-300 ease-out lg:translate-x-0 lg:z-30",
          sideEdge,
          !mobileOpen &&
            (dir === "rtl"
              ? "translate-x-full lg:translate-x-0"
              : "-translate-x-full lg:translate-x-0"),
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <img src={logo} alt="Yalla" className="h-10 w-10 shrink-0 object-contain" />
          <div className="flex flex-1 flex-col leading-tight">
            <span className="text-sm font-semibold text-sidebar-primary-foreground">
              {t("app.name")}
            </span>
            <span className="text-[11px] text-sidebar-foreground/60">{t("app.tagline")}</span>
          </div>
          {/* Mobile close */}
          <button
            type="button"
            onClick={onMobileClose}
            className="grid h-8 w-8 place-items-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {SECTIONS.map((section) => ({
            ...section,
            items: section.items.filter((it) => allowed(it.to)),
          }))
            .filter((section) => section.items.length > 0)
            .map((section, i) => (
              <div key={section.labelKey} className={cn(i > 0 && "mt-6")}>
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/40">
                  {t(section.labelKey)}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.to);
                    const Icon = item.icon;
                    const badge = item.badge === "newOrders" ? newOrders : 0;
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={onMobileClose}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                            active
                              ? "bg-sidebar-accent text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                          )}
                        >
                          {/* Active accent bar */}
                          {active && (
                            <span
                              className={cn(
                                "absolute top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary",
                                dir === "rtl" ? "right-0" : "left-0",
                              )}
                            />
                          )}
                          <Icon
                            className={cn(
                              "h-[18px] w-[18px] shrink-0 transition-colors",
                              active
                                ? "text-primary"
                                : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground",
                            )}
                          />
                          <span className="flex-1">{t(item.key)}</span>
                          {badge ? (
                            <span
                              className={cn(
                                "ez-num grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold",
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-sidebar-accent text-sidebar-foreground/90",
                              )}
                            >
                              {badge}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </nav>

        {/* Support + profile */}
        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/support"
            onClick={onMobileClose}
            className={cn(
              "mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              isActive("/support")
                ? "bg-sidebar-accent text-sidebar-primary-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <LifeBuoy className="h-[18px] w-[18px]" />
            <span>{t("nav.support")}</span>
          </Link>
          <div className="rounded-lg bg-sidebar-accent/70 p-3">
            <div className="flex items-center gap-3">
              {vendor?.restaurant.logo ? (
                <img
                  src={vendor.restaurant.logo}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {vendor?.restaurant.name.charAt(0) ?? "E"}
                </div>
              )}
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-medium text-sidebar-primary-foreground">
                  {vendor?.restaurant.name}
                </p>
                <p className="truncate text-[11px] text-sidebar-foreground/60">
                  {vendor?.email ?? vendor?.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="grid h-8 w-8 place-items-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                title={t("topbar.logout")}
                aria-label={t("topbar.logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
