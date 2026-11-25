import { createContext, useContext, useEffect, type ReactNode } from "react";
import { configured } from "../lib/supabase";
import {
  defaultProfile,
  defaultServices,
  defaultSettings,
} from "../config/defaults";
import { getSiteData } from "../repositories/content";
import type { SiteData } from "../types/content";
import { useAsync } from "./useAsync";
import { safeUrl } from "../lib/validation";
import { resolveMedia } from "../components/MediaImage";
const initial: SiteData = {
  profile: defaultProfile,
  settings: defaultSettings,
  categories: [],
  technologies: [],
  services: defaultServices,
};
const loader = async () => (configured ? getSiteData() : initial);
const SiteContext = createContext({
  data: initial,
  loading: true,
  error: null as unknown,
  reload: () => {},
});
export function SiteProvider({ children }: { children: ReactNode }) {
  const state = useAsync(loader, initial);
  const { reload } = state;
  useEffect(() => {
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);
  useEffect(() => {
    document.documentElement.dataset.accent = state.data.settings.accent;
  }, [state.data.settings.accent]);
  useEffect(() => {
    let script = document.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      document.head.append(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      name: state.data.profile.full_name,
      jobTitle: state.data.profile.role,
      description: state.data.profile.bio,
      sameAs: state.data.profile.contacts
        .map((c) => safeUrl(c.url))
        .filter(Boolean),
    });
  }, [state.data.profile]);
  useEffect(() => {
    let active = true;
    const share = state.data.settings.share_media_id;
    const refresh = () => {
      if (!share) {
        document.querySelector('meta[property="og:image"]')?.remove();
        return;
      }
      void resolveMedia(share)
        .then(({ url }) => {
          if (!active) return;
          let meta = document.querySelector<HTMLMetaElement>(
            'meta[property="og:image"]',
          );
          if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute("property", "og:image");
            document.head.append(meta);
          }
          meta.content = url;
        })
        .catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [state.data.settings.share_media_id]);
  return <SiteContext.Provider value={state}>{children}</SiteContext.Provider>;
}
export const useSite = () => useContext(SiteContext);
