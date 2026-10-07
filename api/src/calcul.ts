/**
 * Moteur de calcul des parts. Tous les montants sont en centimes (entiers).
 *
 * - Dépense "variable" : répartie au prorata des jours de présence de chacun
 *   sur la période couverte par la dépense (par défaut, le mois de la dépense).
 * - Dépense "fixe" : répartie selon des poids fixes (1 chacun par défaut),
 *   sans tenir compte des absences.
 *
 * Les membres sont identifiés par des chaînes ; l'ordre d'insertion des Map
 * est conservé, ce qui rend les arrondis et les virements déterministes.
 */

export type TypeCategorie = 'fixe' | 'variable';

/** Période d'absence, dates incluses (AAAA-MM-JJ). */
export interface Periode {
  debut: string;
  fin: string;
}

export interface DepenseCalcul {
  montant: number;
  type: TypeCategorie;
  /** Date de la dépense : la période est alors son mois. */
  date?: string;
  debut?: string;
  fin?: string;
  /** membre => poids, pour les catégories fixes (1 par défaut). */
  poids?: Record<string, number>;
  /** Vide ou absent = tous les membres. */
  participants?: string[];
}

export interface Virement {
  de: string;
  a: string;
  montant: number;
}

const JOUR = 86_400_000;

function jour(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export class Calcul {
  constructor(
    private readonly membres: string[],
    private readonly absences: Record<string, Periode[]> = {},
  ) {}

  /** Nombre de jours de présence d'un membre entre debut et fin inclus. */
  joursPresence(membre: string, debut: string, fin: string): number {
    const d = jour(debut);
    const f = jour(fin);
    const total = (f - d) / JOUR + 1;
    let absent = 0;
    for (const a of this.absences[membre] ?? []) {
      const ad = Math.max(d, jour(a.debut));
      const af = Math.min(f, jour(a.fin));
      if (ad <= af) {
        absent += (af - ad) / JOUR + 1;
      }
    }
    return Math.max(0, total - absent);
  }

  /** Parts de chacun pour une dépense : membre => centimes. */
  parts(depense: DepenseCalcul): Map<string, number> {
    const participants = depense.participants?.length ? depense.participants : this.membres;
    let poids = new Map<string, number>();
    if (depense.type === 'fixe') {
      for (const m of participants) {
        poids.set(m, depense.poids?.[m] ?? 1);
      }
    } else {
      const [debut, fin] = periode(depense);
      for (const m of participants) {
        poids.set(m, this.joursPresence(m, debut, fin));
      }
    }
    // Tout le monde absent (ou tous les poids à 0) : on retombe sur un partage égal.
    if (somme(poids.values()) === 0) {
      poids = new Map(participants.map((m) => [m, 1]));
    }
    return Calcul.repartir(depense.montant, poids);
  }

  /** Soldes : positif = on lui doit de l'argent, négatif = il doit. */
  soldes(depenses: (DepenseCalcul & { payeur: string })[]): Map<string, number> {
    const soldes = new Map(this.membres.map((m) => [m, 0]));
    for (const dep of depenses) {
      soldes.set(dep.payeur, (soldes.get(dep.payeur) ?? 0) + dep.montant);
      for (const [m, part] of this.parts(dep)) {
        soldes.set(m, (soldes.get(m) ?? 0) - part);
      }
    }
    return soldes;
  }

  /**
   * Bilan d'un mois (format "2026-11") : ne garde que les dépenses datées
   * dans ce mois, puis calcule soldes et remboursements.
   */
  bilanMensuel(depenses: (DepenseCalcul & { payeur: string })[], mois: string) {
    const duMois = depenses.filter((d) => (d.date ?? d.debut ?? '').startsWith(mois));
    const soldes = this.soldes(duMois);
    return { soldes, remboursements: Calcul.remboursements(soldes) };
  }

  /**
   * Remboursements proposés (algorithme glouton : le plus gros débiteur
   * paie le plus gros créancier), en un minimum de virements en pratique.
   */
  static remboursements(soldes: Map<string, number>): Virement[] {
    const crediteurs = [...soldes].filter(([, s]) => s > 0);
    const debiteurs = [...soldes].filter(([, s]) => s < 0).map(([m, s]): [string, number] => [m, -s]);
    const virements: Virement[] = [];
    while (crediteurs.length && debiteurs.length) {
      // Tri stable : à égalité, l'ordre des membres est conservé.
      crediteurs.sort((x, y) => y[1] - x[1]);
      debiteurs.sort((x, y) => y[1] - x[1]);
      const c = crediteurs[0];
      const d = debiteurs[0];
      const m = Math.min(c[1], d[1]);
      virements.push({ de: d[0], a: c[0], montant: m });
      c[1] -= m;
      d[1] -= m;
      if (c[1] === 0) crediteurs.shift();
      if (d[1] === 0) debiteurs.shift();
    }
    return virements;
  }

  /**
   * Répartit un montant selon des poids, arrondi au centime, sans perdre
   * de centime (méthode du plus fort reste).
   */
  static repartir(montant: number, poids: Map<string, number>): Map<string, number> {
    const total = somme(poids.values());
    const parts = new Map<string, number>();
    const restes: [string, number][] = [];
    for (const [m, p] of poids) {
      const exact = (montant * p) / total;
      parts.set(m, Math.floor(exact));
      restes.push([m, exact - Math.floor(exact)]);
    }
    restes.sort((x, y) => y[1] - x[1]);
    let manquant = montant - somme(parts.values());
    for (const [m] of restes) {
      if (manquant-- <= 0) break;
      parts.set(m, parts.get(m)! + 1);
    }
    return parts;
  }
}

function somme(valeurs: Iterable<number>): number {
  let total = 0;
  for (const v of valeurs) total += v;
  return total;
}

function periode(depense: DepenseCalcul): [string, string] {
  if (depense.debut && depense.fin) {
    return [depense.debut, depense.fin];
  }
  return moisDe(depense.date!.slice(0, 7));
}

/** Premier et dernier jour d'un mois AAAA-MM. */
export function moisDe(mois: string): [string, string] {
  const [annee, m] = mois.split('-').map(Number);
  const dernier = new Date(Date.UTC(annee, m, 0)).getUTCDate();
  return [`${mois}-01`, `${mois}-${String(dernier).padStart(2, '0')}`];
}
