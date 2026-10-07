/**
 * Bilan d'un mois : part de chacun sur chaque dépense, soldes,
 * remboursements déjà faits et virements restant à faire.
 */
import { Calcul, moisDe, type Periode } from './calcul';
import * as depot from './depot';

/** @param mois format AAAA-MM */
export async function bilan(db: D1Database, mois: string) {
  const [membres, absences, categories, depenses, faits] = await Promise.all([
    depot.membres(db, 'id'),
    depot.absences(db),
    depot.categories(db),
    depot.depensesDuMois(db, mois),
    depot.remboursementsDuMois(db, mois),
  ]);
  const ids = membres.map((m) => String(m.id));

  const parMembre: Record<string, Periode[]> = {};
  for (const a of absences) {
    (parMembre[a.membreId] ??= []).push({ debut: a.debut, fin: a.fin });
  }
  const calcul = new Calcul(ids, parMembre);
  const categorie = new Map(categories.map((c) => [c.id, c]));
  const [debut, fin] = moisDe(mois);

  const soldes = new Map(ids.map((id) => [id, 0]));
  const ajouter = (soldes: Map<string, number>, id: number | string, montant: number) =>
    soldes.set(String(id), (soldes.get(String(id)) ?? 0) + montant);

  const lignes = depenses.map((d) => {
    const cat = categorie.get(d.categorieId)!;
    const parts = calcul.parts({
      montant: d.montant,
      type: cat.type,
      date: d.date,
      poids: cat.poids,
      participants: d.participantIds.map(String),
    });
    ajouter(soldes, d.payeurId, d.montant);
    for (const [id, part] of parts) {
      ajouter(soldes, id, -part);
    }
    return { depense: d, type: cat.type, parts: Object.fromEntries(parts) };
  });

  const restants = new Map(soldes);
  for (const r of faits) {
    ajouter(restants, r.deId, r.montant);
    ajouter(restants, r.aId, -r.montant);
  }

  const total = (type: string) => lignes.reduce((s, l) => s + (l.type === type ? l.depense.montant : 0), 0);

  return {
    mois,
    membres: membres.map((m) => ({ id: m.id, nom: m.nom, joursPresence: calcul.joursPresence(String(m.id), debut, fin) })),
    joursDansLeMois: Number(fin.slice(8)),
    depenses: lignes,
    totaux: { fixe: total('fixe'), variable: total('variable') },
    soldes: Object.fromEntries(soldes),
    remboursements: faits,
    soldesRestants: Object.fromEntries(restants),
    virements: Calcul.remboursements(restants).map((v) => ({ deId: Number(v.de), aId: Number(v.a), montant: v.montant })),
  };
}
