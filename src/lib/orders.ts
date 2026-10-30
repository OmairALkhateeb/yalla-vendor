import { useEffect, useState } from "react";
import type { Awaiting, Order, OrderStatus } from "@/lib/api/types";

export const STATUS_LABEL_KEY: Record<OrderStatus, string> = {
  new: "common.new",
  accepted: "orders.accepted",
  preparing: "common.preparing",
  ready: "common.ready",
  pickedup: "orders.pickedup",
  delivering: "common.delivering",
  completed: "common.completed",
  cancelled: "common.cancelled",
};

/** Text shown instead of action buttons when available_actions is empty. */
export const AWAITING_KEY: Record<NonNullable<Awaiting>, string> = {
  driver_assignment: "orders.awaiting.driver_assignment",
  driver_pickup: "orders.awaiting.driver_pickup",
  delivery: "orders.awaiting.delivery",
};

export const PAYMENT_KEY: Record<string, string> = {
  cash: "orders.payment.cash",
  wallet: "orders.payment.wallet",
  card: "orders.payment.card",
};

export const CANCELLED_BY_KEY: Record<string, string> = {
  user: "orders.cancelledBy.user",
  restaurant: "orders.cancelledBy.restaurant",
  system: "orders.cancelledBy.system",
  driver: "orders.cancelledBy.driver",
};

/**
 * Accept countdown: seeded from the server's accept_seconds_left on every
 * refetch, then counted down locally once per second.
 */
export function useAcceptCountdown(order: Pick<Order, "status" | "accept_seconds_left">): number {
  const seed = order.status === "new" ? (order.accept_seconds_left ?? 0) : 0;
  const [left, setLeft] = useState(seed);

  useEffect(() => {
    setLeft(seed);
    if (seed <= 0) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const next = Math.max(0, seed - Math.floor((Date.now() - startedAt) / 1000));
      setLeft(next);
      if (next === 0) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [seed]);

  return left;
}

/**
 * Orders still open this long after being placed are treated as stuck
 * (driver never picked up / never completed). The backend should close them
 * automatically; until it does, the panel flags them and lets staff report them.
 */
export const STUCK_AFTER_MINUTES = 120;

export function isStuck(order: Pick<Order, "status" | "minutes_ago">): boolean {
  return (
    order.status !== "completed" &&
    order.status !== "cancelled" &&
    order.minutes_ago >= STUCK_AFTER_MINUTES
  );
}
