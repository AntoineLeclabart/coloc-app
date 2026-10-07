import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeEach } from 'vitest';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

// Base vide au début de chaque test.
beforeEach(async () => {
  const tables = ['remboursement', 'depense_membre', 'depense', 'absence', 'categorie', 'membre'];
  await env.DB.batch(tables.map((t) => env.DB.prepare(`DELETE FROM ${t}`)));
});
