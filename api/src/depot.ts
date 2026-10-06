/** Accès à la base D1. Les objets renvoyés ont la forme attendue par le front. */
import { HTTPException } from 'hono/http-exception';
import type { TypeCategorie } from './calcul';

export interface Membre {
  id: number;
  nom: string;
}

export interface Absence {
  id: number;
  membreId: number;
  debut: string;
  fin: string;
}

export interface Categorie {
  id: number;
  nom: string;
  type: TypeCategorie;
  poids: Record<string, number>;
}

export interface Depense {
  id: number;
  libelle: string;
  montant: number;
  payeurId: number;
  categorieId: number;
  date: string;
  participantIds: number[];
}

export interface Remboursement {
  id: number;
  deId: number;
  aId: number;
  montant: number;
  mois: string;
}

// --- Lecture ---------------------------------------------------------------

export async function membres(db: D1Database, ordre: 'nom' | 'id' = 'nom'): Promise<Membre[]> {
  const { results } = await db.prepare(`SELECT id, nom FROM membre ORDER BY ${ordre}`).all<Membre>();
  return results;
}

export async function absences(db: D1Database): Promise<Absence[]> {
  const { results } = await db
    .prepare('SELECT id, membre_id AS membreId, debut, fin FROM absence ORDER BY debut DESC, id DESC')
    .all<Absence>();
  return results;
}

export async function categories(db: D1Database): Promise<Categorie[]> {
  const { results } = await db.prepare('SELECT id, nom, type, poids FROM categorie ORDER BY nom').all<CategorieLigne>();
  return results.map(categorie);
}

export async function depensesDuMois(db: D1Database, mois: string): Promise<Depense[]> {
  return depenses(db, "WHERE strftime('%Y-%m', date) = ?1 ORDER BY date DESC, id DESC", mois);
}

export async function remboursementsDuMois(db: D1Database, mois: string): Promise<Remboursement[]> {
  const { results } = await db
    .prepare('SELECT id, de_id AS deId, a_id AS aId, montant, mois FROM remboursement WHERE mois = ? ORDER BY id')
    .bind(mois)
    .all<Remboursement>();
  return results;
}

// --- Écriture --------------------------------------------------------------

export async function creerMembre(db: D1Database, nom: string): Promise<Membre> {
  try {
    return (await db.prepare('INSERT INTO membre (nom) VALUES (?) RETURNING id, nom').bind(nom).first<Membre>())!;
  } catch (e) {
    if (String(e).includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: 'Ce coloc existe déjà.' });
    }
    throw e;
  }
}

export async function creerAbsence(db: D1Database, a: Omit<Absence, 'id'>): Promise<Absence> {
  return (await db
    .prepare('INSERT INTO absence (membre_id, debut, fin) VALUES (?, ?, ?) RETURNING id, membre_id AS membreId, debut, fin')
    .bind(a.membreId, a.debut, a.fin)
    .first<Absence>())!;
}

/** Crée la catégorie, ou la modifie si id est donné. */
export async function enregistrerCategorie(db: D1Database, c: Omit<Categorie, 'id'>, id?: number): Promise<Categorie> {
  const colonnes = 'RETURNING id, nom, type, poids';
  const ligne = id
    ? await db
        .prepare(`UPDATE categorie SET nom = ?, type = ?, poids = ? WHERE id = ? ${colonnes}`)
        .bind(c.nom, c.type, JSON.stringify(c.poids), id)
        .first<CategorieLigne>()
    : await db
        .prepare(`INSERT INTO categorie (nom, type, poids) VALUES (?, ?, ?) ${colonnes}`)
        .bind(c.nom, c.type, JSON.stringify(c.poids))
        .first<CategorieLigne>();
  if (!ligne) {
    throw new HTTPException(404, { message: 'Catégorie inconnue.' });
  }
  return categorie(ligne);
}

/**
 * Crée la dépense, ou la modifie si id est donné. Les participants inconnus
 * sont ignorés. Tout est fait dans une seule transaction (batch).
 */
