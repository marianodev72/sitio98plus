import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: any;
  }
}

type Props = {
  onToken: (token: string) => void;
};

export default function TurnstileWidget({ onToken }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    // ✅ DEV: no mostrar widget si no querés bloquear
    if (isDev && !siteKey) {
      // Dev sin Turnstile configurado
      onToken("DEV_SKIP");
      return;
    }

    if (!siteKey) {
      console.warn("VITE_TURNSTILE_SITE_KEY no configurada");
      return;
    }

    const id = window.turnstile?.render(ref.current, {
      sitekey: siteKey,
      callback: (token: string) => {
        onToken(token);
      },
      "error-callback": () => {
        console.warn("Turnstile error");
        onToken("");
      },
      "expired-callback": () => {
        console.warn("Turnstile expired");
        onToken("");
      },
    });

    return () => {
      if (id && window.turnstile?.remove) window.turnstile.remove(id);
    };
  }, [siteKey]);

  // Si es dev y no hay key, ni renderizamos
  if (isDev && !siteKey) return null;

  return <div ref={ref} />;
}
