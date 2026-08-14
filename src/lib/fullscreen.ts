import { useCallback, useEffect, useState } from "react";

// Going properly full screen for the world.
//
// The manifest already makes an installed MINIMEE open without browser
// chrome. This covers the other case — opened in a normal tab — where a
// child would otherwise be playing inside an address bar.
//
// Requesting full screen only ever works from a user gesture, so this is a
// button the child presses, never something that happens on load.

interface FullscreenCapableElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}
interface FullscreenCapableDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}

export function useFullscreen(): { supported: boolean; active: boolean; toggle: () => void } {
  const [active, setActive] = useState(false);

  const doc = typeof document === "undefined" ? null : (document as FullscreenCapableDocument);
  // iPhone Safari has no Fullscreen API at all. Rather than showing a button
  // that does nothing, the caller hides it and the home-screen install is the
  // route to a chrome-free game there.
  const supported = Boolean(
    doc && (doc.fullscreenEnabled || typeof doc.documentElement.requestFullscreen === "function"
      || typeof (doc.documentElement as FullscreenCapableElement).webkitRequestFullscreen === "function"),
  );

  useEffect(() => {
    if (!doc) return;
    const sync = () => setActive(Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, [doc]);

  const toggle = useCallback(() => {
    if (!doc) return;
    const root = doc.documentElement as FullscreenCapableElement;
    const isOn = Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
    // A rejected request is normal — a browser may simply refuse — and is not
    // worth showing a child an error about.
    if (isOn) void (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())?.catch(() => {});
    else void (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.())?.catch(() => {});
  }, [doc]);

  return { supported, active, toggle };
}
