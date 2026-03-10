// frontend/src/components/InstitutionalCarousel.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

type CarouselImage = { src: string; alt?: string };

type CarouselConfig = {
  intervalMs?: number;
  transitionMs?: number;
  images?: CarouselImage[];
};

type Props = {
  configUrl?: string; // /assets/institucional/carrusel/index.json
  objectFit?: "cover" | "contain";
  objectPosition?: string; // ej: "center 42%"
};

export default function InstitutionalCarousel({
  configUrl = "/assets/institucional/carrusel/index.json",
  objectFit = "cover",
  objectPosition = "center 42%",
}: Props) {
  const [config, setConfig] = useState<CarouselConfig | null>(null);
  const [failed, setFailed] = useState(false);

  const images = useMemo(() => config?.images ?? [], [config]);
  const intervalMs = useMemo(() => Math.max(1500, config?.intervalMs ?? 6000), [config]);
  const transitionMs = useMemo(() => Math.max(150, config?.transitionMs ?? 600), [config]);

  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;

    fetch(configUrl, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("config_not_found");
        return r.json();
      })
      .then((data: CarouselConfig) => {
        if (!alive) return;
        setConfig(data || {});
        setFailed(false);
      })
      .catch(() => {
        if (!alive) return;
        setFailed(true);
        setConfig({ intervalMs: 6000, transitionMs: 600, images: [] });
      });

    return () => {
      alive = false;
    };
  }, [configUrl]);

  useEffect(() => {
    if (!images.length) return;

    if (timerRef.current) window.clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setIdx((prev) => (prev + 1) % images.length);
    }, intervalMs);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [images.length, intervalMs]);

  useEffect(() => {
    if (!images.length) {
      setIdx(0);
      return;
    }
    if (idx >= images.length) setIdx(0);
  }, [images.length, idx]);

  const a = images[idx];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#08101d",
      }}
      aria-label="Carrusel institucional"
    >
      {a?.src ? (
        <img
          key={a.src}
          src={a.src}
          alt={a.alt || "Imagen institucional"}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit,
            objectPosition,
            opacity: 1,
            transition: `opacity ${transitionMs}ms ease`,
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}

      {!images.length ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.72)",
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          {failed ? "Contenido institucional no disponible." : ""}
        </div>
      ) : null}
    </div>
  );
}
