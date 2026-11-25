import { useEffect } from "react";
export function useMetadata(
  title: string,
  description: string,
  noindex = false,
) {
  useEffect(() => {
    document.title = title;
    function meta(name: string, content: string, property = false) {
      const selector = property ? "property" : "name";
      let element = document.querySelector<HTMLMetaElement>(
        `meta[${selector}="${name}"]`,
      );
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(selector, name);
        document.head.append(element);
      }
      element.content = content;
    }
    meta("description", description);
    meta("robots", noindex ? "noindex, nofollow" : "index, follow");
    meta("og:title", title, true);
    meta("og:description", description, true);
    const site = import.meta.env.VITE_SITE_URL;
    if (site) {
      let canonical = document.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]',
      );
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.append(canonical);
      }
      canonical.href = `${site.replace(/\/$/, "")}/${window.location.hash}`;
    }
  }, [title, description, noindex]);
}
