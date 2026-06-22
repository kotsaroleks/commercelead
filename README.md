# CommerceLead — Astro site

Three marketing landing pages (Magento, Shopware, "Your First CTO") plus a hub,
built with [Astro](https://astro.build). The original hand-coded design is kept
pixel-for-pixel; the repeated parts (header, footer) are components and all
editable content lives in one data file.

## Run it locally

You need Node.js 18+ installed.

```bash
npm install      # one time
npm run dev      # start dev server → http://localhost:4321
npm run build    # production build → ./dist
npm run preview  # preview the built site
```

## Pages / routes

| Route        | File                          |
|--------------|-------------------------------|
| `/`          | `src/pages/index.astro`       |
| `/magento`   | `src/pages/magento.astro`     |
| `/shopware`  | `src/pages/shopware.astro`    |
| `/first-cto` | `src/pages/first-cto.astro`   |

## Where to edit content

- **Brand name, contact email, hourly rates** → `src/data/site.json`
  Change a rate once and it updates the pricing table on every platform page.
- **Page copy** → the `<main>` of each page file in `src/pages/`.
- **Shared header / footer** → `src/components/Header.astro`, `Footer.astro`.
- **Design tokens & all styling** → `src/styles/global.css`. Per-page accent
  colour is passed from each page to the `<Base>` layout (look for `accent="..."`).

## Deploy (free)

Push to GitHub, then connect the repo to any of these — all auto-detect Astro:

- **Netlify** / **Vercel** / **Cloudflare Pages** — build command `npm run build`,
  output directory `dist`.

## Contact forms (Netlify Forms)

Each landing has a working contact form in its CTA section, wired to **Netlify
Forms** — no backend, no third-party service to configure.

- Forms are auto-detected by Netlify on deploy. After someone submits, they're
  sent to the `/thanks` page, and the entry appears in your Netlify dashboard
  under **Forms**.
- Each page submits to its own form so you can see which landing converted:
  `magento-contact`, `shopware-contact`, `firstcto-contact`.
- A hidden honeypot field (`bot-field`) filters basic spam.

**To get email notifications:** Netlify dashboard → **Forms** → **Form
notifications** → add an email (or Slack/webhook). Without this, submissions are
still captured in the dashboard, you just won't be emailed.

**Note:** forms only work on the deployed Netlify site, not in `npm run dev` —
local submissions won't be captured. Test them on the live URL after deploying.

## Optional: add a visual CMS (edit content in a browser)

This project is ready for a git-based CMS so non-developers can edit copy and
prices without touching code:

- **Keystatic** (recommended) — gives an admin UI at `/keystatic`, stores content
  back into `src/data` as JSON/Markdown. See https://keystatic.com
- **Decap CMS** — similar, Netlify-friendly. See https://decapcms.org

Both keep the content in this repo, so your design and content stay in one place.
