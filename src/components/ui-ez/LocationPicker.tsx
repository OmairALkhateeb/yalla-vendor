import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

/** Baghdad — used until the store has coordinates. */
const DEFAULT_CENTER: [number, number] = [33.3152, 44.3661];

const round = (v: number) => Math.round(v * 1e6) / 1e6;

const PIN_HTML =
  '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:var(--primary);' +
  'transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.45)"></div>';

/**
 * OpenStreetMap picker: click the map or drag the pin to set the store location.
 * Draws the delivery radius as a circle around the pin.
 * Leaflet touches `window`, so it's loaded on the client only.
 */
export function LocationPicker({
  lat,
  lng,
  radiusKm,
  disabled,
  onChange,
  className,
}: {
  lat: number | null;
  lng: number | null;
  radiusKm: number | null;
  disabled?: boolean;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const circleRef = useRef<Leaflet.Circle | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  onChangeRef.current = onChange;
  disabledRef.current = disabled;
  const [ready, setReady] = useState(false);
  const initial = useRef({ lat, lng });

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((mod) => {
      const L = ((mod as { default?: typeof Leaflet }).default ?? mod) as typeof Leaflet;
      if (cancelled || !el.current) return;
      LRef.current = L;
      const { lat: la, lng: ln } = initial.current;
      const has = la !== null && ln !== null;
      const map = L.map(el.current).setView(has ? [la, ln] : DEFAULT_CENTER, has ? 15 : 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        if (!disabledRef.current) onChangeRef.current(round(e.latlng.lat), round(e.latlng.lng));
      });
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  // Keep the pin and the radius circle in sync with the form.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    if (lat === null || lng === null) {
      markerRef.current?.remove();
      markerRef.current = null;
      circleRef.current?.remove();
      circleRef.current = null;
      return;
    }

    const pos: [number, number] = [lat, lng];
    if (!markerRef.current) {
      const marker = L.marker(pos, {
        draggable: true,
        icon: L.divIcon({
          className: "",
          html: PIN_HTML,
          iconSize: [32, 32],
          iconAnchor: [16, 39],
        }),
      }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChangeRef.current(round(p.lat), round(p.lng));
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(pos);
    }
    if (disabled) markerRef.current.dragging?.disable();
    else markerRef.current.dragging?.enable();

    if (radiusKm && radiusKm > 0) {
      if (!circleRef.current) {
        circleRef.current = L.circle(pos, {
          radius: radiusKm * 1000,
          color: "#65a30d",
          weight: 2,
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(map);
      } else {
        circleRef.current.setLatLng(pos).setRadius(radiusKm * 1000);
      }
    } else {
      circleRef.current?.remove();
      circleRef.current = null;
    }

    if (!map.getBounds().contains(pos)) map.panTo(pos);
  }, [ready, lat, lng, radiusKm, disabled]);

  return (
    <div
      ref={el}
      className={cn(
        "isolate h-72 w-full overflow-hidden rounded-lg border border-input bg-secondary/40",
        disabled && "opacity-80",
        className,
      )}
    />
  );
}
