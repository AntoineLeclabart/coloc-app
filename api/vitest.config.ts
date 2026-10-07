import { mkdirSync } from 'node:fs';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

// Wrangler exige que le dossier du front compilé existe, même vide.
mkdirSync('../front/dist/front/browser', { recursive: true });

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: { bindings: { TEST_MIGRATIONS: await readD1Migrations('./migrations') } },
    }),
  ],
  test: { setupFiles: ['./test/setup.ts'] },
}));
