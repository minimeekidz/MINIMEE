import { useEffect } from "react";

const SITE_ORIGIN = "https://minimee.me";

// MINIMEE_OPERATIONS.md section 11 requires parent, child, admin, invite and
// token routes to be `noindex`. robots.txt already asks crawlers not to
// fetch them, but Disallow is not noindex — a URL that is linked from
// elsewhere can still be indexed without being crawled — so the private
// surfaces also emit the meta tag.
const PRIVATE_PREFIXES = ["/parent", "/child", "/admin", "/parent-gate", "/f/", "/lost/", "/login", "/register", "/forgot-password", "/reset-password"];

export function isPrivateRoute(pathname: string) {
  return PRIVATE_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix));
}

function upsertMeta(name: string, content: string | null) {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (content === null) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.content = content;
    return;
  }
  const meta = document.createElement("meta");
  meta.name = name;
  meta.content = content;
  document.head.appendChild(meta);
}

function upsertCanonical(href: string | null) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href === null) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.href = href;
    return;
  }
  const link = document.createElement("link");
  link.rel = "canonical";
  link.href = href;
  document.head.appendChild(link);
}

// Keeps `robots` and `canonical` correct as the SPA changes routes: public
// pages get a self-referencing canonical and no robots override, private
// ones get noindex and no canonical (there is nothing to consolidate to).
export function useRouteSeo(pathname: string) {
  useEffect(() => {
    if (isPrivateRoute(pathname)) {
      upsertMeta("robots", "noindex, nofollow");
      upsertCanonical(null);
    } else {
      upsertMeta("robots", null);
      upsertCanonical(`${SITE_ORIGIN}${pathname === "/" ? "/" : pathname}`);
    }
  }, [pathname]);
}

// Injects one JSON-LD block per page and removes it on unmount, so a
// structured-data payload never leaks onto a route it does not describe.
export function useStructuredData(id: string, data: unknown) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [id, data]);
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MINIMEE",
  legalName: "COZY KIDZ WORLD",
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/favicon.svg`,
  email: "minimee.kidz@gmail.com",
  description: "專為家庭而設的個人化 AI 學習、影片、小遊戲與 MEE 收藏卡體驗。",
  inLanguage: "zh-HK",
};

export function faqSchema(faqs: readonly (readonly [string, string])[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export function serviceSchema(plans: readonly { title: string; subtitle: string; amountHkd: number }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "MINIMEE",
    serviceType: "個人化兒童 AI 學習與童年收藏服務",
    provider: { "@type": "Organization", name: "MINIMEE", legalName: "COZY KIDZ WORLD" },
    areaServed: "HK",
    offers: plans.map(plan => ({
      "@type": "Offer",
      name: plan.title,
      description: plan.subtitle,
      price: String(plan.amountHkd),
      priceCurrency: "HKD",
      availability: "https://schema.org/InStock",
    })),
  };
}
