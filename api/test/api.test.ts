import { SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';

const URL_BASE = 'https://coloc.test';
let cookie = '';

async function requete(methode: string, chemin: string, corps?: unknown): Promise<Response> {
  return SELF.fetch(
    new Request(URL_BASE + chemin, {
      method: methode,
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    }),
  );
}

async function post(chemin: string, corps: unknown) {
  const res = await requete('POST', chemin, corps);
  expect(res.status, await res.clone().text()).toBe(201);
  return res.json<any>();
}

async function get(chemin: string) {
  const res = await requete('GET', chemin);
  expect(res.status).toBe(200);
  return res.json<any>();
}

async function connexion(motDePasse = 'coloc'): Promise<Response> {
  cookie = '';
  const res = await requete('POST', '/api/login', { username: 'coloc', password: motDePasse });
  cookie = res.headers.get('Set-Cookie')?.split(';')[0] ?? '';
  return res;
}

describe('Sécurité', () => {
  it("répond 401 sans connexion", async () => {
    cookie = '';
    expect((await requete('GET', '/api/membres')).status).toBe(401);
  });

  it('refuse un mauvais mot de passe', async () => {
    expect((await connexion('faux')).status).toBe(401);
    expect(cookie).toBe('');
  });

  it('connecte puis déconnecte', async () => {
    const res = await connexion();
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toMatch(/HttpOnly.*Secure|Secure.*HttpOnly/);
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=31536000');
    expect((await requete('GET', '/api/session')).status).toBe(200);

    const sortie = await requete('POST', '/api/logout');
    expect(sortie.status).toBe(204);
    cookie = sortie.headers.get('Set-Cookie')?.split(';')[0] ?? '';
    expect((await requete('GET', '/api/session')).status).toBe(401);
  });

  it('refuse un cookie falsifié', async () => {
    await connexion();
    const [expiration] = cookie.split('=')[1].split('.');
    cookie = `coloc_session=${Number(expiration) + 1000}.${cookie.split('.')[1]}`;
    expect((await requete('GET', '/api/session')).status).toBe(401);
  });
});

describe('API', () => {
  beforeEach(async () => {
    await connexion();
  });

  it('calcule le bilan du mois avec absence et remboursement', async () => {
    const alice = (await post('/api/membres', { nom: 'Alice' })).id;
    const bob = (await post('/api/membres', { nom: 'Bob' })).id;
    const chloe = (await post('/api/membres', { nom: 'Chloé' })).id;
    const loyer = (await post('/api/categories', { nom: 'Loyer', type: 'fixe' })).id;
    const courses = (await post('/api/categories', { nom: 'Courses', type: 'variable' })).id;
    // Février 2026 : 4 semaines pile. Bob absent 2 semaines.
    await post('/api/absences', { membreId: bob, debut: '2026-02-09', fin: '2026-02-22' });
    await post('/api/depenses', { libelle: 'Loyer', montant: 150000, payeurId: alice, categorieId: loyer, date: '2026-02-01' });
    await post('/api/depenses', { libelle: 'Courses', montant: 60000, payeurId: chloe, categorieId: courses, date: '2026-02-15' });
    // Dépense de mars : ne doit pas compter.
    await post('/api/depenses', { libelle: 'Loyer mars', montant: 150000, payeurId: bob, categorieId: loyer, date: '2026-03-01' });

    let bilan = await get('/api/bilan/2026-02');
    // Loyer 500 chacun ; courses 240 / 120 / 240 (Bob présent 14 jours sur 28).
    expect(bilan.soldes).toEqual({ [alice]: 76000, [bob]: -62000, [chloe]: -14000 });
    expect(bilan.virements).toEqual([
      { deId: bob, aId: alice, montant: 62000 },
      { deId: chloe, aId: alice, montant: 14000 },
    ]);
    expect(bilan.joursDansLeMois).toBe(28);
    expect(bilan.membres.find((m: any) => m.id === bob).joursPresence).toBe(14);
    expect(bilan.totaux).toEqual({ fixe: 150000, variable: 60000 });

    // Bob rembourse : il ne reste que Chloé.
    await post('/api/remboursements', { deId: bob, aId: alice, montant: 62000, mois: '2026-02' });
    bilan = await get('/api/bilan/2026-02');
    expect(bilan.virements).toEqual([{ deId: chloe, aId: alice, montant: 14000 }]);
    expect(bilan.soldesRestants).toEqual({ [alice]: 14000, [bob]: 0, [chloe]: -14000 });
  });

  it("ne supprime pas un coloc ou une catégorie utilisés", async () => {
    const alice = (await post('/api/membres', { nom: 'Alice' })).id;
    const loyer = (await post('/api/categories', { nom: 'Loyer', type: 'fixe' })).id;
    await post('/api/depenses', { libelle: 'Loyer', montant: 1000, payeurId: alice, categorieId: loyer, date: '2026-02-01' });
    expect((await requete('DELETE', `/api/membres/${alice}`)).status).toBe(409);
    expect((await requete('DELETE', `/api/categories/${loyer}`)).status).toBe(409);
  });

  it("supprime un coloc sans dépense, avec ses absences", async () => {
    const bob = (await post('/api/membres', { nom: 'Bob' })).id;
    await post('/api/absences', { membreId: bob, debut: '2026-02-09', fin: '2026-02-22' });
    expect((await requete('DELETE', `/api/membres/${bob}`)).status).toBe(204);
    expect(await get('/api/absences')).toEqual([]);
    expect((await requete('DELETE', `/api/membres/${bob}`)).status).toBe(404);
  });

  it("applique les poids d'une catégorie fixe", async () => {
    const alice = (await post('/api/membres', { nom: 'Alice' })).id;
    const bob = (await post('/api/membres', { nom: 'Bob' })).id;
    const loyer = await post('/api/categories', { nom: 'Loyer', type: 'fixe', poids: { [alice]: 2 } });
    expect(loyer.poids).toEqual({ [alice]: 2 });
    await post('/api/depenses', { libelle: 'Loyer', montant: 90000, payeurId: bob, categorieId: loyer.id, date: '2026-02-01' });
    const bilan = await get('/api/bilan/2026-02');
    expect(bilan.depenses[0].parts).toEqual({ [alice]: 60000, [bob]: 30000 });
  });

  it('modifie une dépense et ses participants', async () => {
    const alice = (await post('/api/membres', { nom: 'Alice' })).id;
    const bob = (await post('/api/membres', { nom: 'Bob' })).id;
    const courses = (await post('/api/categories', { nom: 'Courses', type: 'variable' })).id;
    const depense = await post('/api/depenses', { libelle: 'Courses', montant: 1000, payeurId: alice, categorieId: courses, date: '2026-02-15', participantIds: [alice, 999] });
    expect(depense.participantIds).toEqual([alice]);

    const res = await requete('PUT', `/api/depenses/${depense.id}`, {
      libelle: ' Courses Lidl ', montant: 4000, payeurId: bob, categorieId: courses, date: '2026-03-02', participantIds: [bob],
    });
    expect(res.status).toBe(200);
    expect(await get('/api/depenses?mois=2026-02')).toEqual([]);
    expect(await get('/api/depenses?mois=2026-03')).toEqual([
      { id: depense.id, libelle: 'Courses Lidl', montant: 4000, payeurId: bob, categorieId: courses, date: '2026-03-02', participantIds: [bob] },
    ]);
    expect((await requete('PUT', '/api/depenses/999', { libelle: 'X', montant: 1, payeurId: bob, categorieId: courses, date: '2026-03-02' })).status).toBe(404);
  });

  it('modifie une catégorie', async () => {
    const id = (await post('/api/categories', { nom: 'Courses', type: 'variable' })).id;
    const res = await requete('PUT', `/api/categories/${id}`, { nom: 'Internet', type: 'fixe' });
    expect(await res.json()).toEqual({ id, nom: 'Internet', type: 'fixe', poids: {} });
    expect(await get('/api/categories')).toHaveLength(1);
  });

  it('valide les données', async () => {
    expect((await requete('POST', '/api/categories', { nom: 'X', type: 'autre' })).status).toBe(422);
    expect((await requete('POST', '/api/membres', { nom: '  ' })).status).toBe(422);
    const alice = (await post('/api/membres', { nom: 'Alice' })).id;
    expect((await requete('POST', '/api/membres', { nom: 'Alice' })).status).toBe(409);
    expect((await requete('POST', '/api/absences', { membreId: alice, debut: '2026-02-10', fin: '2026-02-01' })).status).toBe(422);
    expect((await requete('POST', '/api/remboursements', { deId: alice, aId: alice, montant: 1, mois: '2026-02' })).status).toBe(422);
    expect((await requete('POST', '/api/depenses', { libelle: 'X', montant: 1, payeurId: 42, categorieId: 1, date: '2026-02-01' })).status).toBe(404);
    expect((await requete('GET', '/api/bilan/2026-13')).status).toBe(404);
    expect((await requete('GET', '/api/depenses')).status).toBe(404);
  });
});
