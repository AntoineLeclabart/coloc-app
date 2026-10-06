import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { COOKIE, DUREE, creerJeton, jetonValide, verifierMotDePasse } from './auth';
import { bilan } from './bilan';
import * as depot from './depot';
import { AbsenceInput, CategorieInput, DepenseInput, MembreInput, MOIS, RemboursementInput, lire } from './validation';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Hash du mot de passe partagé (secret Cloudflare, ou .dev.vars en local). */
  COLOC_MOT_DE_PASSE_HASH: string;
  /** Clé de signature des cookies de connexion. */
  APP_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>().basePath('/api');

// --- Connexion -------------------------------------------------------------

app.post('/login', async (c) => {
  const { username, password } = await lire(c, z.object({ username: z.string(), password: z.string() }));
  const { COLOC_MOT_DE_PASSE_HASH: hash, APP_SECRET: secret } = c.env;
  if (username !== 'coloc' || !secret || !(await verifierMotDePasse(password, hash))) {
    return c.json({ error: 'Invalid credentials.' }, 401);
  }
  setCookie(c, COOKIE, await creerJeton(secret, hash), {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge: DUREE,
  });
  return c.json({ connecte: true });
});

app.post('/logout', (c) => {
  deleteCookie(c, COOKIE, { path: '/' });
  return c.body(null, 204);
});

// Tout le reste de l'API demande d'être connecté.
app.use('*', async (c, next) => {
  const { COLOC_MOT_DE_PASSE_HASH: hash, APP_SECRET: secret } = c.env;
  if (!secret || !hash || !(await jetonValide(getCookie(c, COOKIE), secret, hash))) {
    return c.json({ error: 'Non connecté.' }, 401);
  }
  await next();
});

/** Permet au front de savoir s'il est connecté (401 sinon). */
app.get('/session', (c) => c.json({ connecte: true }));

// --- Colocs ----------------------------------------------------------------

app.get('/membres', async (c) => c.json(await depot.membres(c.env.DB)));

app.post('/membres', async (c) => {
  const { nom } = await lire(c, MembreInput);
  return c.json(await depot.creerMembre(c.env.DB, nom.trim()), 201);
});

app.delete('/membres/:id{[0-9]+}', async (c) => {
  await depot.supprimer(c.env.DB, 'membre', id(c), 'Ce coloc a des dépenses ou des remboursements.');
  return c.body(null, 204);
});

// --- Absences --------------------------------------------------------------

app.get('/absences', async (c) => c.json(await depot.absences(c.env.DB)));

app.post('/absences', async (c) => {
  const input = await lire(c, AbsenceInput);
  await depot.membreExiste(c.env.DB, input.membreId);
  return c.json(await depot.creerAbsence(c.env.DB, input), 201);
});

app.delete('/absences/:id{[0-9]+}', async (c) => {
  await depot.supprimer(c.env.DB, 'absence', id(c));
  return c.body(null, 204);
});

// --- Catégories ------------------------------------------------------------

app.get('/categories', async (c) => c.json(await depot.categories(c.env.DB)));

app.post('/categories', async (c) => {
  const input = await lire(c, CategorieInput);
  return c.json(await depot.enregistrerCategorie(c.env.DB, { ...input, nom: input.nom.trim() }), 201);
});

app.put('/categories/:id{[0-9]+}', async (c) => {
  const input = await lire(c, CategorieInput);
  return c.json(await depot.enregistrerCategorie(c.env.DB, { ...input, nom: input.nom.trim() }, id(c)));
});

app.delete('/categories/:id{[0-9]+}', async (c) => {
  await depot.supprimer(c.env.DB, 'categorie', id(c), 'Des dépenses utilisent cette catégorie.');
  return c.body(null, 204);
});

// --- Dépenses --------------------------------------------------------------

app.get('/depenses', async (c) => {
  const mois = c.req.query('mois') ?? '';
  if (!/^\d{4}-\d{2}$/.test(mois)) {
    throw new HTTPException(404, { message: 'Paramètre mois attendu (AAAA-MM).' });
  }
  return c.json(await depot.depensesDuMois(c.env.DB, mois));
});

app.post('/depenses', async (c) => {
  const input = await lire(c, DepenseInput);
  await verifierDepense(c.env.DB, input);
  return c.json(await depot.enregistrerDepense(c.env.DB, { ...input, libelle: input.libelle.trim() }), 201);
});

app.put('/depenses/:id{[0-9]+}', async (c) => {
  const input = await lire(c, DepenseInput);
  await verifierDepense(c.env.DB, input);
  return c.json(await depot.enregistrerDepense(c.env.DB, { ...input, libelle: input.libelle.trim() }, id(c)));
});

app.delete('/depenses/:id{[0-9]+}', async (c) => {
  await depot.supprimer(c.env.DB, 'depense', id(c));
  return c.body(null, 204);
});

async function verifierDepense(db: D1Database, input: z.infer<typeof DepenseInput>): Promise<void> {
  await depot.membreExiste(db, input.payeurId, 'Payeur inconnu.');
  await depot.categorieExiste(db, input.categorieId);
}

// --- Remboursements --------------------------------------------------------

app.post('/remboursements', async (c) => {
  const input = await lire(c, RemboursementInput);
  await depot.membreExiste(c.env.DB, input.deId);
  await depot.membreExiste(c.env.DB, input.aId);
  return c.json(await depot.creerRemboursement(c.env.DB, input), 201);
});

app.delete('/remboursements/:id{[0-9]+}', async (c) => {
  await depot.supprimer(c.env.DB, 'remboursement', id(c));
  return c.body(null, 204);
});

// --- Bilan -----------------------------------------------------------------

app.get('/bilan/:mois', async (c) => {
  const mois = c.req.param('mois');
  if (!MOIS.test(mois)) {
    throw new HTTPException(404);
  }
  return c.json(await bilan(c.env.DB, mois));
});

// ---------------------------------------------------------------------------

app.notFound((c) => c.json({ error: 'Introuvable.' }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.res ? err.getResponse() : c.json({ error: err.message || 'Erreur.' }, err.status);
  }
  console.error(err);
  return c.json({ error: 'Erreur interne.' }, 500);
});

function id(c: { req: { param: (nom: 'id') => string } }): number {
  return Number(c.req.param('id'));
}

export default {
  fetch(request, env, ctx) {
    // Seul /api/* arrive ici (run_worker_first) ; le reste est servi par les assets.
    if (!new URL(request.url).pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
