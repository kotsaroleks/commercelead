import type { APIRoute } from "astro";
import site from "../data/site.json";

export const GET: APIRoute = ({ site: astroSite }) => {
  const base = (astroSite?.toString() ?? site.url).replace(/\/$/, "");

  const services = site.services.map((s) => ({
    ...s,
    price: s.slug === "ai-readiness" ? site.aiAudit : s.price,
    url: `${base}/${s.slug}/`,
  }));

  const body = {
    brand: site.brand,
    url: base,
    services,
    aiRoadmap: { name: "AI Roadmap", price: site.aiRoadmap, currency: "EUR", description: "A 90-day AI implementation plan; the AI Readiness Audit fee is credited toward it in full." },
    staffing: site.pricing.map((p) => ({ role: p.role, description: p.desc, hourlyRate: p.rate, currency: "EUR" })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
};
