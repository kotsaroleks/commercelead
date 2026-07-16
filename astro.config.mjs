import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://commerce-lead.com',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/thanks'),
    }),
  ],
});
