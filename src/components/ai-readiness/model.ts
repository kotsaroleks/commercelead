// "How AI-ready is your store?" diagnostic.
// Unlike the hostage check, higher = BETTER here: each answer scores readiness
// (1 = ready, 0 = not), and the total 0–100 maps to four maturity tiers.

export type Tier = "red" | "amber" | "green" | "native";

export interface Dimension {
  key: string;
  label: string;
  fix: string; // recommendation shown when this dimension is weak
}

export const DIMENSIONS: Dimension[] = [
  {
    key: "data",
    label: "Data & catalog",
    fix: "Clean and structure your catalog — consistent taxonomy and rich attributes are the foundation everything else builds on.",
  },
  {
    key: "visibility",
    label: "Visibility to AI agents",
    fix: "Add comprehensive structured data and clean feeds so AI agents (ChatGPT, Perplexity, Google AI) can find, understand and recommend your products.",
  },
  {
    key: "onsite",
    label: "On-site AI",
    fix: "Introduce semantic search and personalised recommendations — the highest-ROI on-site AI for most stores.",
  },
  {
    key: "support",
    label: "Support & communication",
    fix: "Automate first-line support with an AI assistant grounded in your real catalog and policies.",
  },
  {
    key: "content",
    label: "Content operations",
    fix: "Set up an AI-assisted pipeline for descriptions and translations, with human review, so content scales.",
  },
  {
    key: "governance",
    label: "Analytics & governance",
    fix: "Get your analytics foundation and AI ownership/policy in place so initiatives are measurable and safe.",
  },
];

export interface Option {
  label: string;
  readiness: number; // 0 (not ready) … 1 (fully ready)
}

export interface Question {
  id: string;
  dimension: string;
  weight: number;
  text: string;
  options: Option[]; // index 0 = best
}

export const QUESTIONS: Question[] = [
  {
    id: "catalog-structure",
    dimension: "data",
    weight: 9,
    text: "Is your product catalog clean and consistently structured — taxonomy, categories, attributes?",
    options: [
      { label: "Yes — well-structured and maintained", readiness: 1 },
      { label: "Partly — inconsistent attributes or categories", readiness: 0.5 },
      { label: "No / don't know", readiness: 0 },
    ],
  },
  {
    id: "attributes-rich",
    dimension: "data",
    weight: 7,
    text: "Are product attributes rich enough to be machine-readable — specs, materials, use-cases, not just free text?",
    options: [
      { label: "Yes — detailed structured attributes", readiness: 1 },
      { label: "Basic attributes only", readiness: 0.5 },
      { label: "Mostly free text / missing", readiness: 0 },
    ],
  },
  {
    id: "structured-data",
    dimension: "visibility",
    weight: 9,
    text: "Do your pages expose schema.org structured data (Product, Offer, FAQ) for machines to read?",
    options: [
      { label: "Yes — comprehensive structured data", readiness: 1 },
      { label: "Some — partial or inconsistent", readiness: 0.5 },
      { label: "No / don't know", readiness: 0 },
    ],
  },
  {
    id: "ai-citations",
    dimension: "visibility",
    weight: 8,
    text: "Do you have clean product feeds, and do AI tools (ChatGPT Shopping, Perplexity, Google AI Overviews) surface your store?",
    options: [
      { label: "Yes — feeds in place and we appear in AI answers", readiness: 1 },
      { label: "Feeds exist, but unsure about AI visibility", readiness: 0.5 },
      { label: "No feeds / never checked", readiness: 0 },
    ],
  },
  {
    id: "search-recs",
    dimension: "onsite",
    weight: 7,
    text: "Does your store have AI-grade search and product recommendations — semantic, not just keyword?",
    options: [
      { label: "Yes — semantic search + personalised recs", readiness: 1 },
      { label: "Basic keyword search / generic recs", readiness: 0.5 },
      { label: "Neither", readiness: 0 },
    ],
  },
  {
    id: "personalization",
    dimension: "onsite",
    weight: 5,
    text: "Is the on-site experience personalised to the shopper — segments, behaviour, context?",
    options: [
      { label: "Yes — personalised", readiness: 1 },
      { label: "Minimal", readiness: 0.5 },
      { label: "No", readiness: 0 },
    ],
  },
  {
    id: "support-automation",
    dimension: "support",
    weight: 6,
    text: "How automated is your customer support?",
    options: [
      { label: "AI-assisted, grounded in our catalog & policies", readiness: 1 },
      { label: "Basic canned replies / FAQ", readiness: 0.5 },
      { label: "Fully manual", readiness: 0 },
    ],
  },
  {
    id: "content-scale",
    dimension: "content",
    weight: 6,
    text: "How are product descriptions and translations produced at scale?",
    options: [
      { label: "Scaled with AI + human review workflow", readiness: 1 },
      { label: "Manual but consistent", readiness: 0.5 },
      { label: "Ad-hoc / inconsistent / untranslated", readiness: 0 },
    ],
  },
  {
    id: "content-speed",
    dimension: "content",
    weight: 4,
    text: "Can you launch content for new products or markets quickly?",
    options: [
      { label: "Yes — a repeatable process", readiness: 1 },
      { label: "Slow / bottlenecked", readiness: 0.5 },
      { label: "No process", readiness: 0 },
    ],
  },
  {
    id: "analytics",
    dimension: "governance",
    weight: 7,
    text: "Do you have the analytics and data foundation to measure and act on AI initiatives?",
    options: [
      { label: "Yes — clean data and dashboards", readiness: 1 },
      { label: "Partial / siloed", readiness: 0.5 },
      { label: "No reliable analytics", readiness: 0 },
    ],
  },
  {
    id: "ai-ownership",
    dimension: "governance",
    weight: 5,
    text: "Is there clear ownership and policy for AI — who owns it, data security, guidelines?",
    options: [
      { label: "Yes — clear ownership and policy", readiness: 1 },
      { label: "Informal", readiness: 0.5 },
      { label: "None / don't know", readiness: 0 },
    ],
  },
];

