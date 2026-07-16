# Phase 4 — AI visibility monitoring checklist

Manual/ongoing monitoring process for confirming AI crawlers are indexing commerce-lead.com and that the site gets cited in AI answer engines. Compiled 2026-07-16, once Phase 0a (domain migration) is live.

## 1. Confirm crawler access isn't blocked

`public/robots.txt` currently allows all user agents (`Allow: /`) except `/admin/` and `/thanks` — no AI crawler is blocked. Re-check this file any time it's edited; a stray `Disallow: /` would silently cut off every AI crawler in the list below.

## 2. AI crawler user agents to watch for

| User agent | Provider | Type |
|---|---|---|
| GPTBot | OpenAI | Bulk training crawler |
| ChatGPT-User | OpenAI | Live browsing (user-triggered) |
| OAI-SearchBot | OpenAI | Search indexing |
| ClaudeBot | Anthropic | Bulk training crawler |
| Claude-User / Claude-SearchBot | Anthropic | Live browsing / search |
| PerplexityBot | Perplexity | Search indexing |
| Perplexity-User | Perplexity | Live browsing (user-triggered) |
| Google-Extended | Google (Gemini/AI Overviews training) | Bulk training crawler |
| CCBot | Common Crawl (feeds many LLM training sets) | Bulk crawler |
| Bytespider | ByteDance | Bulk crawler |
| Amazonbot | Amazon | Bulk crawler |
| Applebot-Extended | Apple (Apple Intelligence) | Bulk training crawler |

## 3. Where to actually see this traffic on Netlify

- Netlify auto-tags every request with a `Netlify-Agent-Category` header (values like `crawler;ai` for bulk AI crawlers or `ai-agent;user` for live browsing agents), regardless of plan tier. This is only readable from within an Edge Function or Function — there's no dashboard view of it today.
- Full historical/queryable logs require **Log Drains** (Site settings → Log Drains, streaming to Datadog/S3/HTTP endpoint) — this is an **Enterprise-only Netlify feature**. On a Pro/free plan you won't get a built-in report of "which AI bots hit which pages" without building a small Edge Function to log the header yourself (flagged in the last conversation as a deliberate follow-up, since it adds latency to every page request — not done yet).
- Netlify's standard Analytics add-on shows human traffic (top pages/sources/countries), not bot/crawler breakdowns — don't rely on it for this.
- Cheapest immediate option: Google Search Console (free) confirms Googlebot indexing and can show the sitemap submission status, though it won't show the AI-specific crawlers above.

## 4. Manual answer-engine test queries

Run these periodically (e.g. monthly) against ChatGPT, Perplexity, and Google AI Overviews, and log the result.

Suggested queries:
- "outsourced CTO for Magento"
- "fractional CTO for e-commerce store"
- "who does technical due diligence for Shopify acquisitions"
- "independent Magento agency estimate review"
- "how much does a Magento tech audit cost"

Log template:

| Date | Query | Engine | Cited? | Notes |
|---|---|---|---|---|
| | | ChatGPT / Perplexity / Google AI Overviews | Y/N | |

## 5. Why this matters

This closes the loop the same way CommerceLead's own AI Readiness product promises clients (audit → roadmap → implementation → analysis → improvement), and doubles as a self-serve case study once results show up — "we scored ourselves, fixed the gaps, here's the before/after."