export async function enregistrerDepense(db: D1Database, d: Omit<Depense, 'id'>, id?: number): Promise<Depense> {
  const champs = [d.libelle, d.montant, d.payeurId, d.categorieId, d.date];
  // Dans le batch, l'id d'une nouvelle dépense est le plus grand de la table.
  const depenseId = id ?? '(SELECT max(id) FROM depense)';
  const requetes = id
    ? [
        db.prepare('UPDATE depense SET libelle = ?, montant = ?, payeur_id = ?, categorie_id = ?, date = ? WHERE id = ?').bind(...champs, id),
        db.prepare('DELETE FROM depense_membre WHERE depense_id = ?').bind(id),
      ]
    : [db.prepare('INSERT INTO depense (libelle, montant, payeur_id, categorie_id, date) VALUES (?, ?, ?, ?, ?)').bind(...champs)];
  requetes.push(
    db
      .prepare(
        `INSERT INTO depense_membre (depense_id, membre_id)
         SELECT ${id ? '?1' : depenseId}, id FROM membre WHERE id IN (SELECT value FROM json_each(?2))`,
      )
      .bind(id ?? null, JSON.stringify(d.participantIds)),
  );
  const resultats = await db.batch(requetes);
  if (id && resultats[0].meta.changes === 0) {
    throw new HTTPException(404, { message: 'Dépense inconnue.' });
  }
  const [depense] = await depenses(db, id ? 'WHERE id = ?1' : 'WHERE id = (SELECT max(id) FROM depense)', id);
  return depense;
}

export async function creerRemboursement(db: D1Database, r: Omit<Remboursement, 'id'>): Promise<Remboursement> {
  return (await db
    .prepare('INSERT INTO remboursement (de_id, a_id, montant, mois) VALUES (?, ?, ?, ?) RETURNING id, de_id AS deId, a_id AS aId, montant, mois')
    .bind(r.deId, r.aId, r.montant, r.mois)
    .first<Remboursement>())!;
}

/** Supprime une ligne : 404 si elle n'existe pas, 409 si d'autres données en dépendent. */
export async function supprimer(
  db: D1Database,
  table: 'membre' | 'absence' | 'categorie' | 'depense' | 'remboursement',
  id: number,
  messageConflit = 'Ces données sont encore utilisées.',
): Promise<void> {
  try {
    const { meta } = await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
    if (meta.changes === 0) {
      throw new HTTPException(404, { message: 'Introuvable.' });
    }
  } catch (e) {
    if (String(e).includes('FOREIGN KEY constraint failed')) {
      throw new HTTPException(409, { message: messageConflit });
    }
    throw e;
  }
}

export async function membreExiste(db: D1Database, id: number, message = 'Membre inconnu.'): Promise<void> {
  if (!(await db.prepare('SELECT 1 FROM membre WHERE id = ?').bind(id).first())) {
    throw new HTTPException(404, { message });
  }
}

export async function categorieExiste(db: D1Database, id: number): Promise<void> {
  if (!(await db.prepare('SELECT 1 FROM categorie WHERE id = ?').bind(id).first())) {
    throw new HTTPException(404, { message: 'Catégorie inconnue.' });
  }
}

// ---------------------------------------------------------------------------

interface CategorieLigne {
  id: number;
  nom: string;
  type: TypeCategorie;
  poids: string;
}

function categorie(ligne: CategorieLigne): Categorie {
  const poids = JSON.parse(ligne.poids);
  // L'ancienne base Symfony enregistrait « [] » pour des poids vides.
  return { ...ligne, poids: Array.isArray(poids) ? {} : poids };
}

/** Dépenses filtrées par `filtre` (paramètre ?1), avec leurs participants. */
async function depenses(db: D1Database, filtre: string, parametre?: unknown): Promise<Depense[]> {
  const requete = db.prepare(
    `SELECT id, libelle, montant, payeur_id AS payeurId, categorie_id AS categorieId, date,
            (SELECT json_group_array(membre_id) FROM (SELECT membre_id FROM depense_membre WHERE depense_id = depense.id ORDER BY membre_id)) AS participants
     FROM depense ${filtre}`,
  );
  const { results } = await (parametre === undefined ? requete : requete.bind(parametre)).all<Omit<Depense, 'participantIds'> & { participants: string }>();
  return results.map(({ participants, ...d }) => ({ ...d, participantIds: JSON.parse(participants) }));
}