export const TOTAL_WEIGHT = QUESTIONS.reduce((s, q) => s + q.weight, 0);

export function tierForPct(pct: number): Tier {
  if (pct <= 35) return "red";
  if (pct <= 65) return "amber";
  if (pct <= 85) return "green";
  return "native";
}

const TIER_LABEL: Record<Tier, string> = {
  red: "Analog — the foundation isn't there yet",
  amber: "Fragmented — point initiatives, no system",
  green: "Ready to scale",
  native: "AI-native",
};

const TIER_INTRO: Record<Tier, string> = {
  red: "AI tools won't help until the basics are in place. The good news: the foundation is fixable, and it's where the biggest early wins are.",
  amber: "You've started, but without a system. A roadmap turns scattered initiatives into compounding gains.",
  green: "Strong foundation. You're ready to scale AI across search, content and visibility with real ROI.",
  native: "You're ahead of the curve. The opportunity now is to defend the lead and squeeze ROI from every dimension.",
};

export interface DimensionResult {
  key: string;
  label: string;
  pct: number;
  tier: Tier;
  fix: string;
}

export interface ReadinessResult {
  score: number;
  tier: Tier;
  tierLabel: string;
  tierIntro: string;
  answered: number;
  dimensions: DimensionResult[];
  priorities: DimensionResult[]; // weakest dimensions to fix first
}

/** answers[i] = chosen option index for QUESTIONS[i], or null. */
export function evaluate(answers: (number | null)[]): ReadinessResult {
  let weighted = 0;
  let answeredWeight = 0;
  let answered = 0;
  const dimAgg: Record<string, { w: number; r: number }> = {};

  QUESTIONS.forEach((q, i) => {
    const ai = answers[i];
    if (ai == null || !q.options[ai]) return;
    answered++;
    const readiness = q.options[ai].readiness;
    weighted += q.weight * readiness;
    answeredWeight += q.weight;
    if (!dimAgg[q.dimension]) dimAgg[q.dimension] = { w: 0, r: 0 };
    dimAgg[q.dimension].w += q.weight;
    dimAgg[q.dimension].r += q.weight * readiness;
  });

  const score = answeredWeight > 0 ? Math.round((weighted / answeredWeight) * 100) : 0;
  const tier = tierForPct(score);

  const dimensions: DimensionResult[] = DIMENSIONS.map((d) => {
    const agg = dimAgg[d.key];
    const pct = agg && agg.w > 0 ? Math.round((agg.r / agg.w) * 100) : 0;
    return { key: d.key, label: d.label, pct, tier: tierForPct(pct), fix: d.fix };
  });

  // priorities: the weakest dimensions (lowest readiness) that aren't already strong
  const priorities = [...dimensions]
    .filter((d) => d.pct <= 65)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  return {
    score,
    tier,
    tierLabel: TIER_LABEL[tier],
    tierIntro: TIER_INTRO[tier],
    answered,
    dimensions,
    priorities,
  };
}
